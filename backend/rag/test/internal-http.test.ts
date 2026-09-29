import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  InternalRequestError,
  parseExecuteRequest,
  parseRecoverRequest,
  parseRetryRequest,
  parseStatusRequest,
} from '../src/index.js';

const revision = 'a'.repeat(40);
const releaseId = '123e4567-e89b-12d3-a456-426614174000';
const runId = '987e6543-e21b-32d3-b456-426614174111';
const execute = {
  approval_ref: 'approval:v1',
  source_git_revision: revision,
  pipeline_version: 'pipeline-v1',
  workflow_ref: 'workflow:v1',
};

function protocolFailure(reason: InternalRequestError['reason']): (error: unknown) => boolean {
  return (error) => error instanceof InternalRequestError
    && error.code === 'INVALID_INTERNAL_REQUEST'
    && error.reason === reason;
}

test('execute accepts its exact closed request', () => {
  assert.deepEqual(parseExecuteRequest(execute), execute);
});

test('execute rejects additional fields', () => {
  assert.throws(() => parseExecuteRequest({ ...execute, trigger_type: 'manual' }),
    protocolFailure('extra_field'));
});

test('execute rejects uppercase, abbreviated and newline git revisions', () => {
  for (const source_git_revision of ['A'.repeat(40), 'a'.repeat(39), `${revision}\n`]) {
    assert.throws(() => parseExecuteRequest({ ...execute, source_git_revision }),
      protocolFailure('invalid_value'));
  }
});

test('retry accepts a failed-release selector shape and rejects malformed UUID', () => {
  const retry = { ...execute, release_id: releaseId };
  assert.deepEqual(parseRetryRequest(retry), retry);
  assert.throws(() => parseRetryRequest({ ...retry, release_id: 'not-a-uuid' }),
    protocolFailure('invalid_value'));
});

test('recover accepts exact IDs and rejects timeout controls as extra fields', () => {
  const recover = { release_id: releaseId, run_id: runId, workflow_ref: 'workflow:v1' };
  assert.deepEqual(parseRecoverRequest(recover), recover);
  for (const field of ['timeout', 'max_age', 'started_before', 'older_than', 'retry']) {
    assert.throws(() => parseRecoverRequest({ ...recover, [field]: 1 }),
      protocolFailure('extra_field'));
  }
});

test('status accepts exactly one run, release or identity selector', () => {
  assert.deepEqual(parseStatusRequest({ run_id: runId }), { run_id: runId });
  assert.deepEqual(parseStatusRequest({ release_id: releaseId }), { release_id: releaseId });
  assert.deepEqual(parseStatusRequest({
    approval_ref: execute.approval_ref,
    source_git_revision: revision,
    pipeline_version: execute.pipeline_version,
  }), {
    approval_ref: execute.approval_ref,
    source_git_revision: revision,
    pipeline_version: execute.pipeline_version,
  });
});

test('status accepts optional workflow correlation for every selector', () => {
  assert.equal(parseStatusRequest({ run_id: runId, workflow_ref: 'workflow:v1' }).workflow_ref,
    'workflow:v1');
  assert.equal(parseStatusRequest({ release_id: releaseId, workflow_ref: 'workflow:v1' }).workflow_ref,
    'workflow:v1');
  assert.equal(parseStatusRequest({
    approval_ref: execute.approval_ref,
    source_git_revision: revision,
    pipeline_version: execute.pipeline_version,
    workflow_ref: 'workflow:v1',
  }).workflow_ref, 'workflow:v1');
});

test('status rejects missing, partial and mixed selectors', () => {
  assert.throws(() => parseStatusRequest({}), protocolFailure('missing_field'));
  assert.throws(() => parseStatusRequest({ approval_ref: 'approval:v1' }),
    protocolFailure('ambiguous_selector'));
  assert.throws(() => parseStatusRequest({ run_id: runId, release_id: releaseId }),
    protocolFailure('ambiguous_selector'));
  assert.throws(() => parseStatusRequest({ release_id: releaseId, approval_ref: 'approval:v1' }),
    protocolFailure('ambiguous_selector'));
});

test('parsers reject null, arrays and primitives', () => {
  for (const value of [null, [], 'request']) {
    assert.throws(() => parseExecuteRequest(value), protocolFailure('invalid_shape'));
  }
});

test('parsers reject missing fields and blank strings without normalization', () => {
  const { workflow_ref: ignored, ...missingWorkflow } = execute;
  void ignored;
  assert.throws(() => parseExecuteRequest(missingWorkflow), protocolFailure('missing_field'));
  for (const approval_ref of ['', '   ']) {
    assert.throws(() => parseExecuteRequest({ ...execute, approval_ref }),
      protocolFailure('invalid_value'));
  }
  assert.equal(parseExecuteRequest({ ...execute, approval_ref: ' approval:v1 ' }).approval_ref,
    ' approval:v1 ');
});

test('protocol error serialization exposes only allowlisted code and reason', () => {
  const error = new InternalRequestError('invalid_value');
  const serialized = JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    error_code: 'INVALID_INTERNAL_REQUEST',
    reason: 'invalid_value',
  });
  assert.equal('stack' in serialized, false);
  assert.equal('message' in serialized, false);
  assert.equal('value' in serialized, false);
});

