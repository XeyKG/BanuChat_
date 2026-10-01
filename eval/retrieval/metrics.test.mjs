import assert from "node:assert/strict";
import test from "node:test";

import { aggregateMetrics, calculateCaseMetrics } from "./metrics.mjs";

const top5 = (...ids) => [...ids, "n1", "n2", "n3", "n4", "n5"].slice(0, 5);

test("relevante en rank 1 produce RR 1", () => {
  assert.equal(calculateCaseMetrics(["r1"], top5("r1")).reciprocal_rank_at_5, 1);
});

test("relevante en rank 2 produce RR 0.5", () => {
  assert.equal(
    calculateCaseMetrics(["r1"], top5("x", "r1")).reciprocal_rank_at_5,
    0.5,
  );
});

test("ningún relevante produce RR 0", () => {
  const metric = calculateCaseMetrics(["r1"], top5("x"));
  assert.equal(metric.first_relevant_rank, null);
  assert.equal(metric.reciprocal_rank_at_5, 0);
});

test("un relevante de uno produce P@5 .2, Recall 1 y Hit 1", () => {
  const metric = calculateCaseMetrics(["r1"], top5("r1"));
  assert.equal(metric.precision_at_5, 0.2);
  assert.equal(metric.recall_at_5, 1);
  assert.equal(metric.hit_at_5, 1);
});

test("uno de dos relevantes produce P@5 .2, Recall .5 y Hit 1", () => {
  const metric = calculateCaseMetrics(["r1", "r2"], top5("r1"));
  assert.equal(metric.precision_at_5, 0.2);
  assert.equal(metric.recall_at_5, 0.5);
  assert.equal(metric.hit_at_5, 1);
});

test("dos de dos relevantes producen P@5 .4 y Recall 1", () => {
  const metric = calculateCaseMetrics(["r1", "r2"], top5("r1", "r2"));
  assert.equal(metric.precision_at_5, 0.4);
  assert.equal(metric.recall_at_5, 1);
});

test("cero relevantes recuperados produce P@5, Recall y Hit 0", () => {
  const metric = calculateCaseMetrics(["r1"], top5("x"));
  assert.equal(metric.precision_at_5, 0);
  assert.equal(metric.recall_at_5, 0);
  assert.equal(metric.hit_at_5, 0);
});

test("aggregate calcula promedios, hits y máximo teórico", () => {
  const first = calculateCaseMetrics(["r1"], top5("r1"));
  const second = calculateCaseMetrics(["r2"], top5("x", "r2"));
  const miss = calculateCaseMetrics(["r3"], top5("x"));
  assert.deepEqual(aggregateMetrics([first, second, miss], 3), {
    cases_evaluated: 3,
    mrr_at_5: 0.5,
    mean_precision_at_5: 0.4 / 3,
    mean_recall_at_5: 2 / 3,
    hit_rate_at_5: 2 / 3,
    cases_with_hit: 2,
    cases_without_hit: 1,
    theoretical_max_mean_precision_at_5: 0.2,
  });
});

test("resultados duplicados no inflan relevant_retrieved_count", () => {
  const metric = calculateCaseMetrics(
    ["r1", "r2"],
    ["r1", "r1", "x", "y", "z"],
  );
  assert.equal(metric.relevant_retrieved_count, 1);
  assert.equal(metric.precision_at_5, 0.2);
  assert.equal(metric.recall_at_5, 0.5);
});

test("rechaza inputs imposibles en vez de producir NaN", () => {
  assert.throws(() => calculateCaseMetrics([], top5("x")), TypeError);
  assert.throws(() => calculateCaseMetrics(["r1"], ["r1"]), TypeError);
  assert.throws(() => calculateCaseMetrics(["r1", "r1"], top5("r1")), TypeError);
  assert.throws(() => aggregateMetrics([], 0), TypeError);
  assert.throws(
    () => aggregateMetrics([{ reciprocal_rank_at_5: Number.NaN }], 1),
    TypeError,
  );
});

