import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { createN8nChatObserver } from '../src/orchestration/n8n-chat-execution.js';
import { ragMetrics, startRagStage, withRagTurnMetrics, type RagTurnMetrics } from '../src/operations/rag-metrics.js';

const operation_id = 'a5e349d6-b543-4a79-9865-d103a9106dbb';
const started_at = '2026-11-21T06:00:00.000Z';
const finished_at = '2026-11-21T06:00:01.000Z';
const start = { operation_id, started_at, sequence: 0, route: 'unknown', duration_ms: 0, status: 'started' } as const;

test('chat execution sends only operational metadata and uses a fixed loopback destination', async () => {
  const calls: Array<{ url: string; request?: RequestInit }> = [];
  const observer = createN8nChatObserver(async (url, request) => {
    calls.push({ url: String(url), ...(request ? { request } : {}) });
    return new Response(null, { status: 202 });
  });
  assert.equal(observer(start), undefined);
  const supplied = { ...start, sequence: 1, finished_at, route: 'document_rag', duration_ms: 42, status: 'answered', citation_count: 1, private_text: 'do not transmit' } as const;
  observer(supplied);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  for (const { url, request } of calls) {
    assert.equal(url, 'http://127.0.0.1:15679/webhook/banuchat/internal/chat-executions');
    assert.deepEqual(request?.headers, { 'Content-Type': 'application/json' });
    assert.equal(request?.redirect, 'error');
    assert.ok(request?.signal);
  }
  assert.deepEqual(JSON.parse(String(calls[0]?.request?.body)),
    { ...start, finished_at: null, stage: null, error_code: null, citation_count: 0 });
  assert.deepEqual(JSON.parse(String(calls[1]?.request?.body)),
    { ...start, sequence: 1, finished_at, route: 'document_rag', duration_ms: 42, stage: null, status: 'answered', error_code: null, citation_count: 1 });
});

test('isolates phase metrics across concurrent turns and delivers only their summary over loopback', async () => {
  const fast: RagTurnMetrics = { ollama_calls: 0, ollama_timeouts: 0 };
  const slow: RagTurnMetrics = { ollama_calls: 0, ollama_timeouts: 0 };
  const stages: string[] = [];
  let releaseFast!: () => void;
  const barrier = new Promise<void>(resolve => { releaseFast = resolve; });
  await Promise.all([
    withRagTurnMetrics(fast, async () => {
      startRagStage('embedding');
      ragMetrics('embedding', performance.now() - 5, { private_field: 'never transferred' });
      await barrier;
      ragMetrics('pgvector', performance.now() - 8);
    }, stage => stages.push(stage)),
    withRagTurnMetrics(slow, async () => {
      await Promise.resolve();
      startRagStage('generation');
      ragMetrics('ollama_http', performance.now() - 20, { result: 'timeout' });
      releaseFast();
    }),
  ]);
  assert.deepEqual(stages, ['embedding']);
  assert.equal(fast.ollama_calls, 0);
  assert.equal(fast.ollama_http_ms, undefined);
  assert.ok((fast.embedding_ms ?? 0) >= 5);
  assert.ok((fast.retrieval_ms ?? 0) >= 8);
  assert.equal(slow.embedding_ms, undefined);
  assert.equal(slow.ollama_calls, 1);
  assert.equal(slow.ollama_timeouts, 1);

  const arrivals: Array<Record<string, unknown>> = [];
  let received!: () => void;
  const delivery = new Promise<void>(resolve => { received = resolve; });
  const receiver = createServer(async (req, res) => {
    const parts: Buffer[] = [];
    for await (const chunk of req) parts.push(Buffer.from(chunk));
    arrivals.push(JSON.parse(Buffer.concat(parts).toString('utf8')));
    res.writeHead(202).end();
    if (arrivals.length === 2) received();
  });
  await new Promise<void>(resolve => receiver.listen(0, '127.0.0.1', resolve));
  const { port } = receiver.address() as AddressInfo;
  const send = createN8nChatObserver((_, request) => fetch(`http://127.0.0.1:${port}/`, request));
  try {
    send({ ...start, sequence: 1, finished_at, route: 'document_rag', status: 'partial', duration_ms: 100, citation_count: 1, rag: fast });
    send({ ...start, sequence: 2, finished_at, route: 'document_rag', status: 'error', duration_ms: 200, error_code: 'DEPENDENCY_UNAVAILABLE', rag: slow });
    await Promise.race([delivery, delay(3500, undefined, { ref: false }).then(() => assert.fail('No llegaron los dos eventos al receptor local'))]);
    const partial = arrivals.find(event => event.status === 'partial');
    const failed = arrivals.find(event => event.status === 'error');
    assert.deepEqual(partial?.rag, { ...fast, ollama_http_ms: null, generation_ms: null });
    assert.deepEqual(failed?.rag, { ...slow, embedding_ms: null, retrieval_ms: null, generation_ms: null });
    assert.doesNotMatch(JSON.stringify(arrivals), /private_field|never transferred|prompt|token/u);
  } finally {
    receiver.closeAllConnections();
    await new Promise<void>(resolve => receiver.close(() => resolve()));
  }
});

test('workflow validates current and previous senders and routes invalid events to 422', async () => {
  const flow = JSON.parse(await readFile(new URL('../../../n8n/workflows/chat-executions-v1.json', import.meta.url), 'utf8'));
  const node = (name: string) => flow.nodes.find((candidate: {name: string}) => candidate.name === name);
  const validation = node('Validar estructura y procedencia');
  const expression = (value: string) => new Function('$json', 'return '+value.slice(3,-3));
  const validate = expression(validation.parameters.conditions.conditions[0].leftValue);
  const project = expression(node('Registrar ruta y estado técnico').parameters.jsonOutput);
  const payload = (body: Record<string, unknown>) => ({body, headers: {
    'content-type': 'application/json', 'content-length': String(Buffer.byteLength(JSON.stringify(body))),
  }});
  const current = { ...start, finished_at: null, stage: null, error_code: null, citation_count: 0 };
  assert.equal(validate(payload(current)), true);
  assert.equal(JSON.parse(project(payload(current))).event, 'inicio');
  const running = { ...current, sequence: 2, route: 'document_rag', stage: 'pgvector' };
  assert.equal(validate(payload(running)), true);
  assert.equal(JSON.parse(project(payload(running))).event, 'etapa');
  const error = {...running, status: 'error', finished_at, error_code: 'DEPENDENCY_UNAVAILABLE'};
  assert.equal(validate(payload(error)), true);
  assert.equal(JSON.parse(project(payload(error))).event, 'error_chat');
  assert.equal(validate(payload({...running, status: 'cancelled', finished_at})), true);
  assert.equal(validate(payload({operation_id, route: 'direct', duration_ms: 5, status: 'answered', citation_count: 1})), true);
  assert.equal(validate(payload({...current, question: 'private'})), false);
  assert.equal(validate(payload({...error, error_code: 'arbitrary'})), false);
  assert.equal(validate({...payload(current),headers:{'content-type':'application/json','content-length':'1025'}}), false);
  assert.equal(flow.connections[validation.name].main[1][0].node, 'Rechazar evento inválido');
  assert.equal(node('Rechazar evento inválido').parameters.options.responseCode, 422);
  assert.equal(node('Recibir evento interno').parameters.options.ipWhitelist, '127.0.0.1');
});
