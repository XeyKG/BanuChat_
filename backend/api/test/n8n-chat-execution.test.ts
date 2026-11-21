import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { createN8nChatObserver } from '../src/orchestration/n8n-chat-execution.js';
import { ragMetrics, withRagTurnMetrics, type RagTurnMetrics } from '../src/operations/rag-metrics.js';

test('chat execution sends only operational metadata and uses a fixed loopback destination', async () => {
  const calls: Array<{ url: string; request?: RequestInit }> = [];
  const observer = createN8nChatObserver(async (url, request) => {
    calls.push({ url: String(url), ...(request ? { request } : {}) });
    return new Response(null, { status: 202 });
  });
  const supplied = { route: 'document_rag', duration_ms: 42, status: 'answered', citation_count: 1, private_text: 'do not transmit' } as const;
  assert.equal(observer(supplied), undefined);
  observer({ route: 'structured_mcp', duration_ms: 31, status: 'error', error_code: 'DEPENDENCY_UNAVAILABLE' });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  for (const { url, request } of calls) {
    assert.equal(url, 'http://127.0.0.1:15679/webhook/banuchat/internal/chat-executions');
    assert.deepEqual(request?.headers, { 'Content-Type': 'application/json' });
    assert.equal(request?.redirect, 'error');
    assert.ok(request?.signal);
  }
  const { operation_id: one, ...success } = JSON.parse(String(calls[0]?.request?.body));
  assert.deepEqual(success, { route: 'document_rag', duration_ms: 42, status: 'answered', citation_count: 1 });
  const { operation_id: two, ...failure } = JSON.parse(String(calls[1]?.request?.body));
  assert.deepEqual(failure, { route: 'structured_mcp', duration_ms: 31, status: 'error', error_code: 'DEPENDENCY_UNAVAILABLE' });
  assert.match(one, /^[a-f0-9-]{36}$/u);
  assert.notEqual(one, two);
});

test('isolates phase metrics across concurrent turns and delivers only their summary over loopback', async () => {
  const fast: RagTurnMetrics = { ollama_calls: 0, ollama_timeouts: 0 };
  const slow: RagTurnMetrics = { ollama_calls: 0, ollama_timeouts: 0 };
  let releaseFast!: () => void;
  const barrier = new Promise<void>(resolve => { releaseFast = resolve; });
  await Promise.all([
    withRagTurnMetrics(fast, async () => {
      ragMetrics('embedding', performance.now() - 5, { private_field: 'never transferred' });
      await barrier;
      ragMetrics('pgvector', performance.now() - 8);
    }),
    withRagTurnMetrics(slow, async () => {
      await Promise.resolve();
      ragMetrics('ollama_http', performance.now() - 20, { result: 'timeout' });
      releaseFast();
    }),
  ]);
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
    send({ route: 'document_rag', status: 'partial', duration_ms: 100, citation_count: 1, rag: fast });
    send({ route: 'document_rag', status: 'error', duration_ms: 200, error_code: 'DEPENDENCY_UNAVAILABLE', rag: slow });
    await Promise.race([delivery, delay(3500, undefined, { ref: false }).then(() => assert.fail('No llegaron los dos eventos al receptor local'))]);
    const partial = arrivals.find(event => event.status === 'partial');
    const failed = arrivals.find(event => event.status === 'error');
    assert.deepEqual(partial?.rag, { ...fast, ollama_http_ms: null });
    assert.deepEqual(failed?.rag, { ...slow, embedding_ms: null, retrieval_ms: null });
    assert.doesNotMatch(JSON.stringify(arrivals), /private_field|never transferred|prompt|token/u);
  } finally {
    receiver.closeAllConnections();
    await new Promise<void>(resolve => receiver.close(() => resolve()));
  }
});

test('workflow projects the timing object and accepts executions from the previous sender', async () => {
  const flow = JSON.parse(await readFile(new URL('../../../n8n/workflows/chat-executions-v1.json', import.meta.url), 'utf8'));
  const projection = flow.nodes.find((node: {type: string}) => node.type === 'n8n-nodes-base.set');
  const assignments = projection.parameters.assignments.assignments as Array<{name:string;type:string;value:string}>;
  assert.deepEqual(assignments.map(item => item.name), ['operation_id','route','duration_ms','status','citation_count','error_code','rag']);
  assert.deepEqual(assignments.find(item => item.name === 'rag')?.value, '={{ $json.body.rag ?? {} }}');
});
