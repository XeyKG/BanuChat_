import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { OllamaClient, OllamaError, validateVectors, validateEmbedResponse, vectorLiteral,
  buildPipelineConfigV1, validatePipelineConfigV1, DatabaseError } from '../src/index.js';
import { EMBEDDING_MODEL } from '../src/ollama/types.js';
import { effectiveConfig } from '../src/ollama/config.js';

// Synthetic vectors are confined to unit HTTP fixtures; never persisted to PostgreSQL.
const vector = (first = 1): number[] => [first, ...Array<number>(1023).fill(0)];
async function fixture(t: TestContext, options: { missing?: boolean; badDigest?: boolean; embedFailure?: boolean; invalidJson?: boolean } = {}) {
  const requests: Record<string, unknown>[] = [];
  let digest = 'a'.repeat(64);
  const server = createServer(async (req, res) => {
    let result: unknown;
    if (req.url === '/api/version') result = { version: '0.0.0-fixture' };
    else if (req.url === '/api/tags') result = { models: options.missing ? [] : [{ name: EMBEDDING_MODEL, digest: options.badDigest ? 'abc' : digest }] };
    else if (req.url === '/api/show') result = { capabilities: ['embedding'], model_info: {
      'general.architecture': 'qwen3', 'qwen3.context_length': 2048, 'qwen3.embedding_length': 1024 } };
    else if (req.url === '/api/embed') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
      requests.push(body);
      if (options.invalidJson) { res.writeHead(200); res.end('{private malformed'); return; }
      if (options.embedFailure) { res.writeHead(500); res.end('{"error":"private diagnostic"}'); return; }
      result = { model: EMBEDDING_MODEL, embeddings: (body['input'] as string[]).map((_, index) => vector(index + 1)) };
    } else { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { client: new OllamaClient(`http://127.0.0.1:${address.port}`, 5000), requests,
    changeDigest: () => { digest = 'b'.repeat(64); } };
}

test('canonical pipeline accepts reproducible complete config and independent runtime revision', () => {
  const config = buildPipelineConfigV1('b'.repeat(40));
  validatePipelineConfigV1(config);
  assert.deepEqual(config, buildPipelineConfigV1('b'.repeat(40)));
  assert.equal(Object.keys(config).length, 10);
});
test('pipeline rejects every missing field, extra secrets/URLs/time and incompatible semantics', () => {
  const complete = buildPipelineConfigV1('b'.repeat(40));
  for (const key of Object.keys(complete)) {
    const partial = { ...complete }; delete partial[key];
    assert.throws(() => validatePipelineConfigV1(partial), DatabaseError);
  }
  for (const extra of ['secret', 'endpoint', 'execution_id', 'timestamp']) {
    assert.throws(() => validatePipelineConfigV1({ ...complete, [extra]: 'private' }), DatabaseError);
  }
  for (const key of ['chunking', 'normalization', 'synthetic_banner', 'pipeline_version']) {
    assert.throws(() => validatePipelineConfigV1({ ...complete, [key]: 'incompatible' }), DatabaseError);
  }
});
test('pipeline rejects invalid implementation revisions', () => {
  for (const bad of ['HEAD', 'test', 'A'.repeat(40), 'a'.repeat(40) + '\n']) assert.throws(() => buildPipelineConfigV1(bad), DatabaseError);
});
test('Ollama valid 1024 response and pgvector parameter literal', () => {
  assert.deepEqual(validateEmbedResponse({ model: EMBEDDING_MODEL, embeddings: [vector()] }, 1), [vector()]);
  assert.deepEqual(JSON.parse(vectorLiteral(vector())), vector());
});
for (const dimension of [0, 1023, 1025]) test(`Ollama rejects dimension ${dimension}`, () => {
  assert.throws(() => validateVectors([Array<number>(dimension).fill(1)], 1), OllamaError);
});
for (const invalid of [NaN, Infinity, -Infinity, '1', null, 1e100]) test(`Ollama rejects invalid component ${String(invalid)}`, () => {
  assert.throws(() => validateVectors([[invalid, ...Array<number>(1023).fill(0)]], 1), OllamaError);
});
test('Ollama rejects count mismatch, zero/float32-underflow vector, wrong model and truncation', () => {
  for (const [vectors, count] of [[[], 1], [[vector()], 2], [[Array<number>(1024).fill(0)], 1], [[vector(1e-100)], 1]] as const) {
    assert.throws(() => validateVectors(vectors, count), OllamaError);
  }
  assert.throws(() => validateEmbedResponse({ model: 'different', embeddings: [vector()] }, 1), OllamaError);
  assert.throws(() => validateEmbedResponse({ truncated: true, embeddings: [vector()] }, 1), OllamaError);
});
test('HTTP fixture verifies batch order, exact text, dimensions and truncate:false', async t => {
  const { client, requests } = await fixture(t);
  const config = await client.inspect();
  assert.equal(config.model_revision, 'a'.repeat(64));
  const inputs = ['Primer  texto\n', 'Segundo e\u0301'];
  assert.deepEqual(await client.embed(inputs, config), [vector(1), vector(2)]);
  assert.deepEqual(requests, [{ model: EMBEDDING_MODEL, input: inputs, dimensions: 1024, truncate: false, options: { num_ctx: 2048 } }]);
  assert.equal(client.embedRequestCount, 1);
});
test('HTTP fixture missing model blocks before any embed call', async t => {
  const { client } = await fixture(t, { missing: true });
  await assert.rejects(client.inspect(), error => error instanceof OllamaError && error.reason === 'model_missing');
  assert.equal(client.embedRequestCount, 0);
});
test('HTTP fixture rejects incomplete model digest', async t => {
  const { client } = await fixture(t, { badDigest: true });
  await assert.rejects(client.inspect(), OllamaError);
});
test('runtime/digest change rejects batch before generation', async t => {
  const { client, changeDigest } = await fixture(t);
  const config = await client.inspect(); changeDigest();
  await assert.rejects(client.embed(['chunk'], config), error => error instanceof OllamaError && error.reason === 'runtime_changed');
  assert.equal(client.embedRequestCount, 0);
});
test('HTTP failure uses safe typed error without native diagnostics', async t => {
  const { client } = await fixture(t, { embedFailure: true });
  await assert.rejects(client.embed(['chunk'], await client.inspect()), error => {
    assert.ok(error instanceof OllamaError);
    assert.deepEqual(error.toJSON(), { code: 'OLLAMA_UNAVAILABLE', reason: 'response' });
    assert.equal(JSON.stringify(error).includes('private'), false); return true;
  });
});
test('Ollama rejects uncontrolled endpoints and unsafe vector literals', () => {
  for (const url of ['https://example.com', 'http://127.0.0.1/private', 'http://user:secret@localhost:11434']) assert.throws(() => new OllamaClient(url), OllamaError);
  assert.throws(() => vectorLiteral([Infinity]), OllamaError);
  assert.throws(() => validateVectors(new Array(1), 1), OllamaError);
  const sparse = new Array<number>(1024); sparse[0] = 1;
  assert.throws(() => vectorLiteral(sparse), OllamaError);
  assert.throws(() => effectiveConfig('TEST_ONLY', 'tag', 2048), OllamaError);
});
test('HTTP malformed JSON is rejected without exposing response text', async t => {
  const { client } = await fixture(t, { invalidJson: true });
  await assert.rejects(client.embed(['chunk'], await client.inspect()), error => {
    assert.ok(error instanceof OllamaError);
    assert.deepEqual(JSON.parse(JSON.stringify(error)), { code: 'INVALID_EMBEDDING', reason: 'response' });
    return true;
  });
});
test('HTTP batch boundary accepts ten and rejects empty or eleven inputs before requests', async t => {
  const { client, requests } = await fixture(t);
  const config = await client.inspect();
  await assert.rejects(client.embed([], config), OllamaError);
  await assert.rejects(client.embed(Array<string>(11).fill('chunk'), config), OllamaError);
  assert.equal(requests.length, 0);
  assert.equal((await client.embed(Array<string>(10).fill('chunk'), config)).length, 10);
  assert.equal(requests.length, 1);
});
