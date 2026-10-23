import type { SqlQueryClient } from "../data/sql-client.js";
import { DocumentRetrievalError } from "./document-retrieval-errors.js";

const EMBEDDING_DIMENSION = 1024;
const MAX_TOP_K = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_PATH_PATTERN = /^documents\/[A-Za-z0-9_./-]+$/;

const RELEASE_AVAILABLE_QUERY = `
SELECT EXISTS (
  SELECT 1
  FROM banuchat.dataset_releases dr
  WHERE dr.id = $1
    AND dr.status = 'ready'
) AS available
`;

const DOCUMENT_RETRIEVAL_QUERY = `
SELECT
  dc.id AS chunk_id,
  dc.document_version_id,
  dv.document_id,
  d.document_key,
  dv.title,
  dc.ordinal,
  dc.content,
  dc.locator AS chunk_locator,
  dc.page_start,
  dc.page_end,
  dv.source_path,
  dv.source_locator,
  dv.source_sha256,
  dc.dataset_release_id AS release_id,
  dc.embedding <=> $2::vector AS cosine_distance
FROM banuchat.document_chunks dc
JOIN banuchat.document_versions dv
  ON dv.id = dc.document_version_id
 AND dv.dataset_release_id = dc.dataset_release_id
JOIN banuchat.documents d
  ON d.id = dv.document_id
 AND d.dataset_id = dv.dataset_id
WHERE dc.dataset_release_id = $1
  AND dv.dataset_release_id = $1
  AND dv.processing_status = 'ready'
  AND d.retrieval_mode = 'chunked'
  AND dc.embedding IS NOT NULL
ORDER BY cosine_distance ASC, dc.document_version_id ASC, dc.ordinal ASC
LIMIT $3
`;

export interface DocumentRetrievalInput {
  release_id: string;
  query_embedding: readonly number[];
  top_k: number;
}

export interface RetrievedDocumentChunk {
  chunk_id: string;
  document_version_id: string;
  document_id: string;
  document_key: string;
  title: string;
  ordinal: number;
  content: string;
  chunk_locator: string;
  page_start: number | null;
  page_end: number | null;
  source_path: string;
  source_locator: string;
  source_sha256: string;
  release_id: string;
  cosine_distance: number;
  cosine_similarity: number;
}

interface ReleaseAvailableRow {
  available: unknown;
}

function reject(
  reason:
    | "invalid_argument"
    | "release_not_available"
    | "invalid_database_result",
): never {
  throw new DocumentRetrievalError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) > 0);
}

function vectorLiteral(value: unknown): string {
  if (!Array.isArray(value) || value.length !== EMBEDDING_DIMENSION) {
    return reject("invalid_argument");
  }

  let hasNonzeroComponent = false;
  const components = value.map((component) => {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      return reject("invalid_argument");
    }
    if (component !== 0) {
      hasNonzeroComponent = true;
    }
    return String(component);
  });

  if (!hasNonzeroComponent) {
    return reject("invalid_argument");
  }
  return `[${components.join(",")}]`;
}

export function validateDocumentRetrievalInput(input: DocumentRetrievalInput): {
  releaseId: string;
  queryVector: string;
  topK: number;
} {
  if (
    !isRecord(input) ||
    !isUuid(input.release_id) ||
    typeof input.top_k !== "number" ||
    !Number.isInteger(input.top_k) ||
    input.top_k < 1 ||
    input.top_k > MAX_TOP_K
  ) {
    return reject("invalid_argument");
  }

  return {
    releaseId: input.release_id,
    queryVector: vectorLiteral(input.query_embedding),
    topK: input.top_k,
  };
}

export function normalizeDocumentRetrievalRow(
  row: unknown,
  requestedReleaseId: string,
): RetrievedDocumentChunk {
  if (
    !isRecord(row) ||
    !isUuid(row.chunk_id) ||
    !isUuid(row.document_version_id) ||
    !isUuid(row.document_id) ||
    typeof row.document_key !== "string" ||
    !STABLE_KEY_PATTERN.test(row.document_key) ||
    !isNonblank(row.title) ||
    !Number.isInteger(row.ordinal) ||
    (row.ordinal as number) < 0 ||
    !isNonblank(row.content) ||
    !isNonblank(row.chunk_locator) ||
    !isNullablePositiveInteger(row.page_start) ||
    !isNullablePositiveInteger(row.page_end) ||
    (row.page_end !== null &&
      (row.page_start === null || row.page_end < row.page_start)) ||
    typeof row.source_path !== "string" ||
    !SOURCE_PATH_PATTERN.test(row.source_path) ||
    row.source_path.includes("//") ||
    row.source_path.endsWith("/") ||
    !isNonblank(row.source_locator) ||
    typeof row.source_sha256 !== "string" ||
    !SHA256_PATTERN.test(row.source_sha256) ||
    row.release_id !== requestedReleaseId ||
    typeof row.cosine_distance !== "number" ||
    !Number.isFinite(row.cosine_distance) ||
    row.cosine_distance < 0 ||
    row.cosine_distance > 2
  ) {
    return reject("invalid_database_result");
  }

  return {
    chunk_id: row.chunk_id,
    document_version_id: row.document_version_id,
    document_id: row.document_id,
    document_key: row.document_key,
    title: row.title,
    ordinal: row.ordinal as number,
    content: row.content,
    chunk_locator: row.chunk_locator,
    page_start: row.page_start,
    page_end: row.page_end,
    source_path: row.source_path,
    source_locator: row.source_locator,
    source_sha256: row.source_sha256,
    release_id: row.release_id,
    cosine_distance: row.cosine_distance,
    cosine_similarity: 1 - row.cosine_distance,
  };
}

export async function retrieveDocumentChunks(
  client: SqlQueryClient,
  input: DocumentRetrievalInput,
): Promise<RetrievedDocumentChunk[]> {
  const validated = validateDocumentRetrievalInput(input);
  const availability = await client.query<ReleaseAvailableRow>(
    RELEASE_AVAILABLE_QUERY,
    [validated.releaseId],
  );

  if (
    availability.rows.length !== 1 ||
    availability.rows[0]?.available !== true
  ) {
    if (
      availability.rows.length === 1 &&
      availability.rows[0]?.available === false
    ) {
      return reject("release_not_available");
    }
    return reject("invalid_database_result");
  }

  const result = await client.query<unknown>(DOCUMENT_RETRIEVAL_QUERY, [
    validated.releaseId,
    validated.queryVector,
    validated.topK,
  ]);
  return result.rows.map((row) => normalizeDocumentRetrievalRow(row, validated.releaseId));
}

export type DocumentChunkRetriever = typeof retrieveDocumentChunks;
