import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { DatabaseError, OllamaError, failureCode, failAttempt, recoverOrphanedAttempt,
  withWriterLease, validateSyntheticContent, buildDocumentDerivatives, buildPipelineConfigV1, prepareRetry } from '../src/index.js';
import type { WriterLease, StageInput, FailureCode } from '../src/index.js';
import { withAttemptFailure } from '../src/db/failure.js';
import { finishItem, openRun } from '../src/db/runs.js';
import { stageStructured } from '../src/db/structured.js';
import { stageDocuments } from '../src/db/documents.js';
import type { Catalogs, ManifestItem, DocumentDerivatives } from '../src/types.js';
import { realSource } from './helpers.js';

// SQL protocol doubles only: state/constraints are independently exercised in test:db.
function protocol(releaseStatus = 'staging', runStatus = 'running', exact = true) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.includes('pg_try_advisory_lock')) return { rowCount: 1, rows: [{ acquired: true }] };
    if (sql.includes('pg_advisory_unlock')) return { rowCount: 1, rows: [{ unlocked: true }] };
    if (sql.startsWith('SELECT name FROM banuchat.datasets')) return { rowCount: 1, rows: [{ name: 'banuchat-synthetic' }] };
    if (sql.includes('FROM banuchat.dataset_releases')) return { rowCount: 1, rows: [{ status: releaseStatus, exact }] };
    if (sql.includes("WHERE status='running' LIMIT")) return { rowCount: 0, rows: [] };
    if (sql.includes('FROM banuchat.ingestion_runs') && sql.startsWith('SELECT status')) return { rowCount: 1, rows: [{ status: runStatus }] };
    return { rowCount: 1, rows: [{ id: 'TEST_ONLY_RUN' }] };
  };
  const lease = { query, transaction: async <T>(work: () => Promise<T>) => work() } as unknown as WriterLease;
  const pool = { connect: async () => ({ query, on() {}, release() {} }) } as unknown as Pool;
  return { lease, pool, calls };
}

