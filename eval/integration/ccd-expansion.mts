/** Explicit expansion checks: validators before load, then real HTTP after publication. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { connectCcdLocal } from '../../backend/rag/src/ccd/local-runtime.js';
import { prepareCcdCorpus, ccdSnapshotFiles } from '../../backend/rag/src/ccd/prepare.js';
import { SafeReader } from '../../backend/rag/src/source/safe-reader.js';
import { sha256 } from '../../backend/rag/src/crypto/sha256.js';
import type { SendMessageResult } from '../../backend/api/src/application/messages.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'data/ccd/evidence/increment-4');
const report: Record<string, unknown> = { started_at: new Date().toISOString(), observations: [] };
const children: ChildProcess[] = [];
const mode = process.argv[2];
async function start(demo: 'synthetic' | 'ccd_local', port: number) {
  const child = spawn(process.execPath, ['dist/main.js'], { cwd: path.join(root, 'backend/api'), windowsHide: true,
    env: { ...process.env, BANUCHAT_DEMO_MODE: demo, BANUCHAT_API_PORT: String(port), BANUCHAT_API_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'] }); children.push(child);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Startup timeout')), 15_000);
    child.once('error', () => { clearTimeout(timer); reject(Error('Startup failed')); });
    child.once('exit', () => { clearTimeout(timer); reject(Error('Startup exited')); });
    child.stdout!.on('data', (bytes: Buffer) => { if (bytes.toString().includes(`(${demo}) listening`)) { clearTimeout(timer); resolve(); } });
    child.stderr!.on('data', () => {});
  });
  return `http://127.0.0.1:${port}/api/v1`;
}
async function request(base: string, route: string, method = 'GET', body?: unknown) {
  const r = await fetch(base + route, { method, ...(body === undefined ? {} : {
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), signal: AbortSignal.timeout(180_000) });
  const result = { status: r.status, body: await r.json() };
  (report.observations as unknown[]).push({ base, route, method, ...result }); return result;
}
try {
  assert.ok(mode === 'preflight' || mode === 'http');
  assert.ok(process.env.CCD_INSTITUTIONAL_ROOT);
  const { pool, identity } = await connectCcdLocal(); report.identity = identity;
  try {
    const prepared = await prepareCcdCorpus({ corpusRoot: path.join(root, 'data/ccd/local/expanded-v2'), institutionalRoot: process.env.CCD_INSTITUTIONAL_ROOT });
    const reader = await SafeReader.create(path.join(root, 'data/ccd/local/expanded-v2'));
    for (const [name, bytes] of ccdSnapshotFiles(prepared)) assert.ok(bytes.equals(await reader.read(name)));
    report.corpus_sha256 = prepared.corpus_sha256;
    const baseline = JSON.parse(await readFile(path.join(out, 'baseline.json'), 'utf8'));
    const oldRelease: string = baseline.releases[0].id;
    const old = (await pool.query('SELECT * FROM banuchat.dataset_releases WHERE id=$1', [oldRelease])).rows[0];
    for (const field of ['manifest', 'manifest_sha256', 'pipeline_config', 'pipeline_sha256', 'status']) assert.deepEqual(old[field], baseline.releases[0][field]);
    for (const chunk of baseline.chunks) {
      const current = (await pool.query('SELECT content_sha256,banuchat.text_sha256(embedding::text) AS vector_sha256 FROM banuchat.document_chunks WHERE id=$1', [chunk.id])).rows[0];
      assert.equal(current.content_sha256, chunk.content_sha256); assert.equal(current.vector_sha256, chunk.vector_sha256);
    }
    if (mode === 'preflight') {
      const connection = await pool.connect(); const checks: { name: string; passed: boolean }[] = []; report.sql_checks = checks;
      try {
        await connection.query('BEGIN');
        async function check(name: string, value: unknown, valid: boolean) {
          await connection.query('SAVEPOINT test_case'); let accepted = true;
          try { await connection.query('SELECT banuchat.validate_manifest($1::jsonb)', [JSON.stringify(value)]); } catch { accepted = false; }
          await connection.query('ROLLBACK TO SAVEPOINT test_case'); checks.push({ name, passed: accepted === valid }); assert.equal(accepted, valid, name);
        }
        await check('expanded manifest', prepared.manifest, true); await check('original CCD manifest', old.manifest, true);
        await check('frozen synthetic manifest', JSON.parse(await readFile(path.join(root, 'data/synthetic/manifest.json'), 'utf8')), true);
        for (const [name, mutate] of [
          ['missing source', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.sources.pop(); }],
          ['wrong course source', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units.find(u => u.id === 'ccd-m02-doc-098')!.references[0]!.source_id = 'DOC-099'; }],
          ['wrong course period', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units.find(u => u.group === 'M02')!.period = '202660'; }],
          ['missing topics', (m: typeof prepared.manifest) => { delete m.ccd_provenance.corpus.units.find(u => u.group === 'M02')!.topics; }],
          ['unsupported unit', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.id = 'ccd-m04'; }],
          ['false review', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units.find(u => u.group === 'M02')!.editorial_status = 'team_validated_local_candidate'; }],
          ['missing limits', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.limits = []; }],
        ] as const) { const changed = structuredClone(prepared.manifest); mutate(changed); await check(name, changed, false); }
      } finally { await connection.query('ROLLBACK'); connection.release(); }
      const messages = (await pool.query('SELECT * FROM banuchat.messages ORDER BY id')).rows;
      const citations = (await pool.query('SELECT * FROM banuchat.message_citations ORDER BY message_id,citation_index')).rows;
      await writeFile(path.join(out, 'history-before.json'), JSON.stringify({ messages, citations }, null, 2) + '\n', { flag: 'wx' });
    } else {
      const current = (await pool.query('SELECT r.* FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id')).rows[0];
      assert.notEqual(current.id, oldRelease); assert.deepEqual(current.manifest, prepared.manifest); assert.equal(current.status, 'ready');
      report.release_id = current.id; report.previous_release_id = oldRelease;
      const docs = (await pool.query(`SELECT d.document_key,v.id,v.source_path,v.source_sha256,v.content_sha256,
        c.id AS chunk_id,c.content_sha256 AS chunk_sha256,c.locator,public.vector_dims(c.embedding) AS dimensions,
        public.vector_norm(c.embedding)>0 AS nonzero
        FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id=v.document_id
        JOIN banuchat.document_chunks c ON c.document_version_id=v.id WHERE v.dataset_release_id=$1 ORDER BY d.document_key`, [current.id])).rows;
      assert.equal(docs.length, 10);
      for (const doc of docs) { assert.equal(doc.source_sha256, sha256(prepared.artifacts.get(doc.source_path)!));
        assert.equal(doc.chunk_sha256, doc.content_sha256); assert.equal(doc.dimensions, 1024); assert.equal(doc.nonzero, true); }
      report.documents = docs;
      const ccd = await start('ccd_local', 3001);
      assert.equal((await request(ccd, '/profiles')).body.profiles[0].profile_key, 'ccd-local-demo');
      for (const previous of baseline.chats) {
        const detail = await request(ccd, `/conversations/${previous.id}`); assert.equal(detail.status, 200);
        assert.equal(detail.body.messages.length, 16);
        const rejected = await request(ccd, `/conversations/${previous.id}/messages`, 'POST', { content: '¿Cuáles son los pilares?' });
        assert.equal(rejected.status, 409);
        for (const message of detail.body.messages) for (const citation of message.citations ?? []) {
          const r = await fetch(new URL(citation.artifact_url, ccd)); assert.equal(r.status, 200);
          const hash = (await pool.query('SELECT source_sha256 FROM banuchat.document_versions WHERE id=$1', [citation.document_version_id])).rows[0].source_sha256;
          assert.equal(sha256(new Uint8Array(await r.arrayBuffer())), hash);
        }
      }
      const before = JSON.parse(await readFile(path.join(out, 'history-before.json'), 'utf8'));
      const historicalIds = baseline.chats.map((chat: { id: string }) => chat.id);
      assert.deepEqual(JSON.parse(JSON.stringify((await pool.query('SELECT * FROM banuchat.messages WHERE conversation_id=ANY($1::uuid[]) ORDER BY id', [historicalIds])).rows)), before.messages);
      assert.deepEqual(JSON.parse(JSON.stringify((await pool.query(`SELECT mc.* FROM banuchat.message_citations mc
        JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])
        ORDER BY message_id,citation_index`, [historicalIds])).rows)), before.citations);
      const created = await request(ccd, '/conversations', 'POST', { profile_key: 'ccd-local-demo' }); assert.equal(created.status, 201);
      const conversation: string = created.body.conversation_id; report.conversation_id = conversation;
      const questions = [
        { key: 'M01', content: '¿Cuáles son los tres pilares descritos en los lineamientos 202660?', locator: 'unit:M01' },
        { key: 'M12', content: '¿Qué correo registra la documentación de 202660 para contactar al CCD?', locator: 'unit:M12' },
        ...prepared.corpus.units.filter(u => u.group === 'M02').map(u => ({ key: u.id, content: `Según el syllabus entregado de ${u.title}, ¿de qué trata el curso y qué temas aborda?`, locator: `unit:M02:${u.references[0]!.source_id}` })),
        { key: 'TEST_ORIENTATION', content: 'Según los lineamientos 202660, ¿para qué sirve la prueba diagnóstica y qué duración y estructura describe?', locator: 'unit:TEST_ORIENTATION' },
        { key: 'free', content: '¿Puedo repetir gratuitamente todas las pruebas que pierda?', negative: true },
        { key: 'recognition', content: 'Si obtengo 70 puntos, ¿me homologan automáticamente todos los cursos?', negative: true },
        { key: 'eligibility', content: '¿Todos los estudiantes continuos pueden presentar hoy la prueba diagnóstica?', negative: true },
        { key: 'offer', content: '¿Qué horarios y cupos hay para IA Generativa este semestre?', negative: true },
      ];
      const sent: SendMessageResult[] = []; const turns: unknown[] = []; report.turns = turns;
      for (const question of questions) {
        const started = performance.now(); const result = await request(ccd, `/conversations/${conversation}/messages`, 'POST', { content: question.content });
        turns.push({ ...question, elapsed_ms: performance.now() - started, result }); assert.equal(result.status, 201);
        const answer = result.body.assistant_message; sent.push(result.body);
        if ('negative' in question) { assert.equal(answer.insufficient_evidence, true); assert.deepEqual(answer.citations, []); }
        else { assert.equal(answer.insufficient_evidence, false); assert.ok(answer.citations.some((c: { locator: string }) => c.locator === question.locator)); }
        console.log(JSON.stringify({ key: question.key, http: result.status, insufficient: answer.insufficient_evidence }));
      }
      const detail = await request(ccd, `/conversations/${conversation}`); assert.equal(detail.status, 200);
      assert.equal(detail.body.messages.length, questions.length * 2);
      for (const turn of sent) assert.deepEqual(detail.body.messages.find((m: { message_id: string }) => m.message_id === turn.assistant_message.message_id), turn.assistant_message);
      const history = await request(ccd, '/conversations?profile_key=ccd-local-demo'); assert.equal(history.status, 200);
      assert.ok(history.body.conversations.length >= 3);
      const citations = (await pool.query(`SELECT mc.*,v.source_sha256=mc.source_sha256 AS hash_matches,c.locator=mc.source_locator AS locator_matches
        FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id
        JOIN banuchat.document_versions v ON v.id=mc.document_version_id JOIN banuchat.document_chunks c ON c.id=mc.chunk_id
        WHERE m.conversation_id=$1 ORDER BY m.ordinal,mc.citation_index`, [conversation])).rows;
      for (const citation of citations) {
        assert.equal(citation.hash_matches, true); assert.equal(citation.locator_matches, true);
        const r = await fetch(`${ccd}/documents/${citation.document_version_id}/artifact`); assert.equal(r.status, 200);
        assert.equal(sha256(new Uint8Array(await r.arrayBuffer())), citation.source_sha256);
      }
      report.persisted_citations = citations;
      loadEnvFile(path.join(root, '.env')); const synthetic = await start('synthetic', 3302);
      const profiles = await request(synthetic, '/profiles'); assert.equal(profiles.status, 200); assert.ok(profiles.body.profiles.length > 0);
      const key: string = profiles.body.profiles[0].profile_key;
      assert.equal((await request(synthetic, `/profiles/${key}/progress`)).status, 200);
      assert.equal((await request(synthetic, `/conversations?profile_key=${key}`)).status, 200);
      report.synthetic_read_only = true;
      report.contexts = (await pool.query('SELECT * FROM banuchat.ccd_demo_contexts ORDER BY dataset_release_id')).rows;
      assert.equal(report.contexts instanceof Array && report.contexts.length, 2);
    }
    report.passed = true;
  } finally { await pool.end(); }
} catch { report.passed = false; process.exitCode = 1; console.error('CCD_EXPANSION_CHECK_FAILED; partial observations saved locally'); }
finally {
  for (const child of children) if (child.exitCode === null) {
    const done = new Promise<void>(resolve => child.once('exit', () => resolve())); child.kill('SIGTERM'); await done;
  }
  await mkdir(out, { recursive: true }); report.finished_at = new Date().toISOString();
  const name = `${mode}-${Date.now()}.json`; await writeFile(path.join(out, name), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, evidence: name }));
}
