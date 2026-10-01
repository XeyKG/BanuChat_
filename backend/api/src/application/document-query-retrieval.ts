import type { SqlQueryClient } from "../data/sql-client.js";
import {
  QueryEmbeddingClientError,
  type QueryEmbeddingClient,
  type QueryEmbeddingConfig,
  type QueryEmbeddingRecipe,
} from "../retrieval/query-embedding-client.js";
import {
  retrieveDocumentChunks,
  type RetrievedDocumentChunk,
} from "./document-retrieval.js";
import { DocumentRetrievalError } from "./document-retrieval-errors.js";
import {
  DocumentQueryRetrievalError,
  type DocumentQueryRetrievalErrorReason,
} from "./document-query-retrieval-errors.js";

const MODEL = "qwen3-embedding:0.6b";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODEL_REVISION_PATTERN = /^(?:sha256:)?[0-9a-f]{64}$/;
const RUNTIME_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;

const RELEASE_EMBEDDING_CONFIG_QUERY = `
SELECT
  ec.provider,
  ec.model,
  ec.model_revision,
  ec.dimension,
  ec.distance_metric,
  ec.parameters
FROM banuchat.dataset_releases dr
JOIN banuchat.embedding_configs ec ON ec.id = dr.embedding_config_id
WHERE dr.id = $1
  AND dr.status = 'ready'
`;

export interface DocumentQueryRetrievalDependencies {
  sql: SqlQueryClient;
  query_embedding_client: QueryEmbeddingClient;
}

export interface DocumentQueryRetrievalInput {
  release_id: string;
  query: string;
  top_k: number;
}

function reject(reason: DocumentQueryRetrievalErrorReason): never {
  throw new DocumentQueryRetrievalError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInput(input: unknown): DocumentQueryRetrievalInput {
  if (
    !isRecord(input) ||
    typeof input.release_id !== "string" ||
    !UUID_PATTERN.test(input.release_id) ||
    typeof input.query !== "string" ||
    input.query.trim().length === 0 ||
    [...input.query].length > 4000 ||
    typeof input.top_k !== "number" ||
    !Number.isInteger(input.top_k) ||
    input.top_k < 1 ||
    input.top_k > 20
  ) {
    return reject("invalid_argument");
  }
  return input as unknown as DocumentQueryRetrievalInput;
}

function validateQueryRecipe(value: unknown): QueryEmbeddingRecipe {
  if (!isRecord(value) || !isRecord(value.options)) {
    return reject("embedding_config_invalid");
  }
  if (
    Object.keys(value).sort().join(",") !==
      "dimensions,input_prefix,normalization,options,truncate" ||
    Object.keys(value.options).join(",") !== "num_ctx" ||
    value.dimensions !== 1024 ||
    value.truncate !== false ||
    value.input_prefix !== null ||
    value.normalization !== "none" ||
    !Number.isSafeInteger(value.options.num_ctx) ||
    (value.options.num_ctx as number) < 1
  ) {
    return reject("embedding_config_invalid");
  }
  return {
    dimensions: 1024,
    truncate: false,
    input_prefix: null,
    normalization: "none",
    options: { num_ctx: value.options.num_ctx as number },
  };
}

function validateConfigRow(value: unknown): QueryEmbeddingConfig {
  if (!isRecord(value) || !isRecord(value.parameters)) {
    return reject("embedding_config_invalid");
  }
  const runtimeVersion = value.parameters.runtime_version;
  if (
    value.provider !== "ollama" ||
    value.model !== MODEL ||
    typeof value.model_revision !== "string" ||
    !MODEL_REVISION_PATTERN.test(value.model_revision) ||
    value.dimension !== 1024 ||
    value.distance_metric !== "cosine" ||
    typeof runtimeVersion !== "string" ||
    !RUNTIME_VERSION_PATTERN.test(runtimeVersion) ||
    runtimeVersion.includes("\n")
  ) {
    return reject("embedding_config_invalid");
  }
  return {
    provider: "ollama",
    model: MODEL,
    model_revision: value.model_revision,
    dimension: 1024,
    distance_metric: "cosine",
    runtime_version: runtimeVersion,
    query: validateQueryRecipe(value.parameters.query),
  };
}

export async function retrieveDocumentChunksForQuery(
  dependencies: DocumentQueryRetrievalDependencies,
  input: DocumentQueryRetrievalInput,
): Promise<RetrievedDocumentChunk[]> {
  const validated = validateInput(input);
  const configResult = await dependencies.sql.query<unknown>(
    RELEASE_EMBEDDING_CONFIG_QUERY,
    [validated.release_id],
  );
  if (configResult.rows.length === 0) {
    return reject("release_not_available");
  }
  if (configResult.rows.length !== 1) {
    return reject("invalid_database_result");
  }
  const config = validateConfigRow(configResult.rows[0]);

  let vector: number[];
  try {
    vector = await dependencies.query_embedding_client.embedQuery(
      validated.query,
      config,
    );
  } catch (error) {
    if (error instanceof QueryEmbeddingClientError) {
      return reject(error.reason);
    }
    return reject("embedding_unavailable");
  }

  try {
    return await retrieveDocumentChunks(dependencies.sql, {
      release_id: validated.release_id,
      query_embedding: vector,
      top_k: validated.top_k,
    });
  } catch (error) {
    if (error instanceof DocumentRetrievalError) {
      return reject(
        error.reason === "invalid_argument"
          ? "invalid_embedding_response"
          : error.reason,
      );
    }
    throw error;
  }
}
