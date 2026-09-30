import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import {
  ApprovalRegistryError,
  DatabaseError,
  IngestionStatusError,
  InternalControlError,
  INTERNAL_HTTP_BODY_LIMIT,
  OllamaError,
  createInternalIngestionHttpServer,
} from '../src/index.js';
import type { InternalIngestionService, IngestionStatus } from '../src/index.js';

const token = 'test-service-token-with-at-least-32-characters';
const releaseId = '123e4567-e89b-12d3-a456-426614174000';
const runId = '987e6543-e21b-32d3-b456-426614174111';
const revision = 'a'.repeat(40);
const executeBody = {
  approval_ref: 'approval:v1', source_git_revision: revision,
  pipeline_version: 'pipeline-v1', workflow_ref: 'workflow:v1',
};
const statusResult: IngestionStatus = {
  outcome: 'not_started', release_id: null, run_id: null, attempt_no: null,
  workflow_ref: null, recovery_required: false, source_git_revision: null,
  manifest_sha256: null, pipeline_sha256: null, embedding_config_id: null,
  embedding_config_sha256: null, item_counts: null,
};

interface Calls { execute: number; retry: number; recover: number; status: number }

function fakeService(errors: Partial<Record<keyof Calls, Error>> = {}): {
  service: InternalIngestionService; calls: Calls;
} {
  const calls: Calls = { execute: 0, retry: 0, recover: 0, status: 0 };
  return {
    calls,
    service: {
      async execute() {
        calls.execute++;
        if (errors.execute) throw errors.execute;
        return { outcome: 'published', release_id: releaseId, run_id: runId, embeddings: 60 };
      },
      async retry() {
        calls.retry++;
        if (errors.retry) throw errors.retry;
        return { outcome: 'published', release_id: releaseId, run_id: runId, embeddings: 60 };
      },
      async recover() {
        calls.recover++;
        if (errors.recover) throw errors.recover;
      },
      async status() {
        calls.status++;
        if (errors.status) throw errors.status;
        return statusResult;
      },
    },
  };
}

interface Response {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  rawBody: string;
}

