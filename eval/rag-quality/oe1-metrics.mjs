import { aggregateMetrics, calculateCaseMetrics } from "../retrieval/metrics.mjs";

export { calculateCaseMetrics };

const EXCLUDED = new Set(["error", "timeout", "not_evaluable", "abstention"]);

export function aggregateRetrievalOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) throw new TypeError("outcomes debe ser un array no vacío");
  const counts = { planned: outcomes.length, attempted: 0, completed: 0, error: 0, timeout: 0, not_evaluable: 0, abstention: 0 };
  const completed = [];
  let totalRelevant = 0;
  for (const outcome of outcomes) {
    if (!outcome || typeof outcome !== "object" || typeof outcome.status !== "string") throw new TypeError("outcome inválido");
    if (outcome.status !== "not_evaluable") counts.attempted += 1;
    if (outcome.status === "completed") {
      counts.completed += 1;
      completed.push(outcome.metrics);
      totalRelevant += outcome.relevant_count;
    } else if (EXCLUDED.has(outcome.status)) counts[outcome.status] += 1;
    else throw new TypeError(`status desconocido: ${outcome.status}`);
  }
  return {
    denominators: counts,
    content_metrics_exclude: [...EXCLUDED],
    metrics: completed.length === 0 ? null : aggregateMetrics(completed, totalRelevant),
  };
}
