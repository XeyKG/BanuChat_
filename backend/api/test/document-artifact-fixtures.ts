import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import type { DocumentArtifactFileSystem, SqlQueryClient } from "../src/index.js";

export const DOCUMENT_ID = "abcdefab-cdef-4abc-8def-abcdefabcdef";
export const ARTIFACT_BYTES = Buffer.from([0, 255, 13, 10, 65, 66, 67, 0]);
export const ARTIFACT_HASH = createHash("sha256").update(ARTIFACT_BYTES).digest("hex");
export const ARTIFACT_ROOT = resolve(tmpdir(), "banuchat-artifact-fixture");
export const ARTIFACT_PATH = resolve(ARTIFACT_ROOT, "documents", "artifact.bin");
export const ARTIFACT_ROW = {
  id: DOCUMENT_ID,
  source_path: "documents/artifact.bin",
  source_sha256: ARTIFACT_HASH,
};

export class ArtifactSqlClient implements SqlQueryClient {
  readonly calls: { text: string; parameters: readonly unknown[] }[] = [];

  constructor(private readonly outcome: readonly unknown[] | Error = [ARTIFACT_ROW]) {}

  async query<T>(text: string, parameters: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.calls.push({ text, parameters });
    if (this.outcome instanceof Error) throw this.outcome;
    return { rows: [...this.outcome] as T[] };
  }
}

export function filesystemError(code: string): Error & { code: string } {
  return Object.assign(new Error(`private filesystem detail: ${ARTIFACT_PATH}`), { code });
}

export class ArtifactFileSystem implements DocumentArtifactFileSystem {
  readonly calls: { operation: string; path: string }[] = [];
  rootError?: Error;
  targetError?: Error;
  statError?: Error;
  readError?: Error;
  rootIsDirectory = true;
  targetIsFile = true;
  rootRealpath = ARTIFACT_ROOT;
  targetRealpath = ARTIFACT_PATH;
  bytes = ARTIFACT_BYTES;

  async realpath(path: string): Promise<string> {
    this.calls.push({ operation: "realpath", path });
    if (path === ARTIFACT_ROOT) {
      if (this.rootError) throw this.rootError;
      return this.rootRealpath;
    }
    if (this.targetError) throw this.targetError;
    return this.targetRealpath;
  }

  async stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }> {
    this.calls.push({ operation: "stat", path });
    if (path === this.rootRealpath) {
      return { isFile: () => !this.rootIsDirectory, isDirectory: () => this.rootIsDirectory };
    }
    if (this.statError) throw this.statError;
    return { isFile: () => this.targetIsFile, isDirectory: () => !this.targetIsFile };
  }

  async readFile(path: string): Promise<Buffer> {
    this.calls.push({ operation: "readFile", path });
    if (this.readError) throw this.readError;
    return this.bytes;
  }
}
