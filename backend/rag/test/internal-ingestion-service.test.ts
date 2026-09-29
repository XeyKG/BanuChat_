import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import {
  InternalControlError,
  createInternalIngestionService,
  parseApprovalRegistry,
} from '../src/index.js';
import type {
  ApprovedSourceSnapshot,
  EmbeddingClient,
  ExecuteRequest,
  InternalIngestionServiceDependencies,
  RecoverRequest,
  RetryRequest,
  RuntimeContext,
} from '../src/index.js';

const revision = 'a'.repeat(40);
const runtimeRevision = 'b'.repeat(40);
const workflowRef = 'workflow:controlled';
const releaseId = '123e4567-e89b-12d3-a456-426614174000';
const runId = '987e6543-e21b-32d3-b456-426614174111';
const registry = parseApprovalRegistry({
  schema_version: '1',
  approvals: [{
    approval_ref: 'approval:v1',
    source_git_revision: revision,
    dataset_key: 'banuchat-synthetic',
    manifest_sha256: 'c'.repeat(64),
    evidence_ref: 'human-review:v1',
    available_at: '2026-09-29T10:30:00-05:00',
  }],
});
const runtime: RuntimeContext = {
  implementation_revision: runtimeRevision,
  pipeline_version: 'synthetic-v1-section-v1',
  pipeline_config: {
    pipeline_version: 'synthetic-v1-section-v1', implementation_revision: runtimeRevision,
  },
};
const pool = {} as Pool;
const embeddingClient = {
  async inspect() { throw new Error('embedding client must not run in unit service tests'); },
  async embed() { throw new Error('embedding client must not run in unit service tests'); },
} satisfies EmbeddingClient;
const snapshot = {
  approval: registry.approvals[0]!,
  source_git_revision: revision,
  manifest_sha256: 'c'.repeat(64),
  validated: {
    manifest: { dataset_key: 'banuchat-synthetic', items: [] },
    catalogs: {}, bytes: new Map(), summary: {},
  },
  derivatives: [],
} as unknown as ApprovedSourceSnapshot;
const executeRequest: ExecuteRequest = {
  approval_ref: 'approval:v1',
  source_git_revision: revision,
  pipeline_version: runtime.pipeline_version,
  workflow_ref: workflowRef,
};
const retryRequest: RetryRequest = { ...executeRequest, release_id: releaseId };
const recoverRequest: RecoverRequest = { release_id: releaseId, run_id: runId, workflow_ref: workflowRef };

interface Calls {
  source: unknown[][];
  ingest: unknown[][];
  retry: unknown[][];
  recover: unknown[][];
}

function fixture(overrides: Partial<InternalIngestionServiceDependencies> = {}) {
  const calls: Calls = { source: [], ingest: [], retry: [], recover: [] };
  const dependencies: InternalIngestionServiceDependencies = {
    async prepareApprovedSource(options) {
      calls.source.push([options]);
      return snapshot;
    },
    async ingestApprovedCandidate(...args) {
      calls.ingest.push(args);
      return { outcome: 'published', release_id: releaseId, run_id: runId, embeddings: 60 };
    },
    async retryFailedCandidate(...args) {
      calls.retry.push(args);
      return { outcome: 'published', release_id: args[2], run_id: runId, embeddings: 60 };
    },
    async recoverOrphanedAttempt(...args) {
      calls.recover.push(args);
    },
    ...overrides,
  };
  const service = createInternalIngestionService({
    registry, runtime, sourceCheckoutRoot: 'controlled-source-root', workflowRef,
    pool, embeddingClient,
  }, dependencies);
  return { service, calls };
}

function controlFailure(reason: InternalControlError['reason']): (error: unknown) => boolean {
  return (error) => error instanceof InternalControlError
    && error.code === 'CONTROL_REJECTED'
    && error.reason === reason;
}

