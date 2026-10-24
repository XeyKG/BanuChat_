import assert from "node:assert/strict";
import test from "node:test";

import { aggregateRetrievalOutcomes, calculateCaseMetrics } from "./oe1-metrics.mjs";

test("caso perfecto, parcial y sin recuperación conservan la definición @5", () => {
  assert.deepEqual(calculateCaseMetrics(["a"], ["a", "b", "c", "d", "e"]), {
    first_relevant_rank: 1, reciprocal_rank_at_5: 1, relevant_retrieved_count: 1,
    precision_at_5: 0.2, recall_at_5: 1, hit_at_5: 1,
  });
  assert.equal(calculateCaseMetrics(["a", "b"], ["x", "a", "y", "z", "w"]).recall_at_5, 0.5);
  assert.equal(calculateCaseMetrics(["a"], ["v", "w", "x", "y", "z"]).hit_at_5, 0);
});

test("los fallos permanecen en denominadores operacionales pero no contaminan métricas", () => {
  const metrics = calculateCaseMetrics(["a"], ["a", "b", "c", "d", "e"]);
  const aggregate = aggregateRetrievalOutcomes([
    { status: "completed", metrics, relevant_count: 1 },
    { status: "error" },
    { status: "timeout" },
    { status: "not_evaluable" },
    { status: "abstention" },
  ]);
  assert.deepEqual(aggregate.denominators, {
    planned: 5, attempted: 4, completed: 1, error: 1, timeout: 1, not_evaluable: 1, abstention: 1,
  });
  assert.equal(aggregate.metrics.mrr_at_5, 1);
  assert.equal(aggregate.metrics.cases_evaluated, 1);
});

test("sin casos válidos devuelve métricas nulas y no un cero favorable", () => {
  assert.equal(aggregateRetrievalOutcomes([{ status: "error" }]).metrics, null);
});