test('persistible error classification allowlists typed codes, not native messages or spoofed fields', () => {
  for (const code of ['DATABASE_UNAVAILABLE', 'DATABASE_CONFLICT', 'DATABASE_INVARIANT'] as const) {
    assert.equal(failureCode(new DatabaseError(code, { cause: new Error('secret SQL') })), code);
  }
  for (const code of ['OLLAMA_UNAVAILABLE', 'INVALID_EMBEDDING'] as const) assert.equal(failureCode(new OllamaError(code, 'response')), code);
  for (const error of [new Error('secret path'), { code: 'SQL secret' }, null, 'private']) assert.equal(failureCode(error), 'INGESTION_ABORTED');
});
test('failAttempt locks parents then closes pending only, run, release in that order', async () => {
  const { lease, calls } = protocol();
  await failAttempt(lease, 'release', 'run', 'OLLAMA_UNAVAILABLE');
  const writes = calls.filter(call => call.sql.startsWith('UPDATE'));
  assert.equal(writes.length, 3);
  assert.match(writes[0]!.sql, /ingestion_items.*status='failed'/s);
  assert.match(writes[0]!.sql, /AND status='pending'/);
  assert.match(writes[1]!.sql, /ingestion_runs/);
  assert.match(writes[2]!.sql, /dataset_releases/);
  assert.deepEqual(writes[0]!.values, ['release', 'run', 'OLLAMA_UNAVAILABLE']);
  assert.ok(calls[0]!.sql.includes('datasets'));
});
test('failAttempt rejects arbitrary persisted error codes before any query', async () => {
  const { lease, calls } = protocol();
  await assert.rejects(failAttempt(lease, 'release', 'run', 'private stack' as FailureCode), DatabaseError);
  assert.equal(calls.length, 0);
});
for (const status of ['succeeded', 'failed']) test(`terminal ${status} attempt is never rewritten`, async () => {
  const { lease, calls } = protocol('staging', status);
  await assert.rejects(failAttempt(lease, 'release', 'run', 'INGESTION_ABORTED'), { code: 'DATABASE_CONFLICT' });
  assert.equal(calls.some(call => call.sql.startsWith('UPDATE')), false);
});
test('explicit recovery acquires lease and uses ORPHANED_ATTEMPT without any age predicate', async () => {
  const { pool, calls } = protocol();
  await recoverOrphanedAttempt(pool, 'release', 'run');
  assert.match(calls[0]!.sql, /pg_try_advisory_lock/);
  assert.ok(calls.some(call => call.values.includes('ORPHANED_ATTEMPT')));
  assert.doesNotMatch(calls.map(call => call.sql).join('\n'), /started_before|started_at|interval|age\(/i);
});
test('failed cleanup never masks original error, including lost connection', async () => {
  const original = new OllamaError('OLLAMA_UNAVAILABLE', 'transport');
  const lease = { transaction: async () => { throw new DatabaseError('DATABASE_UNAVAILABLE'); } } as unknown as WriterLease;
  await assert.rejects(withAttemptFailure(lease, 'release', 'run', async () => { throw original; }), error => error === original);
});
test('lease release failure never masks original operation error', async () => {
  const original = new Error('TEST_ONLY');
  const pool = { connect: async () => ({ on() {}, release() { throw new Error('cleanup'); },
    query: async () => ({ rows: [{ acquired: true, unlocked: true }] }) }) } as unknown as Pool;
  await assert.rejects(withWriterLease(pool, async () => { throw original; }), error => error === original);
});
test('document cannot be skipped; structured reuse uses REUSED_EXACT', async () => {
  const { lease, calls } = protocol();
  const base = { key: 'key', path: 'path', locator: 'locator', sha256: 'a'.repeat(64) };
  await assert.rejects(finishItem(lease, 'run', { ...base, kind: 'document', retrieval_mode: 'chunked' }, 'skipped'), DatabaseError);
  await finishItem(lease, 'run', { ...base, kind: 'course' }, 'skipped');
  assert.deepEqual(calls[0]!.values.slice(-2), ['skipped', 'REUSED_EXACT']);
});
test('retry requires exact identity and failed status before any UPDATE', async () => {
  const validated = await validateSyntheticContent({ syntheticRoot: realSource });
  const input: StageInput = { validated, derivatives: buildDocumentDerivatives(validated), datasetId: 1,
    sourceGitRevision: 'a'.repeat(40), pipelineConfig: buildPipelineConfigV1('b'.repeat(40)),
    embeddingConfigId: '00000000-0000-0000-0000-000000000001', workflowRef: 'TEST_ONLY' };
  for (const [status, exact, code] of [['failed', false, 'DATABASE_INVARIANT'], ['ready', true, 'DATABASE_CONFLICT'], ['staging', true, 'DATABASE_CONFLICT']] as const) {
    const { lease, calls } = protocol(status, 'failed', exact);
    await assert.rejects(prepareRetry(lease, 'release', input), { code });
    assert.equal(calls.some(call => call.sql.startsWith('UPDATE')), false);
  }
});
test('openRun computes max plus one under locks and uses explicit retry trigger', async () => {
  const validated = await validateSyntheticContent({ syntheticRoot: realSource });
  const { lease, calls } = protocol();
  await openRun(lease, 'release', 'TEST_ONLY', validated.manifest.items, 'retry');
  const runInsert = calls.find(call => call.sql.startsWith('INSERT INTO banuchat.ingestion_runs'))!;
  assert.match(runInsert.sql, /coalesce\(max\(attempt_no\),0\)\+1/);
  assert.equal(runInsert.values[2], 'retry');
  assert.equal(calls.filter(call => call.sql.startsWith('INSERT INTO banuchat.ingestion_items')).length, 76);
});
for (const representation of ['absent', 'exact', 'different'] as const) test(`structured retry ${representation}: no silent updates`, async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const data: Catalogs = { documents: [], announcements: [], events: [], profiles: [], progress: [],
    courses: [{ course_key: 'course-001', name: 'TEST_ONLY', description: 'TEST_ONLY', status: 'available' }] };
  const item: ManifestItem = { kind: 'course', key: 'course-001', path: 'courses/courses.json', locator: '/courses/0', sha256: 'a'.repeat(64) };
  const lease = { transaction: async <T>(work: () => Promise<T>) => work(), query: async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT')) return { rows: representation === 'absent' ? [] : [{ exact: representation === 'exact' }] };
    return { rowCount: 1, rows: [] };
  } } as unknown as WriterLease;
  const operation = () => stageStructured(lease, 'release', 'run2', data, [item], true);
  if (representation === 'different') {
    await assert.rejects(operation(), { code: 'DATABASE_INVARIANT' });
    assert.equal(calls.length, 1);
  } else {
    await operation();
    assert.equal(calls.some(call => call.sql.startsWith('INSERT')), representation === 'absent');
    const finish = calls.find(call => call.sql.startsWith('UPDATE'))!;
    assert.match(finish.sql, /UPDATE banuchat.ingestion_items/);
    assert.equal(finish.values[3], representation === 'absent' ? 'processed' : 'skipped');
    assert.equal(calls.some(call => /UPDATE banuchat\.courses/.test(call.sql)), false);
    const expected = JSON.parse(calls[0]!.values[1] as string);
    assert.equal(expected.source_path, item.path); assert.equal(expected.source_locator, item.locator); assert.equal(expected.source_sha256, item.sha256);
    assert.equal(expected.description, data.courses[0]!.description);
  }
});
test('chunked retry replaces all six candidates, preserves version ID, never skips document', async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const lease = { transaction: async <T>(work: () => Promise<T>) => work(), query: async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT id,retrieval_mode')) return { rows: [{ id: 'document', retrieval_mode: 'chunked' }] };
    if (sql.startsWith('SELECT id,')) return { rows: [{ id: 'existing-version', exact: true }] };
    return { rowCount: 1, rows: [{ content_sha256: 'a'.repeat(64) }] };
  } } as unknown as WriterLease;
  const document = { document_key: 'doc-001', title: 'TEST_ONLY', version_label: 'v1', retrieval_mode: 'chunked' as const,
    mime_type: 'text/markdown' as const, artifact_path: 'documents/artifacts/doc-001.md' };
  const derived: DocumentDerivatives = { document_key: document.document_key, retrieval_mode: 'chunked', source_sha256: 'a'.repeat(64),
    content_sha256: 'a'.repeat(64), chunks: Array.from({ length: 6 }, (_, ordinal) => ({ ordinal, content: 'TEST_ONLY',
      content_sha256: 'a'.repeat(64), locator: `section:${ordinal}`, page_start: null, page_end: null })) };
  const item: ManifestItem = { kind: 'document', key: document.document_key, path: document.artifact_path,
    locator: 'document', sha256: 'a'.repeat(64), retrieval_mode: 'chunked' };
  await stageDocuments(lease, 'release', 'run2', [document], [derived], [item], true);
  assert.equal(calls.filter(call => call.sql.startsWith('DELETE FROM banuchat.document_chunks')).length, 1);
  assert.equal(calls.some(call => call.sql.startsWith('DELETE FROM banuchat.document_versions')), false);
  const inserts = calls.filter(call => call.sql.startsWith('INSERT INTO banuchat.document_chunks'));
  assert.equal(inserts.length, 6);
  assert.ok(inserts.every(call => call.values[1] === 'existing-version' && call.sql.includes('NULL,NULL,NULL,NULL,NULL')));
  const version = calls.find(call => call.sql.startsWith('UPDATE banuchat.document_versions'))!;
  assert.deepEqual(version.values, ['release', 'existing-version', 'run2', 'pending']);
  assert.equal(calls.some(call => call.values.includes('skipped')), false);
  await assert.rejects(stageDocuments(lease, 'release', 'run2', [document], [{ ...derived, chunks: derived.chunks.slice(0, 4) }], [item], true), DatabaseError);
});
