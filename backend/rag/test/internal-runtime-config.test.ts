import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { InternalRuntimeConfigError,
  parseInternalIngestionEnvironment } from '../src/index.js';

const KEYS = [
  'BANUCHAT_INGESTION_APPROVAL_REGISTRY_PATH',
  'BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT',
  'BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT',
  'BANUCHAT_INGESTION_WORKFLOW_REF',
  'BANUCHAT_INGESTION_DATABASE_URL',
  'BANUCHAT_INGESTION_OLLAMA_BASE_URL',
  'BANUCHAT_INGESTION_SERVICE_TOKEN',
] as const;

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    BANUCHAT_INGESTION_APPROVAL_REGISTRY_PATH: path.resolve('test-fixtures', 'approvals.json'),
    BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT: path.resolve('test-fixtures', 'runtime'),
    BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT: path.resolve('test-fixtures', 'source'),
    BANUCHAT_INGESTION_WORKFLOW_REF: 'workflow:test:v1',
    BANUCHAT_INGESTION_DATABASE_URL: 'postgresql://localhost/banuchat',
    BANUCHAT_INGESTION_OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    BANUCHAT_INGESTION_SERVICE_TOKEN: 'a'.repeat(32),
  };
}

function expectReason(env: NodeJS.ProcessEnv, reason: string): void {
  assert.throws(
    () => parseInternalIngestionEnvironment(env),
    (error: unknown) => error instanceof InternalRuntimeConfigError && error.reason === reason,
  );
}

test('accepts a valid environment and preserves every value exactly', () => {
  const env = validEnvironment();
  env.BANUCHAT_UNUSED = 'ignored';
  const result = parseInternalIngestionEnvironment(env);

  assert.deepEqual(result, {
    approvalRegistryPath: env.BANUCHAT_INGESTION_APPROVAL_REGISTRY_PATH,
    runtimeCheckoutRoot: env.BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT,
    sourceCheckoutRoot: env.BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT,
    workflowRef: env.BANUCHAT_INGESTION_WORKFLOW_REF,
    databaseUrl: env.BANUCHAT_INGESTION_DATABASE_URL,
    ollamaBaseUrl: env.BANUCHAT_INGESTION_OLLAMA_BASE_URL,
    serviceToken: env.BANUCHAT_INGESTION_SERVICE_TOKEN,
  });
  assert.equal('BANUCHAT_UNUSED' in result, false);
});

test('rejects each missing required variable', () => {
  for (const key of KEYS) {
    const env = validEnvironment();
    delete env[key];
    expectReason(env, 'missing_value');
  }
});

test('rejects empty and whitespace-only values', () => {
  for (const value of ['', ' \t\r\n ']) {
    const env = validEnvironment();
    env.BANUCHAT_INGESTION_WORKFLOW_REF = value;
    expectReason(env, 'invalid_value');
  }
});

test('rejects a relative approval registry path', () => {
  const env = validEnvironment();
  env.BANUCHAT_INGESTION_APPROVAL_REGISTRY_PATH = path.join('config', 'approvals.json');
  expectReason(env, 'invalid_path');
});

test('rejects a relative runtime checkout path', () => {
  const env = validEnvironment();
  env.BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT = 'runtime';
  expectReason(env, 'invalid_path');
});

test('rejects a relative source checkout path', () => {
  const env = validEnvironment();
  env.BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT = 'source';
  expectReason(env, 'invalid_path');
});

test('rejects textually equal runtime and source checkout paths', () => {
  const env = validEnvironment();
  env.BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT = env.BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT;
  expectReason(env, 'paths_not_separated');
});

test('accepts exactly 32 token characters and rejects a shorter token', () => {
  const exact = validEnvironment();
  exact.BANUCHAT_INGESTION_SERVICE_TOKEN = 't'.repeat(32);
  assert.equal(parseInternalIngestionEnvironment(exact).serviceToken, 't'.repeat(32));

  const short = validEnvironment();
  short.BANUCHAT_INGESTION_SERVICE_TOKEN = 't'.repeat(31);
  expectReason(short, 'invalid_value');
});

test('rejects service tokens containing whitespace without normalizing them', () => {
  const invalidTokens = [
    ` ${'a'.repeat(32)}`,
    `${'a'.repeat(32)} `,
    `${'a'.repeat(16)} ${'a'.repeat(16)}`,
    `${'a'.repeat(16)}\t${'a'.repeat(15)}`,
    `${'a'.repeat(16)}\n${'a'.repeat(15)}`,
  ];

  for (const serviceToken of invalidTokens) {
    const env = validEnvironment();
    env.BANUCHAT_INGESTION_SERVICE_TOKEN = serviceToken;
    expectReason(env, 'invalid_value');
  }
});

test('accepts postgresql and postgres database URL protocols', () => {
  for (const databaseUrl of ['postgresql://db.example/banuchat', 'postgres://localhost']) {
    const env = validEnvironment();
    env.BANUCHAT_INGESTION_DATABASE_URL = databaseUrl;
    assert.equal(parseInternalIngestionEnvironment(env).databaseUrl, databaseUrl);
  }
});

test('rejects malformed, unsupported, and hostless database URLs', () => {
  for (const databaseUrl of ['not-a-url', 'mysql://localhost/banuchat', 'postgresql:///banuchat']) {
    const env = validEnvironment();
    env.BANUCHAT_INGESTION_DATABASE_URL = databaseUrl;
    expectReason(env, 'invalid_database_url');
  }
});

test('accepts an HTTP Ollama URL and rejects malformed or HTTPS URLs', () => {
  const valid = validEnvironment();
  valid.BANUCHAT_INGESTION_OLLAMA_BASE_URL = 'http://ollama.internal:11434';
  assert.equal(parseInternalIngestionEnvironment(valid).ollamaBaseUrl,
    'http://ollama.internal:11434');

  for (const ollamaUrl of ['not-a-url', 'https://ollama.internal:11434', 'http://']) {
    const env = validEnvironment();
    env.BANUCHAT_INGESTION_OLLAMA_BASE_URL = ollamaUrl;
    expectReason(env, 'invalid_ollama_url');
  }
});

test('serializes errors without configuration values or native details', () => {
  const secret = `super-secret-token-value ${'x'.repeat(32)}`;
  const env = validEnvironment();
  env.BANUCHAT_INGESTION_SERVICE_TOKEN = secret;

  let caught: unknown;
  try {
    parseInternalIngestionEnvironment(env);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof InternalRuntimeConfigError);
  const serialized = JSON.stringify(caught);
  assert.deepEqual(caught.toJSON(), {
    error_code: 'CONFIG_REJECTED',
    reason: 'invalid_value',
  });
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes('BANUCHAT_INGESTION_SERVICE_TOKEN'), false);
  assert.equal(serialized.includes('stack'), false);
});
