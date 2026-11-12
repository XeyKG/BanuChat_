// Explicit integration entry point for the independent CLOUD-01B.2 laboratories.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PgAuthStore } from '../src/auth/pg-auth-store.js';
import { createAuthenticatedDocumentRag, createAuthenticatedRuntimeServer } from '../src/authenticated-runtime.js';
import { PgSqlClient } from '../src/data/pg-client.js';
import { loadGeneratorRuntimeConfig } from '../src/generation/generator-client.js';
import { OllamaGeneratorClient } from '../src/generation/ollama-generator-client.js';
import { OllamaQueryEmbeddingClient } from '../src/retrieval/ollama-query-embedding-client.js';

const stage = process.argv[2];
assert.ok(stage === 'source' || stage === 'restore');
const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error('Missing lab configuration');
  return value;
};
const port = Number(process.env.BANUCHAT_B2_PORT ?? (stage === 'source' ? 55477 : 55478));
assert.ok(Number.isInteger(port) && port > 1024 && port <= 65535);
const options = { database: 'postgres', host: '127.0.0.1', port, connectionTimeoutMillis: 4000 };
const admin = new Pool({ ...options, user: 'postgres', password: required('BANUCHAT_B2_ADMIN') });
const runtime = new Pool({ ...options, user: 'cloud_runtime', password: required('BANUCHAT_B2_RUNTIME') });
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const evidence = required('BANUCHAT_B2_EVIDENCE');
let server: Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>> | undefined;
try {
  const scope = await admin.query("SELECT current_setting('banuchat_lab.cloud01b2',true) AS marker");
  assert.equal(scope.rows[0].marker, 'independent');
  const store = new PgAuthStore(runtime);
  const managed = () => store.assertRuntime('postgres', 'synthetic', false, 'managed');
  await managed();
  await assert.rejects(store.assertRuntime('postgres'), { code: 'DEPENDENCY_UNAVAILABLE' });
  await assert.rejects(store.assertRuntime('postgres', 'ccd_local', false, 'managed'), { code: 'DEPENDENCY_UNAVAILABLE' });
  await assert.rejects(new PgAuthStore(admin).assertRuntime('postgres', 'synthetic', false, 'managed'), { code: 'DEPENDENCY_UNAVAILABLE' });

  if (stage === 'source') {
    await admin.query('CREATE ROLE cloud01b2_membership_probe NOLOGIN');
    for (const [grant, revoke] of [
      ['ALTER ROLE cloud_runtime SUPERUSER', 'ALTER ROLE cloud_runtime NOSUPERUSER'],
      ['ALTER ROLE cloud_runtime BYPASSRLS', 'ALTER ROLE cloud_runtime NOBYPASSRLS'],
      ['ALTER ROLE cloud_runtime CREATEROLE', 'ALTER ROLE cloud_runtime NOCREATEROLE'],
      ['ALTER ROLE cloud_runtime CREATEDB', 'ALTER ROLE cloud_runtime NOCREATEDB'],
      ['GRANT cloud01b2_membership_probe TO cloud_runtime', 'REVOKE cloud01b2_membership_probe FROM cloud_runtime'],
      ['GRANT TEMP ON DATABASE postgres TO cloud_runtime', 'REVOKE TEMP ON DATABASE postgres FROM cloud_runtime'],
      ['GRANT CONNECT ON DATABASE template1 TO cloud_runtime', 'REVOKE CONNECT ON DATABASE template1 FROM cloud_runtime'],
      ['GRANT TEMP ON DATABASE template1 TO cloud_runtime', 'REVOKE TEMP ON DATABASE template1 FROM cloud_runtime'],
      ['ALTER DATABASE template0 ALLOW_CONNECTIONS true', 'ALTER DATABASE template0 ALLOW_CONNECTIONS false'],
      ['GRANT INSERT ON banuchat.document_chunks TO cloud_runtime', 'REVOKE INSERT ON banuchat.document_chunks FROM cloud_runtime'],
      ['GRANT SELECT (profile_key) ON banuchat_academic.students TO cloud_runtime', 'REVOKE SELECT (profile_key) ON banuchat_academic.students FROM cloud_runtime'],
      ['GRANT CREATE ON SCHEMA public TO cloud_runtime', 'REVOKE CREATE ON SCHEMA public FROM cloud_runtime'],
    ] as const) {
      await admin.query(grant);
      try { await assert.rejects(managed(), { code: 'DEPENDENCY_UNAVAILABLE' }); }
      finally { await admin.query(revoke); }
    }
    await managed();
    console.log('PUBLIC_ACL_ACCEPTED_AND_TWELVE_UNSAFE_CONFIGURATIONS_REJECTED');
  }

  const first = await runtime.connect(), second = await runtime.connect();
  try {
    await first.query('BEGIN');
    assert.equal((await first.query('SELECT pg_try_advisory_lock(1111576149,1) AS acquired')).rows[0].acquired, true);
    await first.query('COMMIT');
    assert.equal((await second.query('SELECT pg_try_advisory_lock(1111576149,1) AS acquired')).rows[0].acquired, false);
    assert.equal((await first.query('SELECT pg_advisory_unlock(1111576149,1) AS released')).rows[0].released, true);
    assert.equal((await second.query('SELECT pg_try_advisory_lock(1111576149,1) AS acquired')).rows[0].acquired, true);
  } finally {
    await first.query('ROLLBACK; SELECT pg_advisory_unlock_all()');
    await second.query('SELECT pg_advisory_unlock_all()');
    first.release();
    second.release();
  }
  console.log('TWO_SESSION_ADVISORY_LOCK_OK');

  const ollama = 'http://127.0.0.1:11434';
  const version = await (await fetch(ollama + '/api/version')).json() as { version: string };
  const tags = await (await fetch(ollama + '/api/tags')).json() as { models: { name: string; digest: string }[] };
  const revision = tags.models.find(row => row.name === 'qwen3:4b-instruct')?.digest;
  assert.ok(revision);
  const generator = loadGeneratorRuntimeConfig({
    BANUCHAT_GENERATOR_MODEL: 'qwen3:4b-instruct', BANUCHAT_GENERATOR_MODEL_REVISION: revision,
    BANUCHAT_GENERATOR_RUNTIME_VERSION: version.version,
  });
  const rag = await createAuthenticatedDocumentRag({ sql: new PgSqlClient(runtime),
    query_embedding_client: new OllamaQueryEmbeddingClient(ollama),
    generator_client: new OllamaGeneratorClient(ollama), generator_config: generator.generator });
  server = await createAuthenticatedRuntimeServer({
    pool: runtime, expectedDatabase: 'postgres', postgres_profile: 'managed',
    deploymentId: required('BANUCHAT_B2_DEPLOYMENT'), rateKey: Buffer.from(required('BANUCHAT_B2_RATE_KEY'), 'hex'),
    document_rag: rag, artifacts: { root: resolve('../../data/synthetic') },
  });
  const active = server;
  await new Promise<void>((ok, fail) => { active.once('error', fail); active.listen(0, '127.0.0.1', ok); });
  const addr = active.address();
  assert.ok(addr && typeof addr !== 'string');
  const origin = 'http://127.0.0.1:' + addr.port;
  const req = async (path: string, status: number, token?: string, body?: object) => {
    const response = await fetch(origin + path, { method: body ? 'POST' : 'GET',
      headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(180000) });
    assert.equal(response.status, status, path);
    return response;
  };
  const login = async (synthetic_uid: string, password: string) =>
    (await (await req('/api/v2/auth/login', 200, undefined, { synthetic_uid, password })).json() as { access_token: string }).access_token;
  const a = await login('U90000001', required('BANUCHAT_B2_ACCOUNT_A'));
  const b = await login('U90000002', required('BANUCHAT_B2_ACCOUNT_B'));
  await login('BCH-DEMO-9701', required('BANUCHAT_B2_ACCOUNT_LEGACY'));
  const progress = await (await req('/api/v2/me/progress', 200, a)).json() as { profile: { profile_key: string } };
  assert.equal(progress.profile.profile_key, 'cloud-student-0001');
  const academic = await runtime.query('SELECT student FROM banuchat_academic.read_me($1)', [a]);
  assert.equal(academic.rows[0].student.academic_id, 'SIM-0001');
  await assert.rejects(runtime.query('SELECT * FROM banuchat_academic.students'), { code: '42501' });
  const previous = stage === 'restore' ? JSON.parse(await readFile(evidence, 'utf8')) : undefined;
  const chat = previous?.chat ?? (await (await req('/api/v2/conversations', 201, a, {})).json() as { conversation_id: string }).conversation_id;
  if (stage === 'source') {
    await req('/api/v2/conversations/' + chat + '/messages', 201, a,
      { content: '¿Cuál es el propósito del Programa Demo de Aprendizaje Digital según su orientación general?' });
  }
  type Citation = { artifact_url: string; release_id: string; document_version_id: string };
  const history = await (await req('/api/v2/conversations/' + chat, 200, a)).json() as { messages: { citations: Citation[] }[] };
  await req('/api/v2/conversations/' + chat, 404, b);
  const citations = history.messages[1]?.citations;
  assert.ok(citations?.length);
  const refs = (await admin.query(`SELECT o.principal_id,m.id AS message_id,m.content AS answer,
    c.*,v.source_sha256 AS version_source_hash,ch.locator,ch.content_sha256 AS chunk_hash,
    encode(sha256(convert_to(ch.content,'UTF8')),'hex') AS checked_chunk_hash
    FROM banuchat.message_citations c JOIN banuchat.messages m ON (m.id,m.answer_dataset_release_id)=(c.message_id,c.dataset_release_id)
    JOIN banuchat_auth.conversation_owners o ON o.conversation_id=m.conversation_id
    JOIN banuchat_auth.accounts a ON a.id=o.principal_id AND a.synthetic_uid='U90000001'
    JOIN banuchat.document_versions v ON (v.dataset_release_id,v.id)=(c.dataset_release_id,c.document_version_id)
    JOIN banuchat.document_chunks ch ON (ch.dataset_release_id,ch.document_version_id,ch.id)=(c.dataset_release_id,c.document_version_id,c.chunk_id)
    WHERE m.conversation_id=$1 ORDER BY c.citation_index`, [chat])).rows;
  assert.equal(refs.length, citations.length);
  for (const [index, cite] of citations.entries()) {
    const ref = refs[index]!;
    assert.equal(cite.release_id, ref.dataset_release_id);
    assert.equal(cite.document_version_id, ref.document_version_id);
    assert.equal(ref.source_sha256, ref.version_source_hash);
    assert.equal(ref.source_locator, ref.locator);
    assert.equal(ref.chunk_hash, ref.checked_chunk_hash);
    const artifact = await req(cite.artifact_url, 200, a);
    assert.equal(hash(Buffer.from(await artifact.arrayBuffer())), ref.source_sha256);
  }
  const vectors = await admin.query('SELECT id,embedding::text,content_sha256 FROM banuchat.document_chunks ORDER BY id');
  const fingerprint = { chat, citations: refs.length, refs: hash(JSON.stringify(refs)), vectors: hash(JSON.stringify(vectors.rows)) };
  if (previous) assert.deepEqual(fingerprint, previous);
  else await writeFile(evidence, JSON.stringify(fingerprint), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ stage, ...fingerprint }));
} finally {
  if (server) { server.closeAllConnections(); await new Promise<void>(ok => server!.close(() => ok())); }
  await Promise.all([admin.end(), runtime.end()]);
}
