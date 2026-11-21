import { AsyncLocalStorage } from 'node:async_hooks';

export interface RagTurnMetrics {
  embedding_ms?: number;
  retrieval_ms?: number;
  ollama_http_ms?: number;
  ollama_calls: number;
  ollama_timeouts: number;
}

const turnContext = new AsyncLocalStorage<RagTurnMetrics>();

export function withRagTurnMetrics<T>(metrics: RagTurnMetrics, operation: () => Promise<T>): Promise<T> {
  return turnContext.run(metrics, operation);
}

export function ragMetrics(stage: string, startedAt: number, metrics: Record<string, number | string> = {}): void {
  const turn = turnContext.getStore();
  const logging = process.env.BANUCHAT_RAG_METRICS === '1';
  if (!turn && !logging) return;
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (turn) {
    if (stage === 'embedding') turn.embedding_ms = (turn.embedding_ms ?? 0) + elapsedMs;
    if (stage === 'pgvector') turn.retrieval_ms = (turn.retrieval_ms ?? 0) + elapsedMs;
    if (stage === 'ollama_http') {
      turn.ollama_http_ms = (turn.ollama_http_ms ?? 0) + elapsedMs;
      turn.ollama_calls++;
      if (metrics.result === 'timeout') turn.ollama_timeouts++;
    }
  }
  if (!logging) return;
  console.info(JSON.stringify({
    event: 'rag_metrics',
    stage,
    elapsed_ms: elapsedMs,
    ...metrics,
  }));
}
