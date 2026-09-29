import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import {
  ApprovalRegistryError,
  PreflightError,
  parseApprovalRegistry,
  prepareApprovedSource,
  sha256,
} from '../src/index.js';
import type { ApprovalRegistryV1 } from '../src/index.js';

const execute = promisify(execFile);
const sourceDataset = fileURLToPath(new URL('../../../data/synthetic', import.meta.url));

interface SourceFixture {
  root: string;
  revision: string;
  manifestBytes: Buffer;
  registry: ApprovalRegistryV1;
}

async function git(root: string, ...args: string[]): Promise<string> {
  const result = await execute('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  return result.stdout.trim();
}

async function createSourceFixture(): Promise<SourceFixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'banuchat-approved-source-'));
  await cp(sourceDataset, path.join(root, 'data', 'synthetic'), { recursive: true });
  await git(root, 'init');
  await git(root, 'add', 'data/synthetic');
  await git(root, '-c', 'user.name=BanuChat Test', '-c', 'user.email=test@invalid.local',
    'commit', '-m', 'Synthetic fixture');
  const revision = await git(root, 'rev-parse', 'HEAD');
  const manifestBytes = await readFile(path.join(root, 'data', 'synthetic', 'manifest.json'));
  const registry = parseApprovalRegistry({
    schema_version: '1',
    approvals: [{
      approval_ref: 'approval:test',
      source_git_revision: revision,
      dataset_key: 'banuchat-synthetic',
      manifest_sha256: sha256(manifestBytes),
      evidence_ref: 'human-review:test',
      available_at: '2026-09-29T10:30:00-05:00',
    }],
  });
  return { root, revision, manifestBytes, registry };
}

async function withSource(operation: (fixture: SourceFixture) => Promise<void>): Promise<void> {
  const fixture = await createSourceFixture();
  try {
    await operation(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function approvalFailure(reason: ApprovalRegistryError['reason']): (error: unknown) => boolean {
  return (error) => error instanceof ApprovalRegistryError && error.reason === reason;
}

function sourceRejected(error: unknown): boolean {
  return error instanceof PreflightError
    && error.code === 'SOURCE_REJECTED'
    && error.category === 'git';
}

test('approved source produces captured snapshot and leaves source unchanged', async () => {
  await withSource(async ({ root, revision, manifestBytes, registry }) => {
    const before = await git(root, 'status', '--porcelain=v1', '--untracked-files=all');
    const snapshot = await prepareApprovedSource({
      registry,
      approvalRef: 'approval:test',
      sourceGitRevision: revision,
      sourceCheckoutRoot: root,
    });
    assert.equal(snapshot.validated.summary.items, 76);
    assert.equal(snapshot.validated.summary.documents, 12);
    assert.equal(snapshot.derivatives.length, 12);
    assert.equal(snapshot.derivatives.reduce((count, document) => count + document.chunks.length, 0), 60);
    assert.equal(snapshot.manifest_sha256, sha256(manifestBytes));
    assert.equal(snapshot.manifest_sha256, sha256(snapshot.validated.bytes.get('manifest.json')!));
    assert.equal(snapshot.source_git_revision, revision);
    assert.equal(await git(root, 'status', '--porcelain=v1', '--untracked-files=all'), before);
    assert.deepEqual(await readFile(path.join(root, 'data', 'synthetic', 'manifest.json')), manifestBytes);
  });
});

test('missing approval and requested revision mismatch fail before source verification', async () => {
  await withSource(async ({ root, revision, registry }) => {
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:missing', sourceGitRevision: revision, sourceCheckoutRoot: root,
    }), approvalFailure('approval_not_found'));
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:test', sourceGitRevision: 'c'.repeat(40), sourceCheckoutRoot: root,
    }), approvalFailure('revision_mismatch'));
  });
});

test('rejects a real HEAD different from the approved source revision', async () => {
  await withSource(async ({ root, revision, registry }) => {
    await writeFile(path.join(root, 'operator-note.txt'), 'new commit\n');
    await git(root, 'add', 'operator-note.txt');
    await git(root, '-c', 'user.name=BanuChat Test', '-c', 'user.email=test@invalid.local',
      'commit', '-m', 'Different HEAD');
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:test', sourceGitRevision: revision, sourceCheckoutRoot: root,
    }), sourceRejected);
  });
});

test('rejects a dirty source checkout', async () => {
  await withSource(async ({ root, revision, registry }) => {
    await writeFile(path.join(root, 'data', 'synthetic', 'manifest.json'), '{}\n');
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:test', sourceGitRevision: revision, sourceCheckoutRoot: root,
    }), sourceRejected);
  });
});

test('rejects an approval with a different manifest byte hash', async () => {
  await withSource(async ({ root, revision, registry }) => {
    registry.approvals[0]!.manifest_sha256 = 'f'.repeat(64);
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:test', sourceGitRevision: revision, sourceCheckoutRoot: root,
    }), approvalFailure('manifest_mismatch'));
  });
});

test('rejects an approval for a different dataset key', async () => {
  await withSource(async ({ root, revision, registry }) => {
    registry.approvals[0]!.dataset_key = 'different-synthetic-dataset';
    await assert.rejects(prepareApprovedSource({
      registry, approvalRef: 'approval:test', sourceGitRevision: revision, sourceCheckoutRoot: root,
    }), approvalFailure('dataset_mismatch'));
  });
});

