import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import {
  RuntimeProvenanceError,
  buildPipelineConfigV1,
  prepareRuntimeContext,
} from '../src/index.js';

const execute = promisify(execFile);

interface RuntimeFixture {
  root: string;
  revision: string;
}

async function git(root: string, ...args: string[]): Promise<string> {
  const result = await execute('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  return result.stdout.trim();
}

async function createRuntimeFixture(): Promise<RuntimeFixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'banuchat-runtime-'));
  const rag = path.join(root, 'backend', 'rag');
  await mkdir(path.join(rag, 'src'), { recursive: true });
  const files: Record<string, string> = {
    'backend/rag/src/index.ts': 'export const fixture = true;\n',
    'backend/rag/package.json': '{"name":"runtime-fixture"}\n',
    'backend/rag/package-lock.json': '{"lockfileVersion":3}\n',
    'backend/rag/tsconfig.json': '{}\n',
    'backend/rag/tsconfig.build.json': '{}\n',
    '.gitignore': 'node_modules/\ndist/\n.env\n',
  };
  for (const [relative, content] of Object.entries(files)) {
    await writeFile(path.join(root, ...relative.split('/')), content);
  }
  await git(root, 'init');
  await git(root, 'add', '.');
  await git(root, '-c', 'user.name=BanuChat Test', '-c', 'user.email=test@invalid.local',
    'commit', '-m', 'Runtime fixture');
  return { root, revision: await git(root, 'rev-parse', 'HEAD') };
}

async function withRuntime(operation: (fixture: RuntimeFixture) => Promise<void>): Promise<void> {
  const fixture = await createRuntimeFixture();
  try {
    await operation(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function rejected(reason: RuntimeProvenanceError['reason']): (error: unknown) => boolean {
  return (error) => error instanceof RuntimeProvenanceError
    && error.code === 'RUNTIME_REJECTED'
    && error.reason === reason;
}

test('clean runtime derives real HEAD and canonical pipeline config', async () => {
  await withRuntime(async ({ root, revision }) => {
    const context = await prepareRuntimeContext({ runtimeCheckoutRoot: root });
    assert.equal(context.implementation_revision, revision);
    assert.match(context.implementation_revision, /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/);
    assert.equal(context.pipeline_version, context.pipeline_config['pipeline_version']);
    assert.deepEqual(context.pipeline_config, buildPipelineConfigV1(revision));
  });
});

test('empty and unavailable roots are rejected safely', async () => {
  await assert.rejects(prepareRuntimeContext({ runtimeCheckoutRoot: '   ' }),
    rejected('invalid_configuration'));
  await assert.rejects(prepareRuntimeContext({
    runtimeCheckoutRoot: path.join(tmpdir(), 'banuchat-runtime-does-not-exist'),
  }), rejected('runtime_unavailable'));
});

test('repository subdirectory cannot be configured as runtime root', async () => {
  await withRuntime(async ({ root }) => {
    await assert.rejects(prepareRuntimeContext({
      runtimeCheckoutRoot: path.join(root, 'backend', 'rag'),
    }), rejected('invalid_repository'));
  });
});

test('tracked, untracked and staged runtime changes are dirty', async () => {
  await withRuntime(async ({ root }) => {
    await writeFile(path.join(root, 'backend', 'rag', 'src', 'index.ts'), 'changed\n');
    await assert.rejects(prepareRuntimeContext({ runtimeCheckoutRoot: root }),
      rejected('dirty_runtime'));
  });
  await withRuntime(async ({ root }) => {
    await writeFile(path.join(root, 'operator-note.txt'), 'untracked\n');
    await assert.rejects(prepareRuntimeContext({ runtimeCheckoutRoot: root }),
      rejected('dirty_runtime'));
  });
  await withRuntime(async ({ root }) => {
    await writeFile(path.join(root, 'backend', 'rag', 'src', 'index.ts'), 'staged\n');
    await git(root, 'add', 'backend/rag/src/index.ts');
    await assert.rejects(prepareRuntimeContext({ runtimeCheckoutRoot: root }),
      rejected('dirty_runtime'));
  });
});

test('byte comparison rejects changes hidden from Git status', async () => {
  await withRuntime(async ({ root }) => {
    const relative = 'backend/rag/src/index.ts';
    await git(root, 'update-index', '--assume-unchanged', relative);
    await writeFile(path.join(root, ...relative.split('/')), 'hidden change\n');
    assert.equal(await git(root, 'status', '--porcelain=v1', '--untracked-files=all'), '');
    await assert.rejects(prepareRuntimeContext({ runtimeCheckoutRoot: root }),
      rejected('bytes_mismatch'));
  });
});

test('ignored build and dependency directories do not define runtime provenance', async () => {
  await withRuntime(async ({ root }) => {
    await mkdir(path.join(root, 'backend', 'rag', 'node_modules'), { recursive: true });
    await mkdir(path.join(root, 'backend', 'rag', 'dist'), { recursive: true });
    await writeFile(path.join(root, 'backend', 'rag', 'node_modules', 'ignored.txt'), 'ignored\n');
    await writeFile(path.join(root, 'backend', 'rag', 'dist', 'ignored.js'), 'ignored\n');
    await prepareRuntimeContext({ runtimeCheckoutRoot: root });
  });
});

test('serialized errors contain no root, stderr, file content or stack', async () => {
  const privateRoot = path.join(tmpdir(), 'private-runtime-checkout');
  let caught: unknown;
  try {
    await prepareRuntimeContext({ runtimeCheckoutRoot: privateRoot });
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof RuntimeProvenanceError);
  const serialized = JSON.parse(JSON.stringify(caught)) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    error_code: 'RUNTIME_REJECTED', reason: 'runtime_unavailable',
  });
  const output = JSON.stringify(serialized);
  assert.equal(output.includes(privateRoot), false);
  assert.equal('stack' in serialized, false);
  assert.equal('message' in serialized, false);
  assert.equal('stderr' in serialized, false);
  assert.equal('content' in serialized, false);
});

test('fixture commit bytes remain unchanged by verification', async () => {
  await withRuntime(async ({ root }) => {
    const file = path.join(root, 'backend', 'rag', 'src', 'index.ts');
    const before = await readFile(file);
    await prepareRuntimeContext({ runtimeCheckoutRoot: root });
    assert.deepEqual(await readFile(file), before);
    assert.equal(await git(root, 'status', '--porcelain=v1', '--untracked-files=all'), '');
  });
});

