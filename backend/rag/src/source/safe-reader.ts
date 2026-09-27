import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { PreflightError } from '../errors.js';

export function validateRelativePath(value: string): string[] {
  // Reject Windows ADS/device aliases, drive letters and ambiguous normalization too.
  const parts = value.split('/');
  if (!value || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)
    || /[\\:\x00-\x1f\x7f]/.test(value)
    || parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) {
    throw new PreflightError('SOURCE_REJECTED', 'path');
  }
  return parts;
}

function contained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/** Local trusted root, never an HTTP path. Source must remain read-only while used. */
export class SafeReader {
  private constructor(private readonly root: string) {}

  static async create(root: string): Promise<SafeReader> {
    try {
      const absolute = path.resolve(root);
      let cursor = path.parse(absolute).root;
      for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
        cursor = path.join(cursor, part);
        const stat = await lstat(cursor);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new PreflightError('SOURCE_REJECTED', 'path');
      }
      return new SafeReader(await realpath(absolute));
    } catch (error) {
      if (error instanceof PreflightError) throw error;
      throw new PreflightError('SOURCE_REJECTED', 'read');
    }
  }

  private async resolve(relative: string): Promise<string> {
    const parts = validateRelativePath(relative);
    let cursor = this.root;
    const rootStat = await lstat(this.root);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new PreflightError('SOURCE_REJECTED', 'path');
    for (const [index, part] of parts.entries()) {
      cursor = path.join(cursor, part);
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory())) {
        throw new PreflightError('SOURCE_REJECTED', 'path');
      }
      if (!contained(this.root, await realpath(cursor))) throw new PreflightError('SOURCE_REJECTED', 'path');
    }
    return cursor;
  }

  async read(relative: string): Promise<Buffer> {
    try {
      const resolved = await this.resolve(relative);
      const before = await lstat(resolved);
      if (!before.isFile()) throw new PreflightError('SOURCE_REJECTED', 'path');
      const handle = await open(resolved, 'r');
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino) throw new PreflightError('SOURCE_REJECTED', 'path');
        const bytes = await handle.readFile();
        await this.resolve(relative);
        const after = await handle.stat();
        const current = await lstat(resolved);
        if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs
          || current.dev !== stat.dev || current.ino !== stat.ino) throw new PreflightError('SOURCE_REJECTED', 'read');
        return bytes;
      } finally { await handle.close(); }
    } catch (error) {
      if (error instanceof PreflightError) throw error;
      throw new PreflightError('SOURCE_REJECTED', 'read', relative);
    }
  }

  async listFiles(): Promise<string[]> {
    try {
      const files: string[] = [];
      const visit = async (relative: string): Promise<void> => {
        const directory = relative ? await this.resolve(relative) : this.root;
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const child = relative ? `${relative}/${entry.name}` : entry.name;
          const resolved = await this.resolve(child);
          const stat = await lstat(resolved);
          if (stat.isDirectory()) await visit(child);
          else if (stat.isFile()) files.push(child);
          else throw new PreflightError('SOURCE_REJECTED', 'path');
        }
      };
      await visit('');
      return files.sort();
    } catch (error) {
      if (error instanceof PreflightError) throw error;
      throw new PreflightError('SOURCE_REJECTED', 'read');
    }
  }
}
