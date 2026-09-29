import { isDeepStrictEqual } from 'node:util';
import { EMBEDDING_MODEL } from './types.js';
import type { EmbeddingConfig } from './types.js';
import { OllamaError, validEmbedding } from './errors.js';

export function effectiveConfig(runtime: string, digest: string, contextLength: number): EmbeddingConfig {
  validEmbedding(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(runtime)
    && !runtime.includes('\n'), 'metadata');
  validEmbedding(/^(?:sha256:)?[0-9a-f]{64}$/.test(digest) && [64, 71].includes(digest.length), 'metadata');
  validEmbedding(Number.isSafeInteger(contextLength) && contextLength > 0, 'metadata');
  const recipe = () => ({ dimensions: 1024 as const, truncate: false as const,
    input_prefix: null, normalization: 'none' as const, options: { num_ctx: contextLength } });
  return { provider: 'ollama', model: EMBEDDING_MODEL, model_revision: digest, dimension: 1024,
    distance_metric: 'cosine', parameters: { runtime_version: runtime, document: recipe(), query: recipe() } };
}
export function validateEffectiveConfig(config: EmbeddingConfig): void {
  validEmbedding(isDeepStrictEqual(config, effectiveConfig(config.parameters.runtime_version,
    config.model_revision, config.parameters.document.options.num_ctx)), 'metadata');
}
export function assertSameRuntime(expected: EmbeddingConfig, actual: EmbeddingConfig): void {
  if (!isDeepStrictEqual(expected, actual)) throw new OllamaError('INVALID_EMBEDDING', 'runtime_changed');
}
