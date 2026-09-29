import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Pool } from 'pg';
import { validateSyntheticContent, SYNTHETIC_V1_PROFILE, buildDocumentDerivatives,
  WriterLease, withWriterLease, stageCandidate, resolveRelease, DatabaseError } from '../../src/index.js';
import type { StageInput } from '../../src/index.js';
import { resolveDocument } from '../../src/db/documents.js';
import { realSource } from '../helpers.js';

const url = process.env['BANUCHAT_TEST_DATABASE_URL'];
if (!url) throw new Error('test:db requiere BANUCHAT_TEST_DATABASE_URL apuntando a una base vacía banuchat_rag_test.');

const hasCode = (code: string) => (error: unknown): boolean => error instanceof DatabaseError && error.code === code;

test('PostgreSQL disposable staging integration', async t => {
  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 5000 });
  t.after(async () => { await pool.end(); });
  pool.on('error', () => { /* Safe failure handled by the affected lease, never print credentials. */ });
  const admin = await pool.connect();
  try {
    const safety = await admin.query<{ name: string; namespace: string | null; tables: number }>(
      `SELECT current_database() AS name,to_regnamespace('banuchat')::text AS namespace,
       (SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
        AND c.relkind IN ('r','p','f','m')) AS tables`);
    const state = safety.rows[0];
    assert.ok(state && /(?:^|_)banuchat_rag_test(?:_|$)/.test(state.name)
      && state.namespace === null && state.tables === 0, 'Refusing migration: DB must be explicitly test-only and empty.');
    await admin.query(await readFile(new URL('../../../../infra/db/001_initial_schema.sql', import.meta.url), 'utf8'));
  } finally { admin.release(); }

  await t.test('migration: schema, vector and sixteen tables', async () => {
    const result = await pool.query(`SELECT (SELECT count(*)::integer FROM pg_tables WHERE schemaname='banuchat') AS tables,
      (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector,current_setting('server_version') AS postgres`);
    assert.equal(result.rows[0].tables, 16);
    assert.ok(result.rows[0].vector);
    t.diagnostic(JSON.stringify(result.rows[0]));
  });

  // Fixtures only. Neither revision is a real runtime digest nor an operational approval.
  const config = await pool.query<{ id: string; config_sha256: string }>(`INSERT INTO banuchat.embedding_configs
    (provider,model,model_revision,dimension,distance_metric,parameters)
    VALUES ($1,$2,$3,1024,'cosine',$4::jsonb) RETURNING id,config_sha256`,
  ['TEST_ONLY', 'TEST_ONLY', 'TEST_ONLY_FIXTURE', JSON.stringify({ query: {}, document: {}, runtime_version: 'TEST_ONLY' })]);
  assert.match(config.rows[0]!.config_sha256, /^[0-9a-f]{64}$/);
  const validated = await validateSyntheticContent({ syntheticRoot: realSource, profile: SYNTHETIC_V1_PROFILE });
  const derivatives = buildDocumentDerivatives(validated);
  const input: StageInput = { datasetId: 1, sourceGitRevision: 'af7ac711e1da3426e1f5fbe8b2892cec1344ce8b',
    embeddingConfigId: config.rows[0]!.id, workflowRef: 'TEST_ONLY_NO_N8N', validated, derivatives,
    pipelineConfig: { pipeline_version: 'TEST_ONLY', implementation_revision: 'b'.repeat(40),
      markdown_extraction: 'TEST_ONLY_v1', synthetic_banner: 'TEST_ONLY_exact', chunking: 'TEST_ONLY_h2',
      locator: 'TEST_ONLY_section', full_document: 'TEST_ONLY_artifact', encoding: 'UTF-8',
      normalization: 'TEST_ONLY_none', schema_validation: 'TEST_ONLY_local' } };
  const lease = await WriterLease.acquire(pool);
  let release = '', run = '';
  try {
    await t.test('second session writer lock conflicts', async () => {
      await assert.rejects(WriterLease.acquire(pool), hasCode('DATABASE_CONFLICT'));
    });
    await t.test('invalid source revision rejected before INSERT', async () => {
      await assert.rejects(stageCandidate(lease, { ...input, sourceGitRevision: 'HEAD' }), hasCode('DATABASE_INVARIANT'));
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.dataset_releases')).rows[0].n, 0);
    });
    await t.test('missing embedding config rejected', async () => {
      await assert.rejects(stageCandidate(lease, { ...input, embeddingConfigId: '00000000-0000-0000-0000-000000000000' }), hasCode('DATABASE_INVARIANT'));
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.datasets')).rows[0].n, 0);
    });
    await t.test('stage v1 and preserve all input objects/bytes', async () => {
      const before = structuredClone(input);
      const result = await stageCandidate(lease, input);
      assert.equal(result.outcome, 'staged');
      if (result.outcome !== 'staged') assert.fail('Expected staged result');
      release = result.release_id; run = result.run_id;
      assert.deepEqual(structuredClone(input), before);
    });
    await t.test('exact staging counts, run/items/versions states and provenance', async () => {
      const counts = await pool.query(`SELECT
        (SELECT count(*)::integer FROM banuchat.courses) AS courses,
        (SELECT count(*)::integer FROM banuchat.announcements) AS announcements,
        (SELECT count(*)::integer FROM banuchat.synthetic_profiles) AS profiles,
        (SELECT count(*)::integer FROM banuchat.calendar_events) AS events,
        (SELECT count(*)::integer FROM banuchat.profile_courses) AS profile_courses,
        (SELECT count(*)::integer FROM banuchat.documents) AS documents,
        (SELECT count(*)::integer FROM banuchat.document_versions) AS versions,
        (SELECT count(*)::integer FROM banuchat.document_chunks) AS chunks,
        (SELECT count(*)::integer FROM banuchat.ingestion_items) AS items`);
      assert.deepEqual(counts.rows[0], { courses: 12, announcements: 8, profiles: 4, events: 22, profile_courses: 18, documents: 12, versions: 12, chunks: 60, items: 76 });
      const states = await pool.query('SELECT status,count(*)::integer AS n FROM banuchat.ingestion_items GROUP BY status ORDER BY status');
      assert.deepEqual(states.rows, [{ status: 'pending', n: 10 }, { status: 'processed', n: 66 }]);
      const versions = await pool.query('SELECT processing_status,count(*)::integer AS n FROM banuchat.document_versions GROUP BY processing_status ORDER BY processing_status');
      assert.deepEqual(versions.rows, [{ processing_status: 'pending', n: 10 }, { processing_status: 'ready', n: 2 }]);
      assert.equal((await pool.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [release])).rows[0].status, 'staging');
      assert.deepEqual((await pool.query('SELECT status,finished_at,trigger_type,attempt_no FROM banuchat.ingestion_runs WHERE id=$1', [run])).rows[0], { status: 'running', finished_at: null, trigger_type: 'manual', attempt_no: 1 });
      const items = await pool.query('SELECT source_kind,record_key,source_path,source_locator,source_sha256,document_version_id,status,finished_at FROM banuchat.ingestion_items WHERE ingestion_run_id=$1', [run]);
      for (const item of validated.manifest.items) {
        const actual = items.rows.find(row => row.source_kind === item.kind && row.record_key === item.key)!;
        assert.equal(actual.source_path, item.path); assert.equal(actual.source_locator, item.locator); assert.equal(actual.source_sha256, item.sha256);
        assert.equal(actual.document_version_id !== null, item.kind === 'document');
        assert.equal(actual.finished_at === null, actual.status === 'pending');
      }
      t.diagnostic(JSON.stringify({ counts: counts.rows[0], items: states.rows, versions: versions.rows }));
    });
    await t.test('duplicate release identity resolves existing without DML', async () => {
      const result = await lease.transaction(() => resolveRelease(lease, input));
      assert.deepEqual(result, { release_id: release, outcome: 'staging' });
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.dataset_releases')).rows[0].n, 1);
    });
    await t.test('failed identity is reported without reopening', async () => {
      await lease.transaction(async () => {
        await lease.query('SAVEPOINT failed_fixture');
        const alternate = { ...input, pipelineConfig: { ...input.pipelineConfig, pipeline_version: 'TEST_ONLY_FAILED' } };
        const created = await resolveRelease(lease, alternate);
        await lease.query("UPDATE banuchat.dataset_releases SET status='failed' WHERE id=$1", [created.release_id]);
        assert.deepEqual(await resolveRelease(lease, alternate), { release_id: created.release_id, outcome: 'failed_requires_retry' });
        assert.equal((await lease.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [created.release_id])).rows[0]?.['status'], 'failed');
        await lease.query('ROLLBACK TO SAVEPOINT failed_fixture');
        await lease.query('RELEASE SAVEPOINT failed_fixture');
      });
    });
    await t.test('existing running attempt is not taken over or retried', async () => {
      await assert.rejects(stageCandidate(lease, input), hasCode('DATABASE_CONFLICT'));
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.ingestion_runs')).rows[0].n, 1);
    });
    await t.test('document mode mismatch rejected, global identity unchanged', async () => {
      const document = validated.catalogs.documents[0]!;
      await assert.rejects(lease.transaction(() => resolveDocument(lease, { ...document, retrieval_mode: 'full_document' })), hasCode('DATABASE_INVARIANT'));
      assert.equal((await pool.query('SELECT retrieval_mode FROM banuchat.documents WHERE document_key=$1', [document.document_key])).rows[0].retrieval_mode, 'chunked');
    });
    await t.test('60 PostgreSQL hashes match; all embeddings/provenance null; full documents have no chunks', async () => {
      const result = await pool.query(`SELECT d.document_key,c.ordinal,c.content,c.content_sha256,c.embedding,c.embedding_generated_at,c.generation_run_id
        FROM banuchat.document_chunks c JOIN banuchat.document_versions v ON v.id=c.document_version_id
        JOIN banuchat.documents d ON d.id=v.document_id`);
      assert.equal(result.rows.length, 60);
      for (const row of result.rows) {
        const chunk = derivatives.find(doc => doc.document_key === row.document_key)!.chunks[row.ordinal]!;
        assert.equal(row.content, chunk.content); assert.equal(row.content_sha256, chunk.content_sha256);
        assert.equal(row.embedding, null); assert.equal(row.embedding_generated_at, null); assert.equal(row.generation_run_id, null);
      }
      assert.equal((await pool.query(`SELECT count(*)::integer AS n FROM banuchat.document_chunks c
        JOIN banuchat.document_versions v ON v.id=c.document_version_id JOIN banuchat.documents d ON d.id=v.document_id
        WHERE d.retrieval_mode='full_document'`)).rows[0].n, 0);
    });
    await t.test('incomplete publication rejected inside SAVEPOINT; current and states intact', async () => {
      await lease.transaction(async () => {
        await lease.query('SAVEPOINT negative_publish');
        await assert.rejects(lease.query('SELECT banuchat.publish_release($1)', [release]), hasCode('DATABASE_INVARIANT'));
        await lease.query('ROLLBACK TO SAVEPOINT negative_publish');
        await lease.query('RELEASE SAVEPOINT negative_publish');
      });
      assert.equal((await pool.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id, null);
      assert.equal((await pool.query('SELECT status FROM banuchat.dataset_releases WHERE id=$1', [release])).rows[0].status, 'staging');
      assert.equal((await pool.query('SELECT status FROM banuchat.ingestion_runs WHERE id=$1', [run])).rows[0].status, 'running');
    });
  } finally { await lease.release(); }
  await t.test('writer lease released explicitly; another session can acquire', async () => {
    await withWriterLease(pool, async acquired => { assert.equal((await acquired.query('SELECT 1 AS n')).rows[0]?.['n'], 1); });
  });
  await t.test('lost dedicated connection invalidates lease; no transparent reconnection', async () => {
    const lost = await WriterLease.acquire(pool);
    try {
      const pid = (await lost.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      // Only this test's dedicated connection, not an arbitrary server backend.
      await pool.query('SELECT pg_terminate_backend($1)', [pid]);
      await assert.rejects(lost.query('SELECT 1'), hasCode('DATABASE_UNAVAILABLE'));
      await assert.rejects(lost.query('SELECT 1'), hasCode('DATABASE_UNAVAILABLE'));
    } finally { await lost.release(); }
    await withWriterLease(pool, async replacement => { await replacement.query('SELECT 1'); });
  });
});
