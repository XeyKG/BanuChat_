import type { SqlQueryClient } from "../data/sql-client.js";
import { resolveCurrentRelease } from "./current-release.js";
import { DocumentLookupError } from "./document-lookup-errors.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const DOCUMENT_LOOKUP_QUERY_BASE = `
SELECT
  d.document_key,
  d.retrieval_mode,
  dv.id AS document_version_id,
  dv.title,
  dv.mime_type,
  dv.source_path,
  dv.source_locator,
  dv.source_sha256
FROM banuchat.document_versions dv
JOIN banuchat.documents d
  ON d.id = dv.document_id
 AND d.dataset_id = dv.dataset_id
WHERE dv.dataset_release_id = $1
  AND dv.processing_status = 'ready'
  AND dv.title = $2
`;

export type DocumentRetrievalMode = "chunked" | "full_document";

export interface DocumentLookupInput {
  query: string;
  retrieval_mode?: DocumentRetrievalMode;
  limit?: number;
}

export interface DocumentLookupDocument {
  document_key: string;
  document_version_id: string;
  title: string;
  retrieval_mode: DocumentRetrievalMode;
  mime_type: string;
  source: {
    source_kind: "document";
    source_path: string;
    source_locator: string;
    source_sha256: string;
  };
}

export interface DocumentLookupResult {
  release_id: string;
  documents: DocumentLookupDocument[];
}

function reject(reason: DocumentLookupError["reason"]): never {
  throw new DocumentLookupError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRetrievalMode(value: unknown): value is DocumentRetrievalMode {
  return value === "chunked" || value === "full_document";
}

function isDocumentSourcePath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^documents\/[A-Za-z0-9_./-]+$/u.test(value)
  ) {
    return false;
  }
  return !value
    .split("/")
    .some((segment) => segment === "." || segment === ".." || segment === "");
}

function validateInput(input: DocumentLookupInput): {
  query: string;
  retrievalMode: DocumentRetrievalMode | undefined;
  limit: number;
} {
  if (!isRecord(input) || typeof input.query !== "string") {
    return reject("invalid_argument");
  }

  const query = input.query.trim();
  const queryLength = Array.from(query).length;
  if (queryLength < MIN_QUERY_LENGTH || queryLength > MAX_QUERY_LENGTH) {
    return reject("invalid_argument");
  }
  if (
    input.retrieval_mode !== undefined &&
    !isRetrievalMode(input.retrieval_mode)
  ) {
    return reject("invalid_argument");
  }

  const limit = input.limit === undefined ? DEFAULT_LIMIT : input.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return reject("invalid_argument");
  }

  return { query, retrievalMode: input.retrieval_mode, limit };
}

function normalizeRow(row: unknown): DocumentLookupDocument {
  if (
    !isRecord(row) ||
    typeof row.document_key !== "string" ||
    !STABLE_KEY_PATTERN.test(row.document_key) ||
    typeof row.document_version_id !== "string" ||
    !UUID_PATTERN.test(row.document_version_id) ||
    !isNonblank(row.title) ||
    !isRetrievalMode(row.retrieval_mode) ||
    !isNonblank(row.mime_type) ||
    !isDocumentSourcePath(row.source_path) ||
    !isNonblank(row.source_locator) ||
    typeof row.source_sha256 !== "string" ||
    !SHA256_PATTERN.test(row.source_sha256)
  ) {
    return reject("invalid_database_result");
  }

  return {
    document_key: row.document_key,
    document_version_id: row.document_version_id,
    title: row.title,
    retrieval_mode: row.retrieval_mode,
    mime_type: row.mime_type,
    source: {
      source_kind: "document",
      source_path: row.source_path,
      source_locator: row.source_locator,
      source_sha256: row.source_sha256,
    },
  };
}

export async function lookupDocuments(
  client: SqlQueryClient,
  input: DocumentLookupInput,
): Promise<DocumentLookupResult> {
  const { query, retrievalMode, limit } = validateInput(input);
  const release = await resolveCurrentRelease(client);
  const hasModeFilter = retrievalMode !== undefined;
  const sql = hasModeFilter
    ? `${DOCUMENT_LOOKUP_QUERY_BASE}  AND d.retrieval_mode = $3\nORDER BY d.document_key ASC\nLIMIT $4\n`
    : `${DOCUMENT_LOOKUP_QUERY_BASE}ORDER BY d.document_key ASC\nLIMIT $3\n`;
  const values = hasModeFilter
    ? [release.release_id, query, retrievalMode, limit]
    : [release.release_id, query, limit];
  const result = await client.query<unknown>(sql, values);

  return {
    release_id: release.release_id,
    documents: result.rows.map(normalizeRow),
  };
}
