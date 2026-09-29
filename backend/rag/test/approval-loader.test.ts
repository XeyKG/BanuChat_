import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  APPROVAL_REGISTRY_MAX_BYTES,
  ApprovalRegistryError,
  loadApprovalRegistry,
} from '../src/index.js';

const record = {
  approval_ref: 'approval:v1',
  source_git_revision: 'a'.repeat(40),
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

async function withTempFile(
  content: string | Uint8Array,
  operation: (filePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'banuchat-approval-'));
  const filePath = join(directory, 'registry.json');
  try {
    await writeFile(filePath, content);
    await operation(filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

test('loads a valid local registry with one or several approvals', async () => {
  await withTempFile(json({ schema_version: '1', approvals: [record] }), async (filePath) => {
    assert.deepEqual(await loadApprovalRegistry(filePath), {
      schema_version: '1', approvals: [record],
    });
  });
  const second = {
    ...record,
    approval_ref: 'approval:v2',
    source_git_revision: 'c'.repeat(64),
  };
  await withTempFile(json({ schema_version: '1', approvals: [record, second] }), async (filePath) => {
    assert.equal((await loadApprovalRegistry(filePath)).approvals.length, 2);
  });
});

test('rejects missing files and empty configured paths safely', async () => {
  await assert.rejects(loadApprovalRegistry(join(tmpdir(), 'banuchat-registry-does-not-exist.json')),
    rejected('registry_unavailable'));
  await assert.rejects(loadApprovalRegistry('   '), rejected('invalid_value'));
});

test('maps malformed and duplicate-key JSON to invalid_json', async () => {
  for (const content of ['{"schema_version":"1",}\n',
    '{"schema_version":"1","schema_version":"1","approvals":[]}\n']) {
    await withTempFile(content, async (filePath) => {
      await assert.rejects(loadApprovalRegistry(filePath), rejected('invalid_json'));
    });
  }
});

test('preserves semantic parser errors for invalid registries', async () => {
  await withTempFile(json({ schema_version: '1', approvals: [] }), async (filePath) => {
    await assert.rejects(loadApprovalRegistry(filePath), rejected('invalid_value'));
  });
});

test('maps malformed UTF-8 to invalid_encoding', async () => {
  await withTempFile(Uint8Array.from([0xff, 0x0a]), async (filePath) => {
    await assert.rejects(loadApprovalRegistry(filePath), rejected('invalid_encoding'));
  });
});

test('rejects files larger than the explicit one MiB limit', async () => {
  await withTempFile(new Uint8Array(APPROVAL_REGISTRY_MAX_BYTES + 1), async (filePath) => {
    await assert.rejects(loadApprovalRegistry(filePath), rejected('registry_too_large'));
  });
});

test('serialized loader errors omit paths, native messages and file content', async () => {
  const privatePath = join(tmpdir(), 'private-secret-registry.json');
  let caught: unknown;
  try {
    await loadApprovalRegistry(privatePath);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApprovalRegistryError);
  const serialized = JSON.parse(JSON.stringify(caught)) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    error_code: 'APPROVAL_REJECTED', reason: 'registry_unavailable',
  });
  const text = JSON.stringify(serialized);
  assert.equal(text.includes(privatePath), false);
  assert.equal('stack' in serialized, false);
  assert.equal('message' in serialized, false);
  assert.equal('content' in serialized, false);
});

