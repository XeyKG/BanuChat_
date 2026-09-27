import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestContext } from 'node:test';
import { PreflightError, sha256 } from '../src/index.js';
import type { Json, Manifest } from '../src/types.js';

export const realSource = fileURLToPath(new URL('../../../data/synthetic/', import.meta.url));

export async function temporaryDirectory(t: TestContext): Promise<string> {
  const tempRoot = path.resolve(os.tmpdir());
  const directory = await mkdtemp(path.join(tempRoot, 'banuchat-rag-test-'));
  t.after(async () => {
    // Cleanup is limited to this test's exact mkdtemp directory, never the repository.
    if (path.dirname(directory) !== tempRoot || !path.basename(directory).startsWith('banuchat-rag-test-')) throw new Error('Unsafe test cleanup');
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });
  return directory;
}

export async function copySource(t: TestContext): Promise<string> {
  const directory = await temporaryDirectory(t);
  const root = path.join(directory, 'synthetic');
  await cp(realSource, root, { recursive: true });
  return root;
}

export async function readJson(root: string, relative: string): Promise<Json> {
  return JSON.parse(await readFile(path.join(root, relative), 'utf8')) as Json;
}
export function object(value: Json | undefined): { [key: string]: Json } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Fixture object expected');
  return value;
}
export function array(value: Json | undefined): Json[] {
  if (!Array.isArray(value)) throw new Error('Fixture array expected');
  return value;
}
export async function writeJson(root: string, relative: string, value: unknown): Promise<void> {
  await writeFile(path.join(root, relative), JSON.stringify(value, null, 2) + '\n', 'utf8');
}
export async function refreshHash(root: string, relative: string): Promise<void> {
  const manifest = await readJson(root, 'manifest.json') as unknown as Manifest;
  const hash = sha256(await readFile(path.join(root, relative)));
  for (const file of manifest.files) if (file.path === relative) file.sha256 = hash;
  for (const item of manifest.items) if (item.path === relative) item.sha256 = hash;
  await writeJson(root, 'manifest.json', manifest);
}
export async function mutateCatalog(root: string, relative: string, mutate: (value: { [key: string]: Json }) => void): Promise<void> {
  const value = object(await readJson(root, relative));
  mutate(value);
  await writeJson(root, relative, value);
  await refreshHash(root, relative);
}
export function failure(code: PreflightError['code'], category?: PreflightError['category']) {
  return (error: unknown): boolean => error instanceof PreflightError && error.code === code
    && (category === undefined || error.category === category);
}
