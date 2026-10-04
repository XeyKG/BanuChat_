import { isDeepStrictEqual } from 'node:util';
import { EMBEDDING_MODEL } from './types.js';
import type { EmbeddingConfig } from './types.js';
import { OllamaError, validEmbedding } from './errors.js';

// OPT-1C: query=4096 retained the same top-5 set in all ten L1 cases.
// Document embeddings continue to use the model's native context length.
export const QUERY_CONTEXT_LENGTH = 4096;

export function effectiveConfig(runtime: string, digest: string, contextLength: number): EmbeddingConfig {
  validEmbedding(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(runtime)
    && !runtime.includes('\n'), 'metadata');
  validEmbedding(/^(?:sha256:)?[0-9a-f]{64}$/.test(digest) && [64, 71].includes(digest.length), 'metadata');
  validEmbedding(Number.isSafeInteger(contextLength) && contextLength >= QUERY_CONTEXT_LENGTH, 'metadata');
  const recipe = (numCtx: number) => ({ dimensions: 1024 as const, truncate: false as const,
    input_prefix: null, normalization: 'none' as const, options: { num_ctx: numCtx } });
  return { provider: 'ollama', model: EMBEDDING_MODEL, model_revision: digest, dimension: 1024,
    distance_metric: 'cosine', parameters: { runtime_version: runtime,
      document: recipe(contextLength), query: recipe(QUERY_CONTEXT_LENGTH) } };
}
export function validateEffectiveConfig(config: EmbeddingConfig): void {
  validEmbedding(isDeepStrictEqual(config, effectiveConfig(config.parameters.runtime_version,
    config.model_revision, config.parameters.document.options.num_ctx)), 'metadata');
}
export function assertSameRuntime(expected: EmbeddingConfig, actual: EmbeddingConfig): void {
  if (!isDeepStrictEqual(expected, actual)) throw new OllamaError('INVALID_EMBEDDING', 'runtime_changed');
}
