import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { verifySourceCheckout } from '../src/index.js';
import { failure, temporaryDirectory } from './helpers.js';

const exec = promisify(execFile);
async function fixture(t: TestContext) {
  const root = await temporaryDirectory(t);
  const git = async (...args: string[]) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
    const result = await exec('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args],
      { windowsHide: true, env });
    return result.stdout.trim();
  };
  await git('init', '--quiet');
  await git('config', 'user.name', 'Synthetic test');
  await git('config', 'user.email', 'test@example.invalid');
  await git('config', 'core.autocrlf', 'false');
  await mkdir(path.join(root, 'data/synthetic'), { recursive: true });
  await writeFile(path.join(root, '.gitattributes'), '* -text\n');
  await writeFile(path.join(root, '.gitignore'), 'data/synthetic/ignored.tmp\n');
  await writeFile(path.join(root, 'data/synthetic/manifest.json'), '{"synthetic":true}\n');
  await git('add', '--', '.');
  await git('commit', '--quiet', '-m', 'Temporary test source');
  const revision = await git('rev-parse', 'HEAD');
  const options = { sourceCheckoutRoot: root, expectedSourceRevision: revision,
    requiredRelativePaths: ['.gitattributes', 'data/synthetic/manifest.json'] };
  return { root, git, options };
}

test('Git: expected HEAD and raw blobs pass, no source mutation', async t => {
  const { git, options } = await fixture(t);
  assert.deepEqual(await verifySourceCheckout(options), { source_git_revision: options.expectedSourceRevision, verified_files: 2 });
  assert.equal(await git('status', '--porcelain'), '');
  assert.equal(await git('rev-parse', 'HEAD'), options.expectedSourceRevision);
});
test('Git: different HEAD rejected', async t => {
  const { options } = await fixture(t);
  await assert.rejects(verifySourceCheckout({ ...options, expectedSourceRevision: '0'.repeat(40) }), failure('SOURCE_REJECTED', 'git'));
});
test('Git: abbreviated/non-SHA revision rejected', async t => {
  const { options } = await fixture(t);
  for (const revision of ['HEAD', '--help', 'abc123', 'a'.repeat(41)]) {
    await assert.rejects(verifySourceCheckout({ ...options, expectedSourceRevision: revision }), failure('SOURCE_REJECTED', 'git'));
  }
});
for (const staged of [false, true]) {
  test(`Git: tracked modification ${staged ? 'staged' : 'unstaged'} rejected`, async t => {
    const { root, git, options } = await fixture(t);
    await writeFile(path.join(root, 'data/synthetic/manifest.json'), '{}\n');
    if (staged) await git('add', '--', 'data/synthetic/manifest.json');
    await assert.rejects(verifySourceCheckout(options), failure('SOURCE_REJECTED', 'git'));
  });
}
for (const filename of ['untracked.tmp', 'ignored.tmp']) {
  test(`Git: ${filename} rejected`, async t => {
    const { root, options } = await fixture(t);
    await writeFile(path.join(root, 'data/synthetic', filename), 'extra\n');
    await assert.rejects(verifySourceCheckout(options), failure('SOURCE_REJECTED', 'git'));
  });
}
test('Git: working bytes differ from blob even with clean status (assume-unchanged)', async t => {
  const { root, git, options } = await fixture(t);
  await git('update-index', '--assume-unchanged', '--', 'data/synthetic/manifest.json');
  await writeFile(path.join(root, 'data/synthetic/manifest.json'), '{"synthetic":false}\n');
  assert.equal(await git('status', '--porcelain', '--', 'data/synthetic'), '');
  await assert.rejects(verifySourceCheckout(options), failure('SOURCE_REJECTED', 'git'));
});
