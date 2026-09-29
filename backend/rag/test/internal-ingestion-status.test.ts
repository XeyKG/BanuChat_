import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import {
  DatabaseError,
  IngestionStatusError,
  InternalControlError,
  createInternalIngestionService,
  parseApprovalRegistry,
} from '../src/index.js';
import type {
  ApprovedSourceSnapshot,
  EmbeddingClient,
  InternalIngestionServiceDependencies,
  RuntimeContext,
} from '../src/index.js';

const releaseId = '123e4567-e89b-12d3-a456-426614174000';
const secondReleaseId = '223e4567-e89b-12d3-a456-426614174000';
const runId = '987e6543-e21b-32d3-b456-426614174111';
const revision = 'a'.repeat(40);
const workflowRef = 'workflow:controlled';
const registry = parseApprovalRegistry({
  schema_version: '1', approvals: [{
    approval_ref: 'approval:v1', source_git_revision: revision,
    dataset_key: 'banuchat-synthetic', manifest_sha256: 'b'.repeat(64),
    evidence_ref: 'review:v1', available_at: '2026-09-29T10:30:00-05:00',
  }],
});
const runtime: RuntimeContext = {
  implementation_revision: 'c'.repeat(40), pipeline_version: 'pipeline-v1',
  pipeline_config: { pipeline_version: 'pipeline-v1', implementation_revision: 'c'.repeat(40) },
};
const snapshot = {
  approval: registry.approvals[0]!, source_git_revision: revision,
  manifest_sha256: 'b'.repeat(64),
  validated: { manifest: { dataset_key: 'banuchat-synthetic' } }, derivatives: [],
} as unknown as ApprovedSourceSnapshot;

type Handler = (sql: string, values: unknown[]) => unknown[] | Promise<unknown[]>;

function fakePool(handler: Handler): { pool: Pool; sql: string[] } {
  const sql: string[] = [];
  return {
    pool: { async query(text: string, values: unknown[] = []) {
      sql.push(text);
      if (/\b(?:INSERT|UPDATE|DELETE|CALL)\b/i.test(text)) throw new Error('mutating SQL');
      return { rows: await handler(text, values), rowCount: 0 };
    } } as unknown as Pool,
    sql,
  };
}

function row(releaseStatus: string, runStatus: string, current = false) {
  return {
    release_id: releaseId, release_status: releaseStatus, run_id: runId,
    run_status: runStatus, attempt_no: 2, workflow_ref: workflowRef,
    current_release_id: current ? releaseId : secondReleaseId,
    source_git_revision: revision, manifest_sha256: 'd'.repeat(64),
    pipeline_sha256: 'e'.repeat(64), embedding_config_id: 'embedding-1',
    embedding_config_sha256: 'f'.repeat(64),
  };
}

function responses(statusRow: ReturnType<typeof row> | null, held = true): Handler {
  return (sql) => {
    if (sql.includes('status:run') || sql.includes('status:release')) return statusRow ? [statusRow] : [];
    if (sql.includes('status:item-counts')) return [{ pending: '1', processed: '72', skipped: '2', failed: '1' }];
    if (sql.includes('status:writer-lock')) return [{ held }];
    throw new Error('unexpected query');
  };
}

function service(pool: Pool, prepareCalls = { count: 0 }, replacements = {}) {
  const noMutation: InternalIngestionServiceDependencies = {
    async prepareApprovedSource() { prepareCalls.count++; return snapshot; },
    async ingestApprovedCandidate() { throw new Error('ingest called'); },
    async retryFailedCandidate() { throw new Error('retry called'); },
    async recoverOrphanedAttempt() { throw new Error('recover called'); },
  };
  return createInternalIngestionService({
    registry, runtime, sourceCheckoutRoot: 'controlled-source', workflowRef, pool,
    embeddingClient: {
      async inspect() { throw new Error('Ollama called'); },
      async embed() { throw new Error('Ollama called'); },
    } satisfies EmbeddingClient,
  }, { ...noMutation, ...replacements });
}

test('running run derives recovery only from observed writer lease and includes counts', async () => {
  for (const held of [true, false]) {
    const { pool } = fakePool(responses(row('staging', 'running'), held));
    const result = await service(pool).status({ run_id: runId });
    assert.equal(result.outcome, 'running');
    assert.equal(result.recovery_required, !held);
    assert.deepEqual(result.item_counts, { pending: 1, processed: 72, skipped: 2, failed: 1 });
  }
});

test('run selector follows terminal run status regardless of current release', async () => {
  for (const runStatus of ['failed', 'succeeded'] as const) {
    const { pool } = fakePool(responses(row(runStatus === 'failed' ? 'failed' : 'ready', runStatus, true)));
    const result = await service(pool).status({ run_id: runId });
    assert.equal(result.outcome, runStatus);
    assert.equal(result.recovery_required, false);
  }
});

