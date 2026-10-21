/** Real local HTTP, PostgreSQL and Ollama. Explicit opt-in, not a default test. */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectCcdLocal } from '../../backend/rag/src/ccd/local-runtime.js';
import { SafeReader } from '../../backend/rag/src/source/safe-reader.js';
import { sha256 } from '../../backend/rag/src/crypto/sha256.js';
import { loadDefaultIntentRouter } from '../../backend/api/src/routing/intent-router.js';
import type { SendMessageResult } from '../../backend/api/src/application/messages.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const report: Record<string, unknown> = { started_at: new Date().toISOString(), base_git_revision: 'c61f306' };
const observations: unknown[] = [];
const processes: ChildProcess[] = [];
const output = path.join(root, 'data/ccd/evidence/increment-3');
let pool: Awaited<ReturnType<typeof connectCcdLocal>>['pool'] | undefined;
async function start(mode: 'synthetic' | 'ccd_local', port: number) {
  const processEnvironment = { ...process.env, BANUCHAT_DEMO_MODE: mode,
    BANUCHAT_API_HOST: '127.0.0.1', BANUCHAT_API_PORT: String(port) };
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: path.join(root, 'backend/api'), env: processEnvironment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(child);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('API startup timeout')), 15_000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('API spawn rejected')); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('API exited before ready')); });
    child.stdout!.on('data', (data: Buffer) => {
      if (data.toString('utf8').includes(`(${mode}) listening on http://127.0.0.1:${port}`)) {
        clearTimeout(timer); resolve();
      }
    });
    child.stderr!.on('data', () => { /* Main emits only safe errors; no native diagnostic printing. */ });
  });
  return `http://127.0.0.1:${port}/api/v1`;
}
async function request(base: string, route: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + route, { method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(180_000) });
  const json = await response.json();
  observations.push({ mode: base.includes(':3001/') ? 'ccd_local' : 'synthetic', method, route,
    status: response.status, body: json });
  return { status: response.status, body: json };
}
try {
  const connection = await connectCcdLocal(); pool = connection.pool; report.identity = connection.identity;
  const snapshot = async () => (await pool!.query(`SELECT r.id,r.manifest_sha256,r.pipeline_sha256,
    (SELECT count(*)::int FROM banuchat.documents) AS documents,
    (SELECT count(*)::int FROM banuchat.document_chunks) AS chunks,
    (SELECT count(embedding)::int FROM banuchat.document_chunks) AS embeddings,
    (SELECT jsonb_object_agg(v.source_path,banuchat.text_sha256(c.embedding::text))
      FROM banuchat.document_versions v JOIN banuchat.document_chunks c ON c.document_version_id=v.id) AS vector_hashes
    FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id`)).rows;
  const before = await snapshot(); report.corpus_before = before;
  assert.equal(before.length, 1); assert.equal(before[0].documents, 2);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM banuchat.synthetic_profiles')).rows[0].n, 0);
  const source = await SafeReader.create(root);
  const code: Record<string, string> = {};
  for (const prefix of ['backend/api/src', 'backend/api/dist']) {
    for (const file of await (await SafeReader.create(path.join(root, prefix))).listFiles()) {
      if (file.endsWith('.ts') || file.endsWith('.js')) code[`${prefix}/${file}`] = sha256(await source.read(`${prefix}/${file}`));
    }
  }
  for (const file of ['backend/api/intent-routing.catalog.json', 'backend/api/intent-routing.schema.json',
    'backend/api/openapi.yaml', 'infra/db/003_ccd_chat_demo.sql', 'eval/integration/ccd-chat-http.mts']) {
    code[file] = sha256(await source.read(file));
  }
  report.executed_code_sha256 = code;
  const ccd = await start('ccd_local', 3001);
  const profiles = await request(ccd, '/profiles'); assert.equal(profiles.status, 200);
  assert.equal(profiles.body.profiles.length, 1);
  const context = profiles.body.profiles[0]; assert.equal(context.profile_key, 'ccd-local-demo');
  assert.match(context.alias, /sin identidad institucional/);
  assert.equal((await request(ccd, '/conversations', 'POST', { profile_key: 'unavailable-student' })).status, 404);
  const created = await request(ccd, '/conversations', 'POST', { profile_key: context.profile_key });
  assert.equal(created.status, 201); assert.equal(created.body.profile_alias, context.alias);
  const conversationId: string = created.body.conversation_id; report.conversation_id = conversationId;
  const router = await loadDefaultIntentRouter();
  const questions = [
    { key: 'M01', content: '¿Cuáles son los tres pilares de Competencias Digitales descritos en los lineamientos de 202660?', locator: 'unit:M01' },
    { key: 'M12', content: '¿Qué correo registra la documentación de 202660 para contactar al CCD?', locator: 'unit:M12' },
    { key: 'contact-generic', content: '¿Cuál es el correo de contacto?', locator: 'unit:M12' },
    { key: 'free', content: '¿Puedo repetir gratuitamente todas las pruebas que pierda?', negative: true },
    { key: 'homologation', content: '¿Qué cursos me homologan automáticamente si presento la prueba?', negative: true },
    { key: 'recognition', content: 'Si obtengo 70 puntos, ¿quedo exento de cursar todos los pilares?', negative: true },
    { key: 'help', content: '¿Qué puedes hacer?', scope: true },
    { key: 'progress', content: 'Muéstrame mi progreso', negative: true },
  ];
  const turns: unknown[] = []; report.turns = turns;
  const sent: SendMessageResult[] = [];
  for (const question of questions) {
    const decision = router.route({ content: question.content, context: { profile_selected: false, now: new Date().toISOString() } });
    const started = performance.now();
    const result = await request(ccd, `/conversations/${conversationId}/messages`, 'POST', { content: question.content });
    const answer = result.body.assistant_message;
    turns.push({ key: question.key, router_decision: decision, elapsed_ms: performance.now() - started, result });
    assert.equal(result.status, 201); sent.push(result.body);
    if (question.negative) {
      assert.equal(answer.insufficient_evidence, true); assert.deepEqual(answer.citations, []);
    } else if (question.scope) {
      assert.match(answer.content, /sin identidad institucional/); assert.deepEqual(answer.citations, []);
    } else {
      assert.equal(answer.insufficient_evidence, false);
      assert.ok(answer.citations.some((citation: { locator: string }) => citation.locator === question.locator));
      if (question.key === 'contact-generic') assert.match(answer.content, /202660/);
    }
    console.log(JSON.stringify({ key: question.key, http: result.status, insufficient: answer.insufficient_evidence,
      citations: answer.citations.map((citation: { locator: string }) => citation.locator) }));
  }
  const detail = await request(ccd, `/conversations/${conversationId}`); assert.equal(detail.status, 200);
  assert.equal(detail.body.profile.alias, context.alias); assert.equal(detail.body.messages.length, questions.length * 2);
  for (const turn of sent) {
    const historical = detail.body.messages.find((message: { message_id: string }) => message.message_id === turn.assistant_message.message_id);
    assert.deepEqual(historical, turn.assistant_message);
  }
  const history = await request(ccd, `/conversations?profile_key=ccd-local-demo`); assert.equal(history.status, 200);
  assert.equal(history.body.conversations.find((item: { conversation_id: string }) => item.conversation_id === conversationId).message_count, questions.length * 2);
  const citations = (await pool.query(`SELECT mc.*,v.source_sha256=mc.source_sha256 AS hash_matches,
    c.locator=mc.source_locator AS locator_matches,c.dataset_release_id=mc.dataset_release_id AS release_matches
    FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id
    JOIN banuchat.document_versions v ON v.id=mc.document_version_id
    JOIN banuchat.document_chunks c ON c.id=mc.chunk_id WHERE m.conversation_id=$1 ORDER BY m.ordinal,mc.citation_index`, [conversationId])).rows;
  assert.equal(citations.length, 6); report.persisted_citations = citations;
  for (const citation of citations) {
    assert.equal(citation.hash_matches, true); assert.equal(citation.locator_matches, true); assert.equal(citation.release_matches, true);
    const artifact = await fetch(`${ccd}/documents/${citation.document_version_id}/artifact`); assert.equal(artifact.status, 200);
    assert.equal(sha256(new Uint8Array(await artifact.arrayBuffer())), citation.source_sha256);
  }
  report.corpus_after = await snapshot(); assert.deepEqual(report.corpus_after, before);
  report.synthetic_profile_rows = (await pool.query('SELECT count(*)::int AS n FROM banuchat.synthetic_profiles')).rows[0].n;
  // Synthetic runtime smoke is strictly GET-only; its volume/history must stay unchanged.
  loadEnvFile(path.join(root, '.env'));
  const synthetic = await start('synthetic', 3302);
  const syntheticProfiles = await request(synthetic, '/profiles'); assert.equal(syntheticProfiles.status, 200);
  assert.ok(syntheticProfiles.body.profiles.length > 0);
  const profileKey = syntheticProfiles.body.profiles[0].profile_key;
  const syntheticProgress = await request(synthetic, `/profiles/${profileKey}/progress`);
  assert.equal(syntheticProgress.status, 200);
  const syntheticHistory = await request(synthetic, `/conversations?profile_key=${profileKey}`);
  assert.equal(syntheticHistory.status, 200);
  if (syntheticHistory.body.conversations.length > 0) {
    const previousId = syntheticHistory.body.conversations[0].conversation_id;
    const syntheticDetail = await request(synthetic, `/conversations/${previousId}`);
    assert.equal(syntheticDetail.status, 200); report.synthetic_existing_conversation_id = previousId;
  }
  report.synthetic_smoke_read_only = true;
  report.passed = true;
} catch {
  report.passed = false; process.exitCode = 1; console.error('CCD_CHAT_HTTP_CHECK_FAILED; completed observations saved locally');
} finally {
  for (const child of processes) {
    if (child.exitCode === null) {
      const closed = new Promise<void>(resolve => child.once('exit', () => resolve()));
      child.kill('SIGTERM'); await closed;
    }
  }
  await pool?.end();
  report.observations = observations; report.finished_at = new Date().toISOString();
  await mkdir(output, { recursive: true });
  const name = `http-${Date.now()}.json`;
  await writeFile(path.join(output, name), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, evidence: name, observations: observations.length }));
}
