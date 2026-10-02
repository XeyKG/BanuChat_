import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { SqlQueryClient } from "../data/sql-client.js";
import { DocumentArtifactError } from "./document-artifact-errors.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const INVALID_PATH_CHARACTER = /[^A-Za-z0-9_./-]/u;

// application/ has the same depth in src/ and dist/; never use process.cwd().
const SYNTHETIC_ROOT = fileURLToPath(
  new URL("../../../../data/synthetic/", import.meta.url),
);

const DOCUMENT_ARTIFACT_QUERY = `
SELECT
  dv.id,
  dv.source_path,
  dv.source_sha256
FROM banuchat.document_versions dv
JOIN banuchat.dataset_releases dr
  ON dr.dataset_id = dv.dataset_id
 AND dr.id = dv.dataset_release_id
WHERE dv.id = $1
  AND dv.processing_status = 'ready'
  AND dr.status = 'ready'
`;

export interface DocumentArtifactFileSystem {
  realpath(path: string): Promise<string>;
  stat(path: string): Promise<{
    isFile(): boolean;
    isDirectory(): boolean;
  }>;
  readFile(path: string): Promise<Buffer>;
}

export interface DocumentArtifactStorage {
  root: string;
  filesystem?: DocumentArtifactFileSystem;
}

export interface DocumentArtifactInput {
  document_version_id: string;
}

export interface DocumentArtifactResult {
  document_version_id: string;
  bytes: Buffer;
}

const FILESYSTEM: DocumentArtifactFileSystem = { realpath, stat, readFile };

export function isPathInside(root: string, target: string): boolean {
  const path = relative(root, target);
  return (
    path !== "" && path !== ".." &&
    !path.startsWith(`..${sep}`) && !isAbsolute(path)
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 && UUID_PATTERN.test(value);
}

function isDocumentPath(value: unknown): value is string {
  return (
    typeof value === "string" && value.startsWith("documents/") &&
    !INVALID_PATH_CHARACTER.test(value) &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function classifyTargetError(error: unknown): DocumentArtifactError {
  if (error instanceof DocumentArtifactError) return error;
  if (typeof error === "object" && error !== null && "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")) {
    return new DocumentArtifactError("not_found");
  }
  return new DocumentArtifactError("filesystem_error");
}

export async function getDocumentArtifact(
  client: SqlQueryClient,
  input: DocumentArtifactInput,
  storage: DocumentArtifactStorage = { root: SYNTHETIC_ROOT },
): Promise<DocumentArtifactResult> {
  if (input === null || typeof input !== "object" || !isUuid(input.document_version_id)) {
    throw new DocumentArtifactError("invalid_argument");
  }
  const documentVersionId = input.document_version_id.toLowerCase();
  const result = await client.query<unknown>(DOCUMENT_ARTIFACT_QUERY, [documentVersionId]);
  if (result.rows.length === 0) throw new DocumentArtifactError("not_found");

  const row = result.rows[0];
  if (result.rows.length !== 1 || typeof row !== "object" || row === null ||
    Array.isArray(row) || !("id" in row) || !isUuid(row.id) ||
    row.id.toLowerCase() !== documentVersionId ||
    !("source_path" in row) || !isDocumentPath(row.source_path) ||
    !("source_sha256" in row) || typeof row.source_sha256 !== "string" ||
    row.source_sha256.length !== 64 || !SHA256_PATTERN.test(row.source_sha256)) {
    throw new DocumentArtifactError("invalid_database_result");
  }

  const filesystem = storage.filesystem ?? FILESYSTEM;
  let root: string;
  try {
    if (!isAbsolute(storage.root)) throw new DocumentArtifactError("filesystem_error");
    root = await filesystem.realpath(storage.root);
    if (!isAbsolute(root) || !(await filesystem.stat(root)).isDirectory()) {
      throw new DocumentArtifactError("filesystem_error");
    }
  } catch {
    // A missing/invalid root is a runtime problem, not a missing version.
    throw new DocumentArtifactError("filesystem_error");
  }

  const candidate = resolve(root, row.source_path);
  if (!isPathInside(root, candidate)) {
    throw new DocumentArtifactError("invalid_database_result");
  }

  let bytes: Buffer;
  try {
    const target = await filesystem.realpath(candidate);
    if (!isAbsolute(target) || !isPathInside(root, target) ||
      !(await filesystem.stat(target)).isFile()) {
      throw new DocumentArtifactError("not_found");
    }
    bytes = await filesystem.readFile(target);
  } catch (error) {
    throw classifyTargetError(error);
  }

  if (createHash("sha256").update(bytes).digest("hex") !== row.source_sha256) {
    throw new DocumentArtifactError("not_found");
  }
  return { document_version_id: documentVersionId, bytes };
}
