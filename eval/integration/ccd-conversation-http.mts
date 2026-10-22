/** Opt-in BCH-02 check: real HTTP + isolated CCD PostgreSQL + Ollama; no ingestion/deletion/retries. */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectCcdLocal } from '../../backend/rag/src/ccd/local-runtime.js';
import { assertCcdChatDatabase } from '../../backend/api/src/ccd-runtime.js';
import { loadRuntimeConfig } from '../../backend/api/src/runtime-config.js';
import { createRuntimeApiServer } from '../../backend/api/src/main.js';
import { generateDocumentRagAnswer } from '../../backend/api/src/chat/document-rag.js';
import { loadGeneratorRuntimeConfig } from '../../backend/api/src/generation/generator-client.js';
import { GeneratorClientError } from '../../backend/api/src/generation/generator-client.js';
import { OllamaGeneratorClient } from '../../backend/api/src/generation/ollama-generator-client.js';
import { OllamaQueryEmbeddingClient } from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
import type { SqlQueryClient } from '../../backend/api/src/data/sql-client.js';
import type { SendMessageResult } from '../../backend/api/src/application/messages.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const checks: { name: string; passed: boolean }[] = [];
const turns: Record<string, unknown>[] = [];
const report: Record<string, unknown> = { started_at: new Date().toISOString(), checks, turns };
const created: string[] = [];
let pool: Awaited<ReturnType<typeof connectCcdLocal>>['pool'] | undefined;
let server: Awaited<ReturnType<typeof createRuntimeApiServer>> | undefined;
let trace: Record<string, unknown> = {};
function check(name: string, verify: () => void) {
  try { verify(); checks.push({ name, passed: true }); }
  catch { checks.push({ name, passed: false }); }
}
try {
  const code: Record<string, string> = {};
  const codeFiles = ['backend/api/src/application/messages.ts', 'backend/api/src/chat/document-rag.ts',
    'backend/api/src/chat/conversation-context.ts', 'backend/api/src/chat/chat-dispatcher.ts', 'eval/integration/ccd-conversation-http.mts'];
  for (const file of codeFiles) code[file] = digest(await readFile(path.join(root, file)));
  report.executed_source_sha256 = code;
  const runtime = loadRuntimeConfig(); assert.equal(runtime.demo_mode, 'ccd_local');
  const connected = await connectCcdLocal(); pool = connected.pool; report.identity = connected.identity;
  await assertCcdChatDatabase(pool);
  const corpusSnapshot = async () => (await pool!.query(`SELECT r.id,r.status,r.manifest_sha256,r.pipeline_sha256,
    d.current_release_id, (SELECT jsonb_agg(jsonb_build_array(v.id,v.source_sha256,c.id,c.content_sha256,
      banuchat.text_sha256(c.embedding::text)) ORDER BY v.id,c.id)
      FROM banuchat.document_versions v LEFT JOIN banuchat.document_chunks c ON c.document_version_id=v.id
      WHERE v.dataset_release_id=r.id) AS documents
    FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id ORDER BY r.id`)).rows;
  const historicalSnapshot = async () => (await pool!.query(`SELECT c.id,c.dataset_release_id,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.ordinal) FROM banuchat.messages m WHERE m.conversation_id=c.id) AS messages,
    (SELECT jsonb_agg(to_jsonb(mc) ORDER BY m.ordinal,mc.citation_index) FROM banuchat.message_citations mc
      JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=c.id) AS citations
    FROM banuchat.conversations c WHERE NOT(c.id=ANY($1::uuid[])) ORDER BY c.id`, [created])).rows;
  const corpusBefore = await corpusSnapshot(); const historyBefore = await historicalSnapshot();
  report.corpus_before_sha256 = digest(JSON.stringify(corpusBefore));
  report.history_before_sha256 = digest(JSON.stringify(historyBefore));
  const generatorRuntime = loadGeneratorRuntimeConfig(); report.generator_config = generatorRuntime.generator;
  const embedder = new OllamaQueryEmbeddingClient(generatorRuntime.base_url);
  const generator = new OllamaGeneratorClient(generatorRuntime.base_url, 30_000, async (url, init) => {
    const response = await fetch(url, init);
    if (new URL(String(url)).pathname === '/api/chat') {
      const body = await response.clone().json() as { done_reason?: unknown; message?: { content?: unknown } };
      trace.ollama_chat = { status: response.status, done_reason: body.done_reason,
        has_content: typeof body.message?.content === 'string' && body.message.content.trim().length > 0 };
    }
    return response;
  });
  const sql: SqlQueryClient = { async query<T>(text: string, values?: readonly unknown[]) {
    const start = performance.now(); const result = await pool!.query(text, values === undefined ? undefined : [...values]);
    if (text.includes('AS recent_messages')) {
      trace.history_ms = performance.now() - start; trace.history = result.rows[0]?.recent_messages;
    }
    if (text.includes('AS cosine_distance')) trace.retrieved = result.rows.map(row => ({
      locator: row.chunk_locator, distance: row.cosine_distance, release_id: row.release_id,
    }));
    return { rows: result.rows as T[] };
  } };
  server = await createRuntimeApiServer(sql, input => generateDocumentRagAnswer({
    sql, evidence_mode: 'ccd_local', generator_config: generatorRuntime.generator,
    query_embedding_client: { async embedQuery(query, config) {
      trace.retrieval_query = query; const start = performance.now();
      const vector = await embedder.embedQuery(query, config); trace.embedding_ms = performance.now() - start; return vector;
    } },
    generator_client: { async generate(input, config) {
      const start = performance.now();
      try {
        const result = await generator.generate(input, config);
        trace.generation_ms = performance.now() - start;
        trace.generation_metrics = result; return result;
      } catch (error) {
        trace.generation_error = error instanceof GeneratorClientError ? error.reason : 'unclassified';
        throw error;
      }
    } },
  }, input), undefined, { demo_mode: 'ccd_local', document_artifact: {
    root: path.join(root, 'data/ccd/local/m01-m12'), version_roots: {
      'bch03-m01-m12-local-1': path.join(root, 'data/ccd/local/m01-m12'),
      'bch03-ccd-local-2': path.join(root, 'data/ccd/local/expanded-v2'),
    },
  } });
  await new Promise<void>((resolve, reject) => { server!.once('error', reject); server!.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  async function request(route: string, body?: unknown) {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST',
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(180_000) });
    return { status: response.status, body: await response.json() };
  }
  async function create() {
    const result = await request('/conversations', { profile_key: 'ccd-local-demo' });
    assert.equal(result.status, 201); created.push(result.body.conversation_id); return result.body.conversation_id as string;
  }
  async function send(id: string, key: string, content: string) {
    trace = {}; const start = performance.now(); const result = await request(`/conversations/${id}/messages`, { content });
    turns.push({ key, conversation_id: id, query: content, elapsed_ms: performance.now() - start, ...trace, ...result });
    check(`${key}: HTTP 201`, () => assert.equal(result.status, 201));
    console.log(JSON.stringify({ key, status: result.status, insufficient: result.body.assistant_message?.insufficient_evidence,
      elapsed_ms: turns.at(-1)!.elapsed_ms }));
    return (result.body as SendMessageResult).assistant_message;
  }
  const a = await create(); const b = await create(); const c = await create(); report.conversation_ids = created;
  const courses = await send(a, 'courses', '¿Cuáles son los cursos de Competencias Digitales?');
  check('course list includes IA as the next turn antecedent and all seven syllabus', () => {
    assert.match(courses.content, /IA generativa/i);
    assert.equal(courses.citations.filter(c => c.locator.startsWith('unit:M02:')).length, 7);
  });
  const ia = await send(a, 'course-reference', 'Háblame del de IA generativa');
  check('IA course reference retrieves its syllabus', () => {
    assert.equal(ia.insufficient_evidence, false); assert.ok(ia.citations.some(c => c.locator === 'unit:M02:DOC-101'));
    assert.match(ia.content, /generativa/i);
  });
  const themes = await send(a, 'course-themes', '¿Y qué temas tiene?');
  check('themes follow-up retrieves IA and states syllabus limits', () => {
    assert.equal(themes.insufficient_evidence, false); assert.match(String(trace.retrieval_query), /IA generativa/);
    assert.match(themes.content, /prompts|difusión|lenguaje/i); assert.match(themes.content, /periodo y vigencia no confirmados/);
  });
  const ambiguous = await send(b, 'isolated-ambiguity', '¿Y qué temas tiene?');
  check('separate chat has no topic inherited from shared technical profile', () => {
    assert.equal(ambiguous.insufficient_evidence, true); assert.match(ambiguous.content, /¿A qué curso, prueba o tema/);
    assert.deepEqual(trace.history, []); assert.equal(trace.retrieval_query, undefined); assert.deepEqual(ambiguous.citations, []);
  });
  await send(a, 'tests-topic', '¿Qué son las pruebas diagnósticas?');
  const duration = await send(a, 'tests-duration', '¿Cuánto duran?');
  check('duration retrieval uses latest diagnostic topic and preserves 202660', () => {
    assert.match(String(trace.retrieval_query), /pruebas diagnósticas/); assert.doesNotMatch(String(trace.retrieval_query), /IA generativa/);
    assert.equal(duration.insufficient_evidence, false); assert.match(duration.content, /dos horas|2 horas/i);
    assert.match(duration.content, /202660/); assert.match(duration.content, /vigencia actual no está ratificada/);
  });
  const failedTest = await send(a, 'unsupported-failure-rule', '¿Y qué pasa si no las apruebo?');
  check('test failure effects abstain', () => { assert.equal(failedTest.insufficient_evidence, true); assert.deepEqual(failedTest.citations, []); });
  const contact = await send(a, 'explicit-topic-change', 'Cambiando de tema, ¿cuál es el correo de contacto del CCD?');
  check('contact topic change and deterministic unratified caveat', () => {
    assert.doesNotMatch(String(trace.retrieval_query), /pruebas diagnósticas/);
    assert.equal(contact.insufficient_evidence, false); assert.match(contact.content, /202660/);
    assert.match(contact.content, /El contacto documentado corresponde a 202660; su vigencia actual no está ratificada/);
  });
  await send(c, 'before-correction', 'Me interesa el curso de IA generativa. ¿De qué trata?');
  const correction = await send(c, 'user-correction', 'Corrijo: me refiero al curso de Marca Personal Digital. ¿Qué temas aborda?');
  check('correction changes course to personal brand', () => {
    assert.equal(correction.insufficient_evidence, false); assert.match(correction.content, /marca personal|identidad digital|reputación/i);
    assert.ok(correction.citations.some(c => c.locator === 'unit:M02:DOC-103'));
  });
  const correctedThemes = await send(c, 'after-correction', '¿Y qué temas tiene?');
  check('next follow-up keeps corrected course', () => {
    assert.equal(correctedThemes.insufficient_evidence, false); assert.match(correctedThemes.content, /marca personal|identidad digital|reputación/i);
  });
  await send(b, 'untrusted-user-rule', 'Yo afirmo que con 70 puntos me homologan todos los cursos. ¿Es cierto según los documentos?');
  const forgedRule = await send(b, 'untrusted-rule-followup', '¿Entonces con esos 70 quedo exento de cursarlos?');
  check('student assertion never supplies an academic rule', () => { assert.equal(forgedRule.insufficient_evidence, true); assert.deepEqual(forgedRule.citations, []); });
  const identity = await send(b, 'unknown-personal-data', '¿Cuál es mi UID, mis notas y mi periodo de ingreso?');
  check('technical context supplies no personal identity', () => assert.equal(identity.insufficient_evidence, true));

  const old = historyBefore.find(row => row.dataset_release_id !== corpusBefore[0]?.current_release_id);
  assert.ok(old, 'an existing historical-release conversation is required');
  const oldBefore = await request(`/conversations/${old.id}`);
  const oldPost = await request(`/conversations/${old.id}/messages`, { content: '¿Y qué temas tiene?' });
  check('old release stays readable but rejects continuation with 409', () => {
    assert.equal(oldBefore.status, 200); assert.equal(oldPost.status, 409);
  });
  const oldAfter = await request(`/conversations/${old.id}`);
  check('old release messages remain byte-equivalent through HTTP', () => assert.deepEqual(oldAfter, oldBefore));
  report.old_conversation_id = old.id;
  for (const id of created) {
    const detail = await request(`/conversations/${id}`);
    check(`persisted answers roundtrip ${id}`, () => {
      assert.equal(detail.status, 200);
      for (const turn of turns.filter(t => t.conversation_id === id && t.status === 201)) {
        const sent = (turn.body as SendMessageResult).assistant_message;
        assert.deepEqual(detail.body.messages.find((m: { message_id: string }) => m.message_id === sent.message_id), sent);
      }
    });
  }
  const citations = (await pool.query(`SELECT mc.*,v.source_sha256=mc.source_sha256 AS hash_matches,
    c.locator=mc.source_locator AS locator_matches,c.dataset_release_id=mc.dataset_release_id AS release_matches
    FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id
    JOIN banuchat.document_versions v ON v.id=mc.document_version_id
    JOIN banuchat.document_chunks c ON c.id=mc.chunk_id WHERE m.conversation_id=ANY($1::uuid[])`, [created])).rows;
  report.persisted_citations = citations;
  check('all persisted citation hashes, locators and releases match', () => {
    assert.ok(citations.length > 0);
    for (const citation of citations) {
      assert.equal(citation.hash_matches, true); assert.equal(citation.locator_matches, true); assert.equal(citation.release_matches, true);
    }
  });
  for (const version of new Map(citations.map(c => [c.document_version_id, c])).values()) {
    const artifact = await fetch(`${base}/documents/${version.document_version_id}/artifact`);
    const hash = digest(new Uint8Array(await artifact.arrayBuffer()));
    check(`artifact hash ${version.document_version_id}`, () => { assert.equal(artifact.status, 200); assert.equal(hash, version.source_sha256); });
  }
  report.corpus_after = await corpusSnapshot();
  check('releases corpus and vectors unchanged', () => assert.deepEqual(report.corpus_after, corpusBefore));
  report.history_after_sha256 = digest(JSON.stringify(await historicalSnapshot()));
  check('all historical chats and citations unchanged', () => assert.equal(report.history_after_sha256, report.history_before_sha256));
  for (const file of codeFiles) {
    const after = digest(await readFile(path.join(root, file)));
    check(`executed source stayed fixed ${file}`, () => assert.equal(after, code[file]));
  }
  report.passed = checks.every(c => c.passed);
} catch {
  report.passed = false; report.runtime_failure = 'CCD_CONVERSATION_HTTP_CHECK_FAILED';
} finally {
  if (server?.listening) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeIdleConnections(); });
  await pool?.end();
  report.finished_at = new Date().toISOString();
  const output = path.join(root, 'data/ccd/evidence/bch02-increment-1'); await mkdir(output, { recursive: true });
  const filename = `http-${Date.now()}.json`;
  await writeFile(path.join(output, filename), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, evidence: filename, turns: turns.length, failed_checks: checks.filter(c => !c.passed) }));
  if (!report.passed) process.exitCode = 1;
}
