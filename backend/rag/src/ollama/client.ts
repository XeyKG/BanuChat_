import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from './types.js';
import type { EmbeddingClient, EmbeddingConfig } from './types.js';
import { OllamaError, validEmbedding } from './errors.js';
import { assertSameRuntime, effectiveConfig, validateEffectiveConfig } from './config.js';

function record(value: unknown): Record<string, unknown> {
  validEmbedding(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
export function validateVectors(value: unknown, count: number): number[][] {
  validEmbedding(Array.isArray(value) && value.length === count);
  return Array.from(value).map((vector: unknown) => {
    validEmbedding(Array.isArray(vector) && vector.length === EMBEDDING_DIMENSION);
    validEmbedding(Array.from(vector).every((component: unknown) => typeof component === 'number' && Number.isFinite(component)));
    const numbers = vector as number[];
    // pgvector stores float32: reject values that would become infinity or all zero.
    validEmbedding(numbers.every(number => Number.isFinite(Math.fround(number)))
      && numbers.some(number => Math.fround(number) !== 0));
    return [...numbers];
  });
}
export function validateEmbedResponse(value: unknown, count: number): number[][] {
  const response = record(value);
  validEmbedding(!('error' in response) && response['truncated'] !== true);
  validEmbedding(response['model'] === undefined || response['model'] === EMBEDDING_MODEL);
  return validateVectors(response['embeddings'], count);
}
export function vectorLiteral(vector: readonly number[]): string {
  const validated = validateVectors([vector], 1)[0]!;
  return `[${validated.join(',')}]`;
}

export class OllamaClient implements EmbeddingClient {
  private readonly base: URL;
  private embedCalls = 0;
  get embedRequestCount(): number { return this.embedCalls; }
  constructor(baseUrl: string, private readonly timeoutMs = 120_000) {
    try { this.base = new URL(baseUrl); }
    catch { throw new OllamaError('OLLAMA_UNAVAILABLE', 'input'); }
    // MVP local-only configuration; redirects are never followed to other hosts.
    validEmbedding(this.base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(this.base.hostname)
      && this.base.pathname === '/' && !this.base.username && !this.base.password && !this.base.search && !this.base.hash, 'input');
    validEmbedding(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 300_000, 'input');
  }
  private async request(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await fetch(new URL(path, this.base), { method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (!response.ok) throw new OllamaError(response.status >= 500 ? 'OLLAMA_UNAVAILABLE' : 'INVALID_EMBEDDING', 'response');
      try { return await response.json() as unknown; }
      catch { throw new OllamaError('INVALID_EMBEDDING', 'response'); }
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('OLLAMA_UNAVAILABLE', 'transport');
    }
  }
  async inspect(): Promise<EmbeddingConfig> {
    const version = record(await this.request('/api/version'))['version'];
    validEmbedding(typeof version === 'string', 'metadata');
    const models = record(await this.request('/api/tags'))['models'];
    validEmbedding(Array.isArray(models), 'metadata');
    const model = models.map(record).find(row => row['name'] === EMBEDDING_MODEL || row['model'] === EMBEDDING_MODEL);
    if (!model) throw new OllamaError('OLLAMA_UNAVAILABLE', 'model_missing');
    validEmbedding(typeof model['digest'] === 'string', 'metadata');
    const show = record(await this.request('/api/show', { model: EMBEDDING_MODEL }));
    validEmbedding(Array.isArray(show['capabilities']) && show['capabilities'].includes('embedding'), 'metadata');
    const info = record(show['model_info']);
    const architecture = info['general.architecture'];
    validEmbedding(typeof architecture === 'string', 'metadata');
    const context = info[`${architecture}.context_length`];
    const dimensions = info[`${architecture}.embedding_length`];
    validEmbedding(typeof context === 'number' && typeof dimensions === 'number' && dimensions >= 1024, 'metadata');
    return effectiveConfig(version, model['digest'], context);
  }
  async embed(inputs: readonly string[], expected: EmbeddingConfig): Promise<number[][]> {
    validateEffectiveConfig(expected);
    validEmbedding(inputs.length > 0 && inputs.length <= 10 && inputs.every(text => typeof text === 'string' && text.length > 0), 'input');
    assertSameRuntime(expected, await this.inspect());
    this.embedCalls++;
    const result = validateEmbedResponse(await this.request('/api/embed', { model: EMBEDDING_MODEL,
      input: [...inputs], dimensions: 1024, truncate: false, options: expected.parameters.document.options }), inputs.length);
    assertSameRuntime(expected, await this.inspect());
    return result;
  }
}
