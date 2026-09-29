import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { buildPipelineConfigV1 } from '../pipeline.js';
import type { Json } from '../types.js';
import { RuntimeProvenanceError } from './errors.js';

const execute = promisify(execFile);
const FULL_REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const FIXED_RUNTIME_FILES = [
  'backend/rag/package.json',
  'backend/rag/package-lock.json',
  'backend/rag/tsconfig.json',
  'backend/rag/tsconfig.build.json',
] as const;
const RUNTIME_SCOPES = ['backend/rag/src', ...FIXED_RUNTIME_FILES] as const;

export interface RuntimeContext {
  implementation_revision: string;
  pipeline_version: string;
  pipeline_config: { [key: string]: Json };
}

export interface PrepareRuntimeContextOptions {
  runtimeCheckoutRoot: string;
}

/**
 * Accredits a Git source checkout. It does not by itself prove that an existing
 * dist/build was produced from that commit.
 */
export async function prepareRuntimeContext(
  options: PrepareRuntimeContextOptions,
): Promise<RuntimeContext> {
  const root = options.runtimeCheckoutRoot;
  if (typeof root !== 'string' || root.length === 0 || root.trim().length === 0) {
    throw new RuntimeProvenanceError('invalid_configuration');
  }

  let resolvedRoot: string;
  try {
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new RuntimeProvenanceError('invalid_configuration');
    }
    resolvedRoot = await realpath(root);
  } catch (error) {
    if (error instanceof RuntimeProvenanceError) throw error;
    throw new RuntimeProvenanceError('runtime_unavailable');
  }

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')),
  );
  env['GIT_OPTIONAL_LOCKS'] = '0';
  const git = async (...args: string[]): Promise<Buffer> => {
    try {
      const result = await execute('git', ['--no-optional-locks', '-C', root, ...args], {
        encoding: 'buffer',
        maxBuffer: 32 * 1024 * 1024,
        timeout: 30_000,
        env,
        windowsHide: true,
      });
      return result.stdout;
    } catch {
      throw new RuntimeProvenanceError('invalid_repository');
    }
  };

  const top = (await git('rev-parse', '--show-toplevel')).toString('utf8').trim();
  let resolvedTop: string;
  try {
    resolvedTop = await realpath(top);
  } catch {
    throw new RuntimeProvenanceError('invalid_repository');
  }
  if (path.relative(resolvedRoot, resolvedTop) !== '') {
    throw new RuntimeProvenanceError('invalid_repository');
  }

  const readHead = async (): Promise<string> => {
    const revision = (await git('rev-parse', '--verify', 'HEAD^{commit}')).toString('ascii').trim();
    if (!FULL_REVISION.test(revision)) throw new RuntimeProvenanceError('invalid_repository');
    return revision;
  };
  const assertClean = async (): Promise<void> => {
    const status = await git('status', '--porcelain=v1', '-z', '--untracked-files=all');
    if (status.length !== 0) throw new RuntimeProvenanceError('dirty_runtime');
  };

  const implementationRevision = await readHead();
  await assertClean();

  const tree = await git('ls-tree', '-rz', '--full-tree', implementationRevision, '--', ...RUNTIME_SCOPES);
  const tracked = new Set<string>();
  for (const entry of tree.toString('utf8').split('\0').filter(Boolean)) {
    const tab = entry.indexOf('\t');
    const header = entry.slice(0, tab);
    const relative = entry.slice(tab + 1);
    const inScope = relative.startsWith('backend/rag/src/')
      || FIXED_RUNTIME_FILES.some((fixed) => fixed === relative);
    if (tab < 0 || !/^100(?:644|755) blob [0-9a-f]+$/.test(header) || !inScope) {
      throw new RuntimeProvenanceError('invalid_repository');
    }
    tracked.add(relative);
  }
  if (![...tracked].some((relative) => relative.startsWith('backend/rag/src/'))
    || FIXED_RUNTIME_FILES.some((fixed) => !tracked.has(fixed))) {
    throw new RuntimeProvenanceError('invalid_repository');
  }

  for (const relative of tracked) {
    const absolute = path.resolve(resolvedRoot, ...relative.split('/'));
    if (path.relative(resolvedRoot, absolute).startsWith('..')) {
      throw new RuntimeProvenanceError('invalid_repository');
    }
    let actual: Buffer;
    try {
      const fileStat = await lstat(absolute);
      if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
        throw new RuntimeProvenanceError('bytes_mismatch');
      }
      actual = await readFile(absolute);
    } catch (error) {
      if (error instanceof RuntimeProvenanceError) throw error;
      throw new RuntimeProvenanceError('bytes_mismatch');
    }
    const blob = await git('cat-file', 'blob', `${implementationRevision}:${relative}`);
    if (!actual.equals(blob)) throw new RuntimeProvenanceError('bytes_mismatch');
  }

  const pipelineConfig = buildPipelineConfigV1(implementationRevision);
  const pipelineVersion = pipelineConfig['pipeline_version'];
  if (typeof pipelineVersion !== 'string' || pipelineVersion.length === 0) {
    throw new RuntimeProvenanceError('invalid_configuration');
  }

  if (await readHead() !== implementationRevision) {
    throw new RuntimeProvenanceError('revision_changed');
  }
  await assertClean();
  if (await readHead() !== implementationRevision) {
    throw new RuntimeProvenanceError('revision_changed');
  }

  return {
    implementation_revision: implementationRevision,
    pipeline_version: pipelineVersion,
    pipeline_config: pipelineConfig,
  };
}