test('release selector resolves ready current, ready historical, failed and staging', async () => {
  const cases = [
    [row('ready', 'succeeded', true), 'already_current'],
    [row('ready', 'succeeded', false), 'already_ready_not_current'],
    [row('failed', 'failed'), 'failed'],
    [row('staging', 'running'), 'running'],
  ] as const;
  for (const [statusRow, outcome] of cases) {
    const { pool } = fakePool(responses(statusRow, true));
    assert.equal((await service(pool).status({ release_id: releaseId })).outcome, outcome);
  }
});

test('identity selector returns not_started for zero and resolves exactly one release', async () => {
  const prepareCalls = { count: 0 };
  const zero = fakePool((sql) => sql.includes('status:identity') ? [] : responses(null)(sql, []));
  const notStarted = await service(zero.pool, prepareCalls).status({
    approval_ref: 'approval:v1', source_git_revision: revision, pipeline_version: runtime.pipeline_version,
  });
  assert.deepEqual(notStarted, {
    outcome: 'not_started', release_id: null, run_id: null, attempt_no: null,
    workflow_ref: null, recovery_required: false, source_git_revision: null,
    manifest_sha256: null, pipeline_sha256: null, embedding_config_id: null,
    embedding_config_sha256: null, item_counts: null,
  });

  const one = fakePool((sql) => {
    if (sql.includes('status:identity')) return [{ id: releaseId }];
    return responses(row('ready', 'succeeded', true))(sql, []);
  });
  assert.equal((await service(one.pool, prepareCalls).status({
    approval_ref: 'approval:v1', source_git_revision: revision, pipeline_version: runtime.pipeline_version,
    workflow_ref: workflowRef,
  })).outcome, 'already_current');
  assert.equal(prepareCalls.count, 2);
});

test('ambiguous identity rejects without selecting latest or querying a release', async () => {
  const { pool, sql } = fakePool((text) => text.includes('status:identity')
    ? [{ id: releaseId }, { id: secondReleaseId }] : []);
  await assert.rejects(service(pool).status({
    approval_ref: 'approval:v1', source_git_revision: revision, pipeline_version: runtime.pipeline_version,
  }), (error) => error instanceof IngestionStatusError && error.reason === 'ambiguous_identity');
  assert.equal(sql.some((text) => text.includes('status:release')), false);
});

test('unknown explicit selectors and inconsistent state are safe status errors', async () => {
  const unknown = fakePool(responses(null));
  await assert.rejects(service(unknown.pool).status({ run_id: runId }),
    (error) => error instanceof IngestionStatusError && error.reason === 'run_not_found');
  await assert.rejects(service(unknown.pool).status({ release_id: releaseId }),
    (error) => error instanceof IngestionStatusError && error.reason === 'release_not_found');
  const inconsistent = fakePool(responses(row('staging', 'failed')));
  await assert.rejects(service(inconsistent.pool).status({ release_id: releaseId }),
    (error) => error instanceof IngestionStatusError && error.reason === 'state_inconsistent');
});

test('optional workflow is allowed but mismatches and pipeline mismatch stop before source or DB', async () => {
  const { pool, sql } = fakePool(responses(row('ready', 'succeeded')));
  await service(pool).status({ release_id: releaseId });
  const calls = { count: 0 };
  await assert.rejects(service(pool, calls).status({ release_id: releaseId, workflow_ref: 'other' }),
    (error) => error instanceof InternalControlError && error.reason === 'workflow_mismatch');
  await assert.rejects(service(pool, calls).status({
    approval_ref: 'approval:v1', source_git_revision: revision, pipeline_version: 'other',
  }), (error) => error instanceof InternalControlError && error.reason === 'pipeline_mismatch');
  assert.equal(calls.count, 0);
  assert.equal(sql.filter((text) => text.includes('status:release')).length, 1);
});

test('status performs only read queries and never calls mutation cores or Ollama', async () => {
  const { pool, sql } = fakePool(responses(row('ready', 'succeeded')));
  await service(pool).status({ release_id: releaseId });
  assert.ok(sql.length > 0);
  assert.ok(sql.every((text) => /^\s*(?:\/\*[\s\S]*?\*\/\s*)?SELECT\b/i.test(text)));
});

test('status error serialization is allowlisted and database failures remain DatabaseError', async () => {
  const serialized = JSON.parse(JSON.stringify(
    new IngestionStatusError('release_not_found'),
  )) as Record<string, unknown>;
  assert.deepEqual(serialized, { error_code: 'STATUS_REJECTED', reason: 'release_not_found' });
  assert.equal('stack' in serialized, false);
  assert.equal('release_id' in serialized, false);
  const { pool } = fakePool(() => { throw Object.assign(new Error('private db message'), { code: 'ECONNREFUSED' }); });
  await assert.rejects(service(pool).status({ release_id: releaseId }),
    (error) => error instanceof DatabaseError && error.code === 'DATABASE_UNAVAILABLE');
});

