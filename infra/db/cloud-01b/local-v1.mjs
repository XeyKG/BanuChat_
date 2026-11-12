import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildDocumentDerivatives, SYNTHETIC_V1_PROFILE, validateSyntheticContent } from '../../../backend/rag/src/index.ts';

const requireRag = createRequire(new URL('../../../backend/rag/package.json', import.meta.url));
const pg = requireRag('pg');
const tables = {
  datasets: 1, embedding_configs: 1, dataset_releases: 1, documents: 12, ingestion_runs: 1,
  document_versions: 12, document_chunks: 60, courses: 12, announcements: 8, calendar_events: 22,
  synthetic_profiles: 4, profile_courses: 18, ingestion_items: 76,
};
const generated = {
  embedding_configs: ['config_sha256'], dataset_releases: ['manifest_sha256', 'pipeline_sha256'],
  document_chunks: ['content_sha256'],
};
let manifest, derivatives;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function validate(snapshot) {
  assert.deepEqual(Object.keys(snapshot).sort(), Object.keys(tables).sort());
  for (const [table, count] of Object.entries(tables)) assert.equal(snapshot[table].length, count);
  const [release] = snapshot.dataset_releases;
  const [config] = snapshot.embedding_configs;
  assert.deepEqual(release.manifest, manifest);
  assert.equal(release.status, 'ready');
  assert.equal(snapshot.datasets[0].name, 'banuchat-synthetic');
  assert.equal(config.provider, 'ollama');
  assert.equal(config.model, 'qwen3-embedding:0.6b');
  assert.equal(config.dimension, 1024);
  assert.equal(config.distance_metric, 'cosine');
  assert.equal(release.embedding_config_id, config.id);
  assert.equal(snapshot.ingestion_runs[0].status, 'succeeded');
  const documents = new Map(snapshot.documents.map(row => [row.id, row.document_key]));
  for (const row of snapshot.document_versions) {
    assert.equal(row.dataset_release_id, release.id);
    const expected = derivatives.get(documents.get(row.document_id));
    assert.equal(row.content_sha256, expected.content_sha256);
    assert.equal(row.source_sha256, expected.source_sha256);
    const chunks = snapshot.document_chunks.filter(chunk => chunk.document_version_id === row.id)
      .sort((a, b) => a.ordinal - b.ordinal);
    assert.deepEqual(chunks.map(({ ordinal, locator, content }) => ({ ordinal, locator, content })),
      expected.chunks.map(({ ordinal, locator, content }) => ({ ordinal, locator, content })));
  }
  for (const row of snapshot.document_chunks) {
    assert.equal(row.dataset_release_id, release.id);
    const vector = JSON.parse(row.embedding);
    assert.equal(vector.length, 1024);
    assert.ok(vector.every(Number.isFinite) && vector.some(value => value !== 0));
  }
}

async function exportV1(client, id) {
  const result = {};
  const scope = (await client.query(`SELECT (SELECT count(*) FROM banuchat.datasets)=1
    AND to_regnamespace('banuchat_aux') IS NULL
    AND to_regclass('banuchat.ccd_demo_contexts') IS NULL
    AND NOT EXISTS (SELECT 1 FROM banuchat.dataset_releases
      WHERE dataset_id<>1 OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb) AS safe`)).rows[0];
  assert.equal(scope.safe, true);
  const release = (await client.query(`SELECT r.* FROM banuchat.dataset_releases r
    JOIN banuchat.datasets d ON d.id=r.dataset_id
    WHERE r.id=$1 AND d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready'
    AND r.manifest=$2::jsonb`, [id, JSON.stringify(manifest)])).rows[0];
  assert.ok(release);
  await client.query('SELECT banuchat.assert_release_complete($1)', [id]);
  for (const table of Object.keys(tables)) {
    const filters = {
      datasets: ['id=$1', 1],
      embedding_configs: ['id=$1', release.embedding_config_id],
      dataset_releases: ['id=$1', id],
      documents: ['id IN (SELECT document_id FROM banuchat.document_versions WHERE dataset_release_id=$1)', id],
    };
    const [where, value] = filters[table] ?? ['dataset_release_id=$1', id];
    const rows = (await client.query(`SELECT to_jsonb(t) AS row FROM banuchat.${table} t
      WHERE ${where} ORDER BY to_jsonb(t)::text COLLATE "C"`, [value])).rows.map(record => record.row);
    for (const row of rows) for (const column of generated[table] ?? []) delete row[column];
    result[table] = rows;
  }
  result.datasets[0].current_release_id = null;
  return result;
}

