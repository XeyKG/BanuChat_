import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import type { Pool, QueryResultRow } from 'pg';
import { WriterLease, withWriterLease, ingestApprovedCandidate, retryFailedCandidate, recoverOrphanedAttempt,
  failAttempt, prepareRetry, stageCandidate, buildPipelineConfigV1, OllamaError, DatabaseError } from '../../src/index.js';
import type { StageInput, IngestInput, EmbeddingClient, EmbeddingConfig } from '../../src/index.js';
import { effectiveConfig } from '../../src/ollama/config.js';

/** TEST_ONLY PostgreSQL scenarios; vectors are not Qwen output and do not replace Impl 3 E2E. */
export async function recoveryScenarios(t: TestContext, pool: Pool, base: StageInput, config: EmbeddingConfig): Promise<void> {
  const code = (value: string) => (error: unknown) => error instanceof DatabaseError && error.code === value;
  const input: IngestInput = { validated: base.validated, derivatives: base.derivatives,
    sourceGitRevision: base.sourceGitRevision, implementationRevision: 'd'.repeat(40), workflowRef: 'TEST_ONLY_RECOVERY', batchSize: 4 };
  const current = async () => (await pool.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id as string;
  const previousCurrent = await current();
  const counts = async (run: string) => (await pool.query(`SELECT
    count(*)::integer AS total,count(*) FILTER (WHERE status='processed')::integer AS processed,
    count(*) FILTER (WHERE status='skipped')::integer AS skipped,count(*) FILTER (WHERE status='failed')::integer AS failed,
    count(*) FILTER (WHERE status='pending')::integer AS pending FROM banuchat.ingestion_items WHERE ingestion_run_id=$1`, [run])).rows[0];
  const history = async (run: string) => (await pool.query(`SELECT to_jsonb(i) AS item FROM banuchat.ingestion_items i
    WHERE ingestion_run_id=$1 ORDER BY source_kind,record_key`, [run])).rows;
  const vectors = (texts: readonly string[], marker: number) => texts.map(() => [marker, ...Array<number>(1023).fill(0)]);
  const good: EmbeddingClient = { inspect: async () => config, embed: async texts => vectors(texts, 2) };
  let release = '', firstRun = '';
  let previousItems: unknown;
  let oldChunkIds: string[] = [];
  let oldVersionIds: string[] = [];
  let firstRunSnapshot: unknown;
  let releaseIdentity: unknown;
  let firstCalls = 0;

  await t.test('R1 controlled Ollama failure after one complete document and 4/6 of another', async () => {
    const failure = new OllamaError('OLLAMA_UNAVAILABLE', 'response');
    const broken: EmbeddingClient = { inspect: async () => config, embed: async texts => {
      if (++firstCalls === 4) throw failure;
      return vectors(texts, 1);
    } };
    await assert.rejects(ingestApprovedCandidate(pool, broken, input), error => error === failure);
    const row = (await pool.query(`SELECT r.id,i.id AS run,r.status,i.status AS run_status,i.error_code
      FROM banuchat.dataset_releases r JOIN banuchat.ingestion_runs i ON i.dataset_release_id=r.id
      WHERE r.pipeline_config->>'implementation_revision'=$1`, [input.implementationRevision])).rows[0];
    release = row.id; firstRun = row.run;
    assert.equal(row.status, 'failed'); assert.equal(row.run_status, 'failed'); assert.equal(row.error_code, 'OLLAMA_UNAVAILABLE');
    assert.deepEqual(await counts(firstRun), { total: 76, processed: 67, skipped: 0, failed: 9, pending: 0 });
    const partial = (await pool.query(`SELECT count(embedding)::integer AS n FROM banuchat.document_chunks
      WHERE dataset_release_id=$1 GROUP BY document_version_id ORDER BY n`, [release])).rows.map(row => row.n);
    assert.deepEqual(partial, [0, 0, 0, 0, 0, 0, 0, 0, 4, 6]);
    assert.equal(await current(), previousCurrent);
    previousItems = await history(firstRun);
    firstRunSnapshot = (await pool.query('SELECT to_jsonb(i) AS run FROM banuchat.ingestion_runs i WHERE id=$1', [firstRun])).rows[0];
    releaseIdentity = (await pool.query(`SELECT git_revision,manifest,pipeline_config,embedding_config_id,imported_at::text
      FROM banuchat.dataset_releases WHERE id=$1`, [release])).rows[0];
    oldChunkIds = (await pool.query('SELECT id FROM banuchat.document_chunks WHERE dataset_release_id=$1', [release])).rows.map(row => row.id);
    oldVersionIds = (await pool.query('SELECT id FROM banuchat.document_versions WHERE dataset_release_id=$1 ORDER BY id', [release])).rows.map(row => row.id);
    t.diagnostic(JSON.stringify({ scenario: 'R1', release, run: firstRun, counts: await counts(firstRun), fixture_vectors: 10, partial_document: '4/6', current_unchanged: true }));
  });
  await t.test('R4 different implementation/source/manifest/digest/runtime/options reject retry before reopen', async () => {
    await assert.rejects(retryFailedCandidate(pool, good, release, { ...input, implementationRevision: 'e'.repeat(40) }), code('DATABASE_INVARIANT'));
    await assert.rejects(retryFailedCandidate(pool, good, release, { ...input, sourceGitRevision: 'e'.repeat(40) }), code('DATABASE_INVARIANT'));
    const altered = structuredClone(input.validated); altered.manifest.timezone = 'TEST_ONLY_DIFFERENT';
    await assert.rejects(retryFailedCandidate(pool, good, release, { ...input, validated: altered }), code('DATABASE_INVARIANT'));
    for (const different of [effectiveConfig('0.0.0-TEST-ONLY', 'f'.repeat(64), 2048),
      effectiveConfig('0.0.1-TEST-ONLY', config.model_revision, 2048), effectiveConfig(config.parameters.runtime_version, config.model_revision, 4096)]) {
      await assert.rejects(retryFailedCandidate(pool, { ...good, inspect: async () => different }, release, input), code('DATABASE_INVARIANT'));
    }
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.ingestion_runs WHERE dataset_release_id=$1', [release])).rows[0].n, 1);
    assert.equal((await pool.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [release])).rows[0].status, 'failed');
  });
  let secondRun = '', retryCalls = 0;
  await t.test('R2 retry starts attempt 2 with exact structured reuse and rebuilt empty document chunks', async () => {
    const checked: EmbeddingClient = { inspect: async () => config, embed: async texts => {
      if (retryCalls++ === 0) {
        const run = (await pool.query('SELECT id,attempt_no,trigger_type,status FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 ORDER BY attempt_no DESC LIMIT 1', [release])).rows[0];
        secondRun = run.id;
        assert.equal(run.attempt_no, 2); assert.equal(run.trigger_type, 'retry'); assert.equal(run.status, 'running');
        assert.deepEqual(await counts(secondRun), { total: 76, processed: 2, skipped: 64, failed: 0, pending: 10 });
        assert.equal((await pool.query("SELECT count(*)::integer AS n FROM banuchat.ingestion_items WHERE ingestion_run_id=$1 AND status='skipped' AND result_code='REUSED_EXACT' AND source_kind<>'document'", [secondRun])).rows[0].n, 64);
        const chunks = (await pool.query('SELECT id,embedding,generation_run_id,embedding_generated_at FROM banuchat.document_chunks WHERE dataset_release_id=$1', [release])).rows;
        assert.equal(chunks.length, 60);
        for (const chunk of chunks) { assert.equal(oldChunkIds.includes(chunk.id), false); assert.equal(chunk.embedding, null); assert.equal(chunk.generation_run_id, null); assert.equal(chunk.embedding_generated_at, null); }
        const versions = (await pool.query('SELECT id,ingestion_run_id FROM banuchat.document_versions WHERE dataset_release_id=$1 ORDER BY id', [release])).rows;
        assert.deepEqual(versions.map(row => row.id), oldVersionIds);
        assert.ok(versions.every(row => row.ingestion_run_id === secondRun));
        await assert.rejects(WriterLease.acquire(pool), code('DATABASE_CONFLICT'));
      }
      return vectors(texts, 2);
    } };
    const result = await retryFailedCandidate(pool, checked, release, input);
    assert.equal(result.run_id, secondRun); assert.equal(result.embeddings, 60); assert.equal(retryCalls, 20);
    assert.deepEqual(await counts(secondRun), { total: 76, processed: 12, skipped: 64, failed: 0, pending: 0 });
    const final = (await pool.query(`SELECT count(*)::integer AS n,count(*) FILTER (WHERE generation_run_id=$2 AND embedding IS NOT NULL
      AND embedding_generated_at >= (SELECT started_at FROM banuchat.ingestion_runs WHERE id=$2))::integer AS valid
      FROM banuchat.document_chunks WHERE dataset_release_id=$1`, [release, secondRun])).rows[0];
    assert.deepEqual(final, { n: 60, valid: 60 });
    await pool.query('SELECT banuchat.assert_release_complete($1)', [release]);
    assert.equal(await current(), release);
    assert.equal((await pool.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [release])).rows[0].status, 'ready');
    assert.deepEqual((await pool.query(`SELECT git_revision,manifest,pipeline_config,embedding_config_id,imported_at::text
      FROM banuchat.dataset_releases WHERE id=$1`, [release])).rows[0], releaseIdentity);
    t.diagnostic(JSON.stringify({ scenario: 'R2', release, run: secondRun, counts: await counts(secondRun), fixture_vectors: 60, assert_release_complete: 'PASS' }));
  });
  await t.test('R3 historical runs/items immutable, attempts 1 failed / 2 succeeded, no old vectors survive', async () => {
    assert.deepEqual(await history(firstRun), previousItems);
    assert.deepEqual((await pool.query('SELECT to_jsonb(i) AS run FROM banuchat.ingestion_runs i WHERE id=$1', [firstRun])).rows[0], firstRunSnapshot);
    assert.deepEqual((await pool.query('SELECT attempt_no,status FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 ORDER BY attempt_no', [release])).rows,
      [{ attempt_no: 1, status: 'failed' }, { attempt_no: 2, status: 'succeeded' }]);
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.ingestion_items WHERE dataset_release_id=$1', [release])).rows[0].n, 152);
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.document_chunks WHERE generation_run_id=$1', [firstRun])).rows[0].n, 0);
    await assert.rejects(retryFailedCandidate(pool, good, release, input), code('DATABASE_CONFLICT'));
    await assert.rejects(recoverOrphanedAttempt(pool, release, firstRun), code('DATABASE_CONFLICT'));
  });
  await t.test('R6 partial 4/6 becomes six new run2 vectors; full_document stays ready without chunks', async () => {
    const documents = (await pool.query(`SELECT d.retrieval_mode,v.processing_status,v.ingestion_run_id,
      count(c.id)::integer AS chunks,count(c.embedding)::integer AS vectors,
      count(c.id) FILTER (WHERE c.generation_run_id=$2)::integer AS from_run2
      FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id=v.document_id
      LEFT JOIN banuchat.document_chunks c ON c.document_version_id=v.id
      WHERE v.dataset_release_id=$1 GROUP BY v.id,d.retrieval_mode`, [release, secondRun])).rows;
    assert.equal(documents.length, 12);
    for (const doc of documents) {
      assert.equal(doc.processing_status, 'ready'); assert.equal(doc.ingestion_run_id, secondRun);
      const n = doc.retrieval_mode === 'chunked' ? 6 : 0;
      assert.equal(doc.chunks, n); assert.equal(doc.vectors, n); assert.equal(doc.from_run2, n);
    }
    assert.equal(documents.filter(doc => doc.retrieval_mode === 'full_document').length, 2);
  });

  await t.test('R5 lost connection leaves staging/running; explicit recovery closes it without age or takeover', async () => {
    const orphanInput = { ...base, pipelineConfig: buildPipelineConfigV1('e'.repeat(40)) };
    const lease = await WriterLease.acquire(pool);
    let orphanRelease = '', orphanRun = '';
    try {
      const staged = await stageCandidate(lease, orphanInput); assert.equal(staged.outcome, 'staged');
      if (staged.outcome !== 'staged') assert.fail();
      orphanRelease = staged.release_id; orphanRun = staged.run_id;
      await assert.rejects(recoverOrphanedAttempt(pool, orphanRelease, orphanRun), code('DATABASE_CONFLICT'));
      const pid = (await lease.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      await pool.query('SELECT pg_terminate_backend($1)', [pid]);
      await assert.rejects(failAttempt(lease, orphanRelease, orphanRun, 'DATABASE_UNAVAILABLE'), code('DATABASE_UNAVAILABLE'));
    } finally { await lease.release(); }
    assert.equal((await pool.query('SELECT status FROM banuchat.ingestion_runs WHERE id=$1', [orphanRun])).rows[0].status, 'running');
    await assert.rejects(recoverOrphanedAttempt(pool, orphanRelease, secondRun), code('DATABASE_INVARIANT'));
    await recoverOrphanedAttempt(pool, orphanRelease, orphanRun);
    const row = (await pool.query('SELECT status,error_code FROM banuchat.ingestion_runs WHERE id=$1', [orphanRun])).rows[0];
    assert.deepEqual(row, { status: 'failed', error_code: 'ORPHANED_ATTEMPT' });
    assert.deepEqual(await counts(orphanRun), { total: 76, processed: 66, skipped: 0, failed: 10, pending: 0 });
    await assert.rejects(recoverOrphanedAttempt(pool, orphanRelease, orphanRun), code('DATABASE_CONFLICT'));
    assert.equal(await current(), release);
  });

  await t.test('failure inside staging closes its already-created attempt; retry inserts missing structured rows', async () => {
    const partialInput = { ...input, implementationRevision: 'f'.repeat(40) };
    const original = WriterLease.prototype.query;
    let inserts = 0;
    WriterLease.prototype.query = async function <R extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]) {
      if (sql.startsWith('INSERT INTO banuchat.courses') && ++inserts === 5) throw new DatabaseError('DATABASE_INVARIANT');
      return original.bind(this)<R>(sql, values);
    };
    try { await assert.rejects(ingestApprovedCandidate(pool, good, partialInput), code('DATABASE_INVARIANT')); }
    finally { WriterLease.prototype.query = original; }
    const row = (await pool.query(`SELECT r.id,i.id AS run FROM banuchat.dataset_releases r JOIN banuchat.ingestion_runs i
      ON i.dataset_release_id=r.id WHERE r.pipeline_config->>'implementation_revision'=$1`, [partialInput.implementationRevision])).rows[0];
    assert.deepEqual(await counts(row.run), { total: 76, processed: 4, skipped: 0, failed: 72, pending: 0 });
    const result = await retryFailedCandidate(pool, good, row.id, partialInput);
    assert.deepEqual(await counts(result.run_id), { total: 76, processed: 72, skipped: 4, failed: 0, pending: 0 });
    await pool.query('SELECT banuchat.assert_release_complete($1)', [row.id]);
  });

  // Each corruption is isolated to a new TEST_ONLY candidate, never the source files/current.
  const corruptions = [
    "UPDATE banuchat.courses SET name='TEST_ONLY_DIFFERENT' WHERE dataset_release_id=$1",
    "UPDATE banuchat.announcements SET valid_from=valid_from-interval '1 second' WHERE dataset_release_id=$1",
    "UPDATE banuchat.synthetic_profiles SET alias='TEST_ONLY_DIFFERENT' WHERE dataset_release_id=$1",
    "UPDATE banuchat.calendar_events SET starts_at=starts_at-interval '1 second' WHERE dataset_release_id=$1",
    'UPDATE banuchat.profile_courses SET started_at=NULL WHERE dataset_release_id=$1',
    "UPDATE banuchat.courses SET source_locator='/TEST_ONLY' WHERE dataset_release_id=$1",
    "UPDATE banuchat.document_versions SET title='TEST_ONLY_DIFFERENT' WHERE dataset_release_id=$1",
  ];
  for (const [index, sql] of corruptions.entries()) await t.test(`mismatch ${index + 1}: existing representation rejected, never silently repaired`, async () => {
    const revision = String(index + 1).repeat(40);
    let candidate = '';
    const before = await current();
    await withWriterLease(pool, async lease => {
      const staged = await stageCandidate(lease, { ...base, pipelineConfig: buildPipelineConfigV1(revision) });
      if (staged.outcome !== 'staged') assert.fail();
      candidate = staged.release_id;
      await lease.transaction(async () => { await lease.query(sql, [candidate]); });
      await failAttempt(lease, candidate, staged.run_id, 'INGESTION_ABORTED');
    });
    await assert.rejects(retryFailedCandidate(pool, good, candidate, { ...input, implementationRevision: revision }), code('DATABASE_INVARIANT'));
    assert.deepEqual((await pool.query('SELECT attempt_no,status FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 ORDER BY attempt_no', [candidate])).rows,
      [{ attempt_no: 1, status: 'failed' }, { attempt_no: 2, status: 'failed' }]);
    assert.equal((await pool.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [candidate])).rows[0].status, 'failed');
    assert.equal(await current(), before);
  });
  await t.test('prepareRetry rejects ready and unchanged identity is not sufficient to reopen it', async () => {
    await withWriterLease(pool, async lease => {
      await assert.rejects(prepareRetry(lease, release, { ...base, pipelineConfig: buildPipelineConfigV1(input.implementationRevision) }), code('DATABASE_CONFLICT'));
    });
  });
  await t.test('controlled final publication error rolls back then closes run/release without masking original', async () => {
    const finalInput = { ...input, implementationRevision: '9'.repeat(40) };
    const original = WriterLease.prototype.query;
    const failure = new DatabaseError('DATABASE_INVARIANT');
    const before = await current();
    WriterLease.prototype.query = async function <R extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]) {
      if (sql === 'SELECT banuchat.publish_release($1)') throw failure;
      return original.bind(this)<R>(sql, values);
    };
    try { await assert.rejects(ingestApprovedCandidate(pool, good, finalInput), error => error === failure); }
    finally { WriterLease.prototype.query = original; }
    const row = (await pool.query(`SELECT r.status,i.id,i.status AS run_status,i.error_code FROM banuchat.dataset_releases r
      JOIN banuchat.ingestion_runs i ON i.dataset_release_id=r.id WHERE r.pipeline_config->>'implementation_revision'=$1`, [finalInput.implementationRevision])).rows[0];
    assert.equal(row.status, 'failed'); assert.equal(row.run_status, 'failed'); assert.equal(row.error_code, 'DATABASE_INVARIANT');
    assert.deepEqual(await counts(row.id), { total: 76, processed: 76, skipped: 0, failed: 0, pending: 0 });
    assert.equal(await current(), before);
  });
}
