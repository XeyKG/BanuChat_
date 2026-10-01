export interface QueryEmbeddingRecipe {
  dimensions: 1024;
  truncate: false;
  input_prefix: null;
  normalization: "none";
  options: {
    num_ctx: number;
  };
}

export interface QueryEmbeddingConfig {
  provider: "ollama";
  model: "qwen3-embedding:0.6b";
  model_revision: string;
  dimension: 1024;
  distance_metric: "cosine";
  runtime_version: string;
  query: QueryEmbeddingRecipe;
}

export interface QueryEmbeddingClient {
  embedQuery(
    text: string,
    expectedConfig: QueryEmbeddingConfig,
  ): Promise<number[]>;
}

export type QueryEmbeddingClientErrorReason =
  | "embedding_runtime_mismatch"
  | "embedding_unavailable"
  | "invalid_embedding_response";

export class QueryEmbeddingClientError extends Error {
  constructor(readonly reason: QueryEmbeddingClientErrorReason) {
    super("Query embedding request rejected.");
    this.name = "QueryEmbeddingClientError";
  }
}
