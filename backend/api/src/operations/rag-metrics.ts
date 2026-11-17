export function ragMetrics(stage: string, startedAt: number, metrics: Record<string, number | string> = {}): void {
  if (process.env.BANUCHAT_RAG_METRICS !== '1') return;
  console.info(JSON.stringify({
    event: 'rag_metrics',
    stage,
    elapsed_ms: Math.round(performance.now() - startedAt),
    ...metrics,
  }));
}
