import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { PreflightError } from '../errors.js';
import { SafeReader, validateRelativePath } from './safe-reader.js';

const execute = promisify(execFile);
export interface SourceCheckoutOptions {
  sourceCheckoutRoot: string;
  expectedSourceRevision: string;
  /** Repo-relative paths; manifest, schemas, functional files and Git attributes. */
  requiredRelativePaths: readonly string[];
}

/** Read-only local Git adapter. Neither approval registry nor runtime provenance. */
export async function verifySourceCheckout(options: SourceCheckoutOptions): Promise<{
  source_git_revision: string; verified_files: number;
}> {
  const reject = (): never => { throw new PreflightError('SOURCE_REJECTED', 'git'); };
  try {
    const { sourceCheckoutRoot, expectedSourceRevision, requiredRelativePaths } = options;
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(expectedSourceRevision) || requiredRelativePaths.length === 0) reject();
    for (const relative of requiredRelativePaths) validateRelativePath(relative);
    const reader = await SafeReader.create(sourceCheckoutRoot);
    // Ignore inherited GIT_DIR/WORK_TREE/INDEX and similar redirections. Never use a shell.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
    env['GIT_OPTIONAL_LOCKS'] = '0';
    const git = async (...args: string[]): Promise<Buffer> => {
      const result = await execute('git', ['--no-optional-locks', '-C', sourceCheckoutRoot, ...args],
        { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, timeout: 30_000, env, windowsHide: true });
      return result.stdout;
    };
    const top = (await git('rev-parse', '--show-toplevel')).toString('utf8').trim();
    if (path.relative(await realpath(sourceCheckoutRoot), await realpath(top)) !== '') reject();
    const checkHead = async (): Promise<void> => {
      if ((await git('rev-parse', '--verify', 'HEAD^{commit}')).toString('ascii').trim() !== expectedSourceRevision) reject();
    };
    const checkStatus = async (): Promise<void> => {
      if ((await git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored', '--', 'data/synthetic')).length) reject();
    };
    await checkHead();
    await checkStatus();
    // Always compare the entire tracked synthetic subtree, not just caller-selected files.
    const tree = await git('ls-tree', '-rz', '--full-tree', expectedSourceRevision, '--', 'data/synthetic');
    const tracked = new Set<string>();
    for (const entry of tree.toString('utf8').split('\0').filter(Boolean)) {
      const tab = entry.indexOf('\t');
      const header = entry.slice(0, tab);
      const relative = entry.slice(tab + 1);
      if (!/^100(?:644|755) blob [0-9a-f]+$/.test(header)) reject();
      validateRelativePath(relative);
      tracked.add(relative);
    }
    if (tracked.size === 0) reject();
    const syntheticReader = await SafeReader.create(path.join(sourceCheckoutRoot, 'data', 'synthetic'));
    const disk = await syntheticReader.listFiles();
    if (disk.length !== tracked.size || disk.some(file => !tracked.has(`data/synthetic/${file}`))) reject();
    const paths = new Set([...tracked, ...requiredRelativePaths]);
    for (const relative of paths) {
      const blob = await git('cat-file', 'blob', `${expectedSourceRevision}:${relative}`);
      const actual = await reader.read(relative);
      if (!actual.equals(blob)) reject();
    }
    await checkHead();
    await checkStatus();
    return { source_git_revision: expectedSourceRevision, verified_files: paths.size };
  } catch {
    // Never return Git stderr, command strings or arbitrary source root paths.
    return reject();
  }
}