test('execute prepares once and ingests only accredited controlled input', async () => {
  const { service, calls } = fixture();
  const before = structuredClone(executeRequest);
  await service.execute(executeRequest);
  assert.equal(calls.source.length, 1);
  assert.equal(calls.ingest.length, 1);
  assert.equal(calls.retry.length, 0);
  assert.equal(calls.recover.length, 0);
  const input = calls.ingest[0]?.[2] as Record<string, unknown>;
  assert.equal(input['sourceGitRevision'], snapshot.source_git_revision);
  assert.equal(input['implementationRevision'], runtime.implementation_revision);
  assert.equal(input['workflowRef'], workflowRef);
  assert.equal(input['validated'], snapshot.validated);
  assert.equal(input['derivatives'], snapshot.derivatives);
  assert.deepEqual(executeRequest, before);
});

test('retry preserves release id and uses accredited input without execute or recover', async () => {
  const { service, calls } = fixture();
  const before = structuredClone(retryRequest);
  await service.retry(retryRequest);
  assert.equal(calls.source.length, 1);
  assert.equal(calls.retry.length, 1);
  assert.equal(calls.retry[0]?.[2], releaseId);
  const input = calls.retry[0]?.[3] as Record<string, unknown>;
  assert.equal(input['sourceGitRevision'], snapshot.source_git_revision);
  assert.equal(input['implementationRevision'], runtime.implementation_revision);
  assert.equal(input['workflowRef'], workflowRef);
  assert.equal(calls.ingest.length, 0);
  assert.equal(calls.recover.length, 0);
  assert.deepEqual(retryRequest, before);
});

test('recover calls only explicit recovery without source or embedding use', async () => {
  const { service, calls } = fixture();
  const before = structuredClone(recoverRequest);
  await service.recover(recoverRequest);
  assert.deepEqual(calls.recover[0], [pool, releaseId, runId]);
  assert.equal(calls.source.length, 0);
  assert.equal(calls.ingest.length, 0);
  assert.equal(calls.retry.length, 0);
  assert.deepEqual(recoverRequest, before);
});

test('workflow mismatch rejects before every downstream operation', async () => {
  for (const invoke of [
    (service: ReturnType<typeof fixture>['service']) => service.execute({ ...executeRequest, workflow_ref: 'other' }),
    (service: ReturnType<typeof fixture>['service']) => service.retry({ ...retryRequest, workflow_ref: 'other' }),
    (service: ReturnType<typeof fixture>['service']) => service.recover({ ...recoverRequest, workflow_ref: 'other' }),
  ]) {
    const { service, calls } = fixture();
    await assert.rejects(invoke(service), controlFailure('workflow_mismatch'));
    assert.deepEqual(calls, { source: [], ingest: [], retry: [], recover: [] });
  }
});

test('pipeline mismatch rejects execute and retry before source or core', async () => {
  for (const invoke of [
    (service: ReturnType<typeof fixture>['service']) => service.execute({ ...executeRequest, pipeline_version: 'other' }),
    (service: ReturnType<typeof fixture>['service']) => service.retry({ ...retryRequest, pipeline_version: 'other' }),
  ]) {
    const { service, calls } = fixture();
    await assert.rejects(invoke(service), controlFailure('pipeline_mismatch'));
    assert.deepEqual(calls, { source: [], ingest: [], retry: [], recover: [] });
  }
});

test('source and core errors propagate without control-error conversion', async () => {
  const sourceError = new Error('source sentinel');
  const sourceFixture = fixture({
    async prepareApprovedSource() { throw sourceError; },
  });
  await assert.rejects(sourceFixture.service.execute(executeRequest), (error) => error === sourceError);
  assert.equal(sourceFixture.calls.ingest.length, 0);

  const coreError = new Error('core sentinel');
  const coreFixture = fixture({
    async ingestApprovedCandidate() { throw coreError; },
  });
  await assert.rejects(coreFixture.service.execute(executeRequest), (error) => error === coreError);
});

test('control error serialization exposes only allowlisted code and reason', () => {
  const serialized = JSON.parse(JSON.stringify(
    new InternalControlError('pipeline_mismatch'),
  )) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    error_code: 'CONTROL_REJECTED', reason: 'pipeline_mismatch',
  });
  assert.equal('stack' in serialized, false);
  assert.equal('message' in serialized, false);
  assert.equal('expected' in serialized, false);
  assert.equal('received' in serialized, false);
});

