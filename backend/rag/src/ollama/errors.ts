export class OllamaError extends Error {
  constructor(readonly code: 'OLLAMA_UNAVAILABLE' | 'INVALID_EMBEDDING',
    readonly reason: 'transport' | 'model_missing' | 'runtime_changed' | 'metadata' | 'response' | 'input') {
    super(`${code}: ${reason}`);
    this.name = 'OllamaError';
  }
  toJSON() { return { code: this.code, reason: this.reason }; }
}
export function validEmbedding(condition: unknown, reason: OllamaError['reason'] = 'response'): asserts condition {
  if (!condition) throw new OllamaError('INVALID_EMBEDDING', reason);
}
