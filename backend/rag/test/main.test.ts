import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import type { Server } from 'node:http';
import type { Pool, PoolConfig } from 'pg';

import { startInternalIngestionService } from '../src/main.js';
import type { InternalIngestionMainDependencies,
  InternalIngestionMainRuntime } from '../src/main.js';
import type { ApprovalRegistryV1, InternalIngestionService,
  RuntimeContext } from '../src/index.js';
import type { EmbeddingClient } from '../src/ollama/types.js';

const executeFile = promisify(execFile);

const config = {
  approvalRegistryPath: 'C:\\approvals.json',
  runtimeCheckoutRoot: 'C:\\runtime',
  sourceCheckoutRoot: 'C:\\source',
  workflowRef: 'workflow:test:v1',
  databaseUrl: 'postgresql://private/banuchat',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  serviceToken: 't'.repeat(32),
};
const registry = { version: 1, approvals: [] } as unknown as ApprovalRegistryV1;
const provenance: RuntimeContext = {
  implementation_revision: 'a'.repeat(40),
  pipeline_version: 'pipeline:test:v1',
  pipeline_config: {},
};
const embeddingClient = {} as EmbeddingClient;

interface Fixture {
  dependencies: InternalIngestionMainDependencies;
  runtime: InternalIngestionMainRuntime;
  events: string[];
  poolOptions: PoolConfig[];
  listenCalls: Array<{ port: number; host: string }>;
  signalListeners: Map<string, () => void>;
  poolEndCalls: number;
  serverCloseCalls: number;
  ingestionCalls: number;
  exitCode: number | undefined;
  errors: string[];
  logs: string[];
  failQuery: boolean;
}

function createFixture(): Fixture {
  const events: string[] = [];
  const poolOptions: PoolConfig[] = [];
  const listenCalls: Array<{ port: number; host: string }> = [];
  const signalListeners = new Map<string, () => void>();
  const errors: string[] = [];
  const logs: string[] = [];
  const fixture = {
    events, poolOptions, listenCalls, signalListeners, errors, logs,
    poolEndCalls: 0,
    serverCloseCalls: 0,
    ingestionCalls: 0,
    exitCode: undefined,
    failQuery: false,
  } as Fixture;

  const pool = {
    async query(sql: string) {
      events.push(`query:${sql}`);
      if (fixture.failQuery) throw new Error('private database detail');
      return { rows: [{ ok: 1 }] };
    },
    async end() {
      events.push('pool.end');
      fixture.poolEndCalls++;
    },
  } as unknown as Pool;

  const service = {
    async execute() { fixture.ingestionCalls++; throw new Error('unexpected execute'); },
    async retry() { fixture.ingestionCalls++; throw new Error('unexpected retry'); },
    async recover() { fixture.ingestionCalls++; throw new Error('unexpected recover'); },
    async status() { fixture.ingestionCalls++; throw new Error('unexpected status'); },
  } as InternalIngestionService;

  const emitter = new EventEmitter();
  let listening = false;
  const server = emitter as unknown as Server;
  Object.defineProperty(server, 'listening', { get: () => listening });
  Object.assign(server, {
    listen(port: number, host: string, callback: () => void) {
      events.push('listen');
      listenCalls.push({ port, host });
      listening = true;
      callback();
      return server;
    },
    close(callback: (error?: Error) => void) {
      events.push('server.close');
      fixture.serverCloseCalls++;
      listening = false;
      callback();
      return server;
    },
  });

  fixture.dependencies = {
    parseEnvironment(env) {
      events.push('config');
      assert.equal(env, fixture.runtime.env);
      return config;
    },
    async loadRegistry(filePath) {
      events.push('registry');
      assert.equal(filePath, config.approvalRegistryPath);
      return registry;
    },
    async prepareRuntime(options) {
      events.push('runtime');
      assert.deepEqual(options, { runtimeCheckoutRoot: config.runtimeCheckoutRoot });
      return provenance;
    },
    createPool(options) {
      events.push('pool');
      poolOptions.push(options);
      return pool;
    },
    createEmbeddingClient(baseUrl) {
      events.push('ollama');
      assert.equal(baseUrl, config.ollamaBaseUrl);
      return embeddingClient;
    },
    createService(options) {
      events.push('service');
      assert.deepEqual(options, {
        registry,
        runtime: provenance,
        sourceCheckoutRoot: config.sourceCheckoutRoot,
        workflowRef: config.workflowRef,
        pool,
        embeddingClient,
      });
      return service;
    },
    createHttpServer(options) {
      events.push('server');
      assert.deepEqual(options, { service, serviceToken: config.serviceToken });
      return server;
    },
  };
  fixture.runtime = {
    env: { BANUCHAT_TEST: 'isolated' },
    onSignal(signal, listener) { signalListeners.set(signal, listener); },
    log(message) { logs.push(message); },
    error(message) { errors.push(message); },
    fail() { fixture.exitCode = 1; },
  };
  return fixture;
}

test('composes dependencies in order, checks PostgreSQL before fixed listener, and does not ingest', async () => {
  const fixture = createFixture();
  const processHandle = await startInternalIngestionService(fixture.dependencies, fixture.runtime);

  assert.ok(processHandle);
  assert.deepEqual(fixture.events, [
    'config', 'registry', 'runtime', 'pool', 'query:SELECT 1 AS ok',
    'ollama', 'service', 'server', 'listen',
  ]);
  assert.deepEqual(fixture.poolOptions, [{
    connectionString: config.databaseUrl,
    max: 3,
    connectionTimeoutMillis: 5000,
  }]);
  assert.deepEqual(fixture.listenCalls, [{ host: '127.0.0.1', port: 3010 }]);
  assert.deepEqual(fixture.logs, [
    'BanuChat ingestion service listening on http://127.0.0.1:3010',
  ]);
  assert.equal(fixture.ingestionCalls, 0);
  await processHandle.shutdown();
});

test('failure before listen closes the Pool and emits only the safe startup error', async () => {
  const fixture = createFixture();
  fixture.failQuery = true;

  const processHandle = await startInternalIngestionService(fixture.dependencies, fixture.runtime);

  assert.equal(processHandle, undefined);
  assert.equal(fixture.poolEndCalls, 1);
  assert.equal(fixture.listenCalls.length, 0);
  assert.equal(fixture.exitCode, 1);
  assert.deepEqual(fixture.logs, []);
  assert.deepEqual(fixture.errors, ['BanuChat ingestion service failed to start']);
  assert.equal(fixture.errors.join(' ').includes('private database detail'), false);
});

test('shutdown closes the HTTP server and Pool only once', async () => {
  const fixture = createFixture();
  const processHandle = await startInternalIngestionService(fixture.dependencies, fixture.runtime);
  assert.ok(processHandle);

  await Promise.all([
    processHandle.shutdown(),
    processHandle.shutdown(),
    processHandle.shutdown(),
  ]);
  fixture.signalListeners.get('SIGINT')?.();
  fixture.signalListeners.get('SIGTERM')?.();
  await processHandle.shutdown();

  assert.equal(fixture.serverCloseCalls, 1);
  assert.equal(fixture.poolEndCalls, 1);
  assert.deepEqual([...fixture.signalListeners.keys()], ['SIGINT', 'SIGTERM']);
});

test('importing main does not start the service', async () => {
  const ragRoot = path.resolve(import.meta.dirname, '..');
  const result = await executeFile(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', "await import('./src/main.ts')",
  ], { cwd: ragRoot, windowsHide: true });

  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});