async function withServer<T>(service: InternalIngestionService, work: (port: number) => Promise<T>): Promise<T> {
  const server = createInternalIngestionHttpServer({ service, serviceToken: token });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  try {
    return await work((server.address() as AddressInfo).port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function post(port: number, path: string, body: string | Buffer, options: {
  authorization?: string | string[] | false;
  contentType?: string;
  method?: string;
} = {}): Promise<Response> {
  const headers: Record<string, string | string[] | number> = {
    'Content-Type': options.contentType ?? 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  };
  if (options.authorization !== false) headers['Authorization'] = options.authorization ?? `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path,
      method: options.method ?? 'POST', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode ?? 0, headers: res.headers,
          body: JSON.parse(rawBody) as Record<string, unknown>, rawBody });
      });
    });
    req.once('error', reject);
    req.end(body);
  });
}

test('authenticated execute, retry, recover and status return safe 200 responses', async () => {
  const fixture = fakeService();
  await withServer(fixture.service, async (port) => {
    const execute = await post(port, '/internal/ingestion/execute', JSON.stringify(executeBody));
    assert.equal(execute.status, 200);
    assert.deepEqual(execute.body, { outcome: 'published', release_id: releaseId, run_id: runId, embeddings: 60 });
    assert.equal((await post(port, '/internal/ingestion/retry', JSON.stringify({
      ...executeBody, release_id: releaseId,
    }))).status, 200);
    const recovered = await post(port, '/internal/ingestion/recover', JSON.stringify({
      release_id: releaseId, run_id: runId, workflow_ref: 'workflow:v1',
    }));
    assert.deepEqual(recovered.body, { outcome: 'recovered', release_id: releaseId, run_id: runId });
    assert.deepEqual((await post(port, '/internal/ingestion/status', JSON.stringify({ run_id: runId }))).body,
      statusResult);
  });
  assert.deepEqual(fixture.calls, { execute: 1, retry: 1, recover: 1, status: 1 });
});

test('route and method are resolved before generic authentication', async () => {
  const fixture = fakeService();
  await withServer(fixture.service, async (port) => {
    assert.equal((await post(port, '/unknown', '{}')).status, 404);
    const method = await post(port, '/internal/ingestion/status', '{}', { method: 'GET' });
    assert.equal(method.status, 405);
    assert.equal(method.headers['allow'], 'POST');
  });
  assert.deepEqual(fixture.calls, { execute: 0, retry: 0, recover: 0, status: 0 });
});

test('missing, malformed and wrong credentials share one 401 and activate no service', async () => {
  const fixture = fakeService();
  await withServer(fixture.service, async (port) => {
    const invalidCredentials: Array<string | string[] | false> = [
      false, 'Basic abc', 'Bearer wrong-token', [`Bearer ${token}`, `Bearer ${token}`],
    ];
    for (const authorization of invalidCredentials) {
      const response = await post(port, '/internal/ingestion/execute', '{broken', { authorization });
      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { error_code: 'UNAUTHORIZED', retryable: false });
    }
  });
  assert.deepEqual(fixture.calls, { execute: 0, retry: 0, recover: 0, status: 0 });
});

test('content type, malformed JSON, empty body, excess bytes and extra fields are rejected', async () => {
  const fixture = fakeService();
  await withServer(fixture.service, async (port) => {
    assert.equal((await post(port, '/internal/ingestion/execute', '{}', { contentType: 'text/plain' })).status, 415);
    assert.equal((await post(port, '/internal/ingestion/execute', '{broken')).status, 400);
    assert.equal((await post(port, '/internal/ingestion/execute', '')).status, 400);
    assert.equal((await post(port, '/internal/ingestion/execute', Buffer.from([0xff]))).status, 400);
    assert.equal((await post(port, '/internal/ingestion/execute',
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}')]))).status, 400);
    assert.equal((await post(port, '/internal/ingestion/execute', Buffer.alloc(INTERNAL_HTTP_BODY_LIMIT + 1, 0x20))).status, 413);
    assert.equal((await post(port, '/internal/ingestion/execute', JSON.stringify({ ...executeBody, path: 'private' }))).status, 400);
  });
  assert.deepEqual(fixture.calls, { execute: 0, retry: 0, recover: 0, status: 0 });
});

test('known operational errors map explicitly to 409 or retryable 503', async () => {
  const cases: Array<[Error, number, boolean]> = [
    [new InternalControlError('workflow_mismatch'), 409, false],
    [new ApprovalRegistryError('revision_mismatch'), 409, false],
    [new DatabaseError('DATABASE_CONFLICT'), 409, false],
    [new IngestionStatusError('state_inconsistent'), 409, false],
    [new DatabaseError('DATABASE_UNAVAILABLE'), 503, true],
    [new OllamaError('OLLAMA_UNAVAILABLE', 'transport'), 503, true],
  ];
  for (const [error, expectedStatus, retryable] of cases) {
    const fixture = fakeService({ execute: error });
    await withServer(fixture.service, async (port) => {
      const response = await post(port, '/internal/ingestion/execute', JSON.stringify(executeBody));
      assert.equal(response.status, expectedStatus);
      assert.equal(response.body['retryable'], retryable);
      assert.equal('message' in response.body, false);
    });
    assert.equal(fixture.calls.execute, 1);
  }
});

test('unknown errors are generic and every JSON response has secure headers without CORS', async () => {
  const fixture = fakeService({ execute: new Error(`private ${token} ${JSON.stringify(executeBody)}`) });
  await withServer(fixture.service, async (port) => {
    const response = await post(port, '/internal/ingestion/execute', JSON.stringify(executeBody));
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error_code: 'INTERNAL_ERROR', retryable: false });
    assert.equal(response.rawBody.includes(token), false);
    assert.equal(response.rawBody.includes('approval:v1'), false);
    assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });
  assert.equal(fixture.calls.execute, 1);
});

test('client disconnect after execution starts does not cancel or duplicate service work', async () => {
  let finish!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const finishPromise = new Promise<void>((resolve) => { finish = resolve; });
  const fixture = fakeService();
  fixture.service.execute = async () => {
    fixture.calls.execute++;
    started();
    await finishPromise;
    return { outcome: 'published', release_id: releaseId, run_id: runId, embeddings: 60 };
  };
  await withServer(fixture.service, async (port) => {
    const req = httpRequest({ host: '127.0.0.1', port, path: '/internal/ingestion/execute', method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(executeBody)) } });
    req.on('error', () => { /* Expected client-side disconnect. */ });
    req.end(JSON.stringify(executeBody));
    await startedPromise;
    req.destroy();
    finish();
    await new Promise((resolve) => setImmediate(resolve));
  });
  assert.equal(fixture.calls.execute, 1);
});