async function restoreV1(client, snapshot) {
  const empty = (await client.query(`SELECT to_regnamespace('banuchat') IS NULL
    AND to_regnamespace('banuchat_auth') IS NULL AND to_regnamespace('banuchat_academic') IS NULL
    AND to_regnamespace('banuchat_aux') IS NULL AS safe`)).rows[0].safe;
  assert.equal(empty, true);
  // 001 has its own transaction and guards; seed writes are a separate transaction.
  await client.query(await readFile(new URL('../001_initial_schema.sql', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  const [release] = snapshot.dataset_releases;
  const [run] = snapshot.ingestion_runs;
  for (const table of Object.keys(tables)) {
    let rows = snapshot[table];
    if (table === 'dataset_releases') rows = [{ ...release, status: 'staging', validated_at: null }];
    if (table === 'ingestion_runs') rows = [{ ...run, status: 'running', finished_at: null }];
    const columns = Object.keys(rows[0]).map(pg.escapeIdentifier).join(',');
    await client.query(`INSERT INTO banuchat.${table}(${columns})
      SELECT ${columns} FROM jsonb_populate_recordset(NULL::banuchat.${table},$1::jsonb)`, [JSON.stringify(rows)]);
  }
  await client.query("UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=$1 WHERE id=$2", [run.finished_at,run.id]);
  await client.query('SELECT banuchat.publish_release($1)', [release.id]);
  await client.query('COMMIT');
}

const [mode, file, expected] = process.argv.slice(2);
let client;
try {
  assert.ok(['export', 'restore'].includes(mode) && file && expected);
  if (mode === 'export') assert.match(expected, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  else assert.match(expected, /^[0-9a-f]{64}$/);
  assert.equal(process.env.PGHOST, '127.0.0.1');
  const port = Number(process.env.PGPORT);
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  assert.ok(process.env.PGDATABASE && process.env.PGUSER);
  if (mode === 'restore') assert.equal(process.env.PGDATABASE, 'banuchat_cloud01a');
  const approved = await validateSyntheticContent({
    syntheticRoot: process.env.BANUCHAT_SYNTHETIC_ROOT ??
      fileURLToPath(new URL('../../../data/synthetic/', import.meta.url)),
    profile: SYNTHETIC_V1_PROFILE,
  });
  manifest = approved.manifest;
  derivatives = new Map(buildDocumentDerivatives(approved).map(row => [row.document_key, row]));
  client = new pg.Client({ host: '127.0.0.1', port, database: process.env.PGDATABASE,
    user: process.env.PGUSER, connectionTimeoutMillis: 5000 });
  await client.connect();
  assert.equal((await client.query('SELECT current_database() AS db')).rows[0].db, process.env.PGDATABASE);
  if (mode === 'export') {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot = await exportV1(client, expected);
    validate(snapshot);
    await client.query('ROLLBACK');
    const bytes = Buffer.from(JSON.stringify(snapshot) + '\n');
    await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode, sha256: sha(bytes), tables }));
  } else {
    const bytes = await readFile(file);
    assert.equal(sha(bytes), expected);
    const snapshot = JSON.parse(bytes);
    validate(snapshot);
    await restoreV1(client, snapshot);
    console.log(JSON.stringify({ mode, sha256: expected, tables }));
  }
} catch (error) {
  await client?.query('ROLLBACK').catch(() => {});
  console.error('CLOUD-01B.0 local v1 failed', error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client?.end();
}
