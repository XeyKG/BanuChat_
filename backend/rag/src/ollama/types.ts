export const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
export const EMBEDDING_DIMENSION = 1024;
export interface InputRecipe {
  dimensions: 1024; truncate: false; input_prefix: null; normalization: 'none';
  options: { num_ctx: number };
}
export interface EmbeddingConfig {
  provider: 'ollama'; model: typeof EMBEDDING_MODEL; model_revision: string;
  dimension: 1024; distance_metric: 'cosine';
  parameters: { runtime_version: string; document: InputRecipe; query: InputRecipe };
}
export interface EmbeddingClient {
  inspect(): Promise<EmbeddingConfig>;
  embed(inputs: readonly string[], expected: EmbeddingConfig): Promise<number[][]>;
}
