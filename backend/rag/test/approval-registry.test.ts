import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ApprovalRegistryError,
  assertApprovalMatchesRequest,
  parseApprovalRegistry,
  resolveApproval,
} from '../src/index.js';

const revision = 'a'.repeat(40);
const record = {
  approval_ref: 'approval:v1',
  source_git_revision: revision,
  dataset_key: 'banuchat-synthetic-v1',
  manifest_sha256: 'b'.repeat(64),
  evidence_ref: 'human-review:v1',
  available_at: '2026-09-29T10:30:00-05:00',
};

function rejected(reason: ApprovalRegistryError['reason']): (error: unknown) => boolean {
  return (error) => error instanceof ApprovalRegistryError
    && error.code === 'APPROVAL_REJECTED'
    && error.reason === reason;
}

test('parses one or several valid approvals without normalizing values', () => {
  const one = parseApprovalRegistry({ schema_version: '1', approvals: [record] });
  assert.deepEqual(one, { schema_version: '1', approvals: [record] });
  const second = {
    ...record,
    approval_ref: ' approval:v2 ',
    source_git_revision: 'c'.repeat(64),
    available_at: '2026-09-29T15:30:00Z',
  };
  assert.deepEqual(parseApprovalRegistry({ schema_version: '1', approvals: [record, second] }),
    { schema_version: '1', approvals: [record, second] });
});

test('rejects duplicate approval_ref instead of applying last wins', () => {
  assert.throws(() => parseApprovalRegistry({
    schema_version: '1',
    approvals: [record, { ...record, dataset_key: 'other' }],
  }), rejected('duplicate_approval_ref'));
});

test('rejects extra fields in root and approval records', () => {
  assert.throws(() => parseApprovalRegistry({ schema_version: '1', approvals: [record], secret: true }),
    rejected('extra_field'));
  assert.throws(() => parseApprovalRegistry({
    schema_version: '1', approvals: [{ ...record, pipeline_version: 'v1' }],
  }), rejected('extra_field'));
});

test('rejects missing fields and empty approval lists', () => {
  const { evidence_ref: ignored, ...missingEvidence } = record;
  void ignored;
  assert.throws(() => parseApprovalRegistry({ schema_version: '1', approvals: [missingEvidence] }),
    rejected('missing_field'));
  assert.throws(() => parseApprovalRegistry({ schema_version: '1', approvals: [] }),
    rejected('invalid_value'));
});

test('rejects invalid source and manifest hashes', () => {
  for (const source_git_revision of ['A'.repeat(40), 'a'.repeat(39)]) {
    assert.throws(() => parseApprovalRegistry({
      schema_version: '1', approvals: [{ ...record, source_git_revision }],
    }), rejected('invalid_value'));
  }
  for (const manifest_sha256 of ['B'.repeat(64), 'b'.repeat(63)]) {
    assert.throws(() => parseApprovalRegistry({
      schema_version: '1', approvals: [{ ...record, manifest_sha256 }],
    }), rejected('invalid_value'));
  }
});

test('accepts RFC3339 timestamps with Z or explicit offset', () => {
  for (const available_at of ['2026-09-29T15:30:00Z', '2026-09-29T10:30:00-05:00']) {
    assert.equal(parseApprovalRegistry({
      schema_version: '1', approvals: [{ ...record, available_at }],
    }).approvals[0]?.available_at, available_at);
  }
});

test('rejects timestamps without offset and impossible timestamps', () => {
  for (const available_at of [
    '2026-09-29T10:30:00',
    '2026-02-30T10:30:00-05:00',
    '2026-09-29T25:30:00-05:00',
    'text',
  ]) {
    assert.throws(() => parseApprovalRegistry({
      schema_version: '1', approvals: [{ ...record, available_at }],
    }), rejected('invalid_value'));
  }
});

test('rejects non-objects, blank strings and non-array approvals', () => {
  for (const value of [null, [], 'registry']) {
    assert.throws(() => parseApprovalRegistry(value), rejected('invalid_shape'));
  }
  assert.throws(() => parseApprovalRegistry({ schema_version: '1', approvals: record }),
    rejected('invalid_shape'));
  assert.throws(() => parseApprovalRegistry({
    schema_version: '1', approvals: [{ ...record, dataset_key: '   ' }],
  }), rejected('invalid_value'));
});

test('resolves an existing approval and safely rejects absent or blank references', () => {
  const registry = parseApprovalRegistry({ schema_version: '1', approvals: [record] });
  assert.equal(resolveApproval(registry, record.approval_ref), registry.approvals[0]);
  assert.throws(() => resolveApproval(registry, 'approval:missing'), rejected('approval_not_found'));
  assert.throws(() => resolveApproval(registry, '  '), rejected('invalid_value'));
});

test('requires exact source revision equality', () => {
  const approval = parseApprovalRegistry({ schema_version: '1', approvals: [record] }).approvals[0]!;
  assert.doesNotThrow(() => assertApprovalMatchesRequest(approval, revision));
  assert.throws(() => assertApprovalMatchesRequest(approval, 'c'.repeat(40)),
    rejected('revision_mismatch'));
});

test('error serialization exposes only allowlisted code and reason', () => {
  const serialized = JSON.parse(JSON.stringify(
    new ApprovalRegistryError('approval_not_found'),
  )) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    error_code: 'APPROVAL_REJECTED',
    reason: 'approval_not_found',
  });
  assert.equal('stack' in serialized, false);
  assert.equal('message' in serialized, false);
  assert.equal('value' in serialized, false);
});

