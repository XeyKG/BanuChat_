import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Pool } from 'pg';
import { OllamaClient, validateSyntheticContent, SYNTHETIC_V1_PROFILE, buildDocumentDerivatives,
  ingestApprovedCandidate } from '../../src/index.js';
import { realSource } from '../helpers.js';

const databaseUrl = process.env['BANUCHAT_TEST_DATABASE_URL'];
const ollamaUrl = process.env['OLLAMA_BASE_URL'];
if (!databaseUrl || !ollamaUrl) throw new Error('E2E requiere BANUCHAT_TEST_DATABASE_URL (base vacía test) y OLLAMA_BASE_URL (local con qwen3-embedding:0.6b).');

test('real Ollama + disposable PostgreSQL ingestion', async t => {
  const client = new OllamaClient(ollamaUrl);
  t.diagnostic('Precondición obligatoria: Ollama local con qwen3-embedding:0.6b; ausencia implica BLOCKED/FAIL, nunca SKIP.');
  // Fail explicitly BEFORE DB migration/configuration if the approved local model is missing.
  const observed = await client.inspect();
  const pool = new Pool({ connectionString: databaseUrl, max: 3, connectionTimeoutMillis: 5000 });
  t.after(async () => { await pool.end(); });
  const admin = await pool.connect();
  try {
    const row = (await admin.query(`SELECT current_database() AS name,to_regnamespace('banuchat') AS namespace,
      (SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
      AND c.relkind IN ('r','p','f','m')) AS tables`)).rows[0];
    assert.ok(/(?:^|_)banuchat_rag_test(?:_|$)/.test(row.name) && row.namespace === null && row.tables === 0,
      'Refusing migration: E2E DB must be test-only and empty');
    await admin.query(await readFile(new URL('../../../../infra/db/001_initial_schema.sql', import.meta.url), 'utf8'));
  } finally { admin.release(); }
  const validated = await validateSyntheticContent({ syntheticRoot: realSource, profile: SYNTHETIC_V1_PROFILE });
  const input = { validated, derivatives: buildDocumentDerivatives(validated),
    sourceGitRevision: 'af7ac711e1da3426e1f5fbe8b2892cec1344ce8b',
    // Deliberately synthetic test provenance, NOT a claim about deployed build identity.
    implementationRevision: 'b'.repeat(40), workflowRef: 'TEST_ONLY_E2E_NO_N8N', batchSize: 10 };
  const result = await ingestApprovedCandidate(pool, client, input);
  assert.equal(result.outcome, 'published');
  if (result.outcome !== 'published') assert.fail('Expected new publication');
  await t.test('published configuration equals observed runtime/digest, no TEST_ONLY', async () => {
    const row = (await pool.query(`SELECT e.provider,e.model,e.model_revision,e.dimension,e.distance_metric,e.parameters
      FROM banuchat.embedding_configs e JOIN banuchat.dataset_releases r ON r.embedding_config_id=e.id WHERE r.id=$1`, [result.release_id])).rows[0];
    assert.deepEqual(row, observed);
    assert.equal(JSON.stringify(row).includes('TEST_ONLY'), false);
  });
  await t.test('76 processed, 12 ready versions, 60 real vectors, succeeded/ready/current', async () => {
    const counts = (await pool.query(`SELECT
      (SELECT count(*)::integer FROM banuchat.ingestion_items WHERE status='processed') AS processed,
      (SELECT count(*)::integer FROM banuchat.ingestion_items WHERE status<>'processed') AS other_items,
      (SELECT count(*)::integer FROM banuchat.document_versions WHERE processing_status='ready') AS ready_versions,
      (SELECT count(*)::integer FROM banuchat.document_chunks) AS chunks,
      (SELECT count(*)::integer FROM banuchat.document_chunks WHERE embedding IS NOT NULL
        AND generation_run_id=$1 AND public.vector_dims(embedding)=1024) AS embeddings`, [result.run_id])).rows[0];
    assert.deepEqual(counts, { processed: 76, other_items: 0, ready_versions: 12, chunks: 60, embeddings: 60 });
    const state = (await pool.query(`SELECT r.status,r.validated_at,d.current_release_id,i.status AS run_status,i.finished_at
      FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id
      JOIN banuchat.ingestion_runs i ON i.dataset_release_id=r.id WHERE r.id=$1`, [result.release_id])).rows[0];
    assert.equal(state.status, 'ready'); assert.ok(state.validated_at); assert.ok(state.finished_at);
    assert.equal(state.current_release_id, result.release_id); assert.equal(state.run_status, 'succeeded');
    await pool.query('SELECT banuchat.assert_release_complete($1)', [result.release_id]);
    t.diagnostic(JSON.stringify({ counts, runtime: observed.parameters.runtime_version, digest: observed.model_revision,
      embed_calls: client.embedRequestCount, max_batch_size: 10, actual_batch_size: 6 }));
  });
  await t.test('same identity returns already_current without new run/release/embedding call', async () => {
    const calls = client.embedRequestCount;
    const again = await ingestApprovedCandidate(pool, client, input);
    assert.equal(again.outcome, 'already_current'); assert.equal(again.release_id, result.release_id);
    assert.equal(client.embedRequestCount, calls);
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.dataset_releases')).rows[0].n, 1);
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM banuchat.ingestion_runs')).rows[0].n, 1);
  });
  await t.test('technical exact cosine self-distance smoke test', async () => {
    const sample = (await pool.query('SELECT id,embedding::text AS vector FROM banuchat.document_chunks ORDER BY id LIMIT 1')).rows[0];
    const row = (await pool.query(`SELECT c.embedding OPERATOR(public.<=>) $1::public.vector(1024) AS distance
      FROM banuchat.document_chunks c JOIN banuchat.datasets d ON d.current_release_id=c.dataset_release_id
      WHERE c.id=$2`, [sample.vector, sample.id])).rows[0];
    assert.ok(Math.abs(row.distance) < 1e-5);
  });
});
