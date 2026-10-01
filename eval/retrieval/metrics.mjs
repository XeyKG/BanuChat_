const TOP_K = 5;

function fail(message) {
  throw new TypeError(`Entrada inválida para métricas K2: ${message}`);
}

function validateChunkIds(value, label, { allowDuplicates = false } = {}) {
  const entries = value instanceof Set ? [...value] : value;
  if (!Array.isArray(entries)) {
    fail(`${label} debe ser un array o Set`);
  }
  if (entries.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    fail(`${label} solo puede contener chunk_id no vacíos`);
  }
  if (!allowDuplicates && new Set(entries).size !== entries.length) {
    fail(`${label} no puede contener chunk_id duplicados`);
  }
  return entries;
}

export function calculateCaseMetrics(relevant, retrieved) {
  const relevantIds = validateChunkIds(relevant, "relevant");
  const retrievedIds = validateChunkIds(retrieved, "retrieved", {
    allowDuplicates: true,
  });
  if (relevantIds.length === 0) {
    fail("relevant debe contener al menos un chunk_id");
  }
  if (retrievedIds.length !== TOP_K) {
    fail(`retrieved debe contener exactamente ${TOP_K} posiciones`);
  }

  const relevantSet = new Set(relevantIds);
  const firstIndex = retrievedIds.findIndex((chunkId) => relevantSet.has(chunkId));
  const firstRelevantRank = firstIndex === -1 ? null : firstIndex + 1;
  const relevantRetrievedCount = new Set(
    retrievedIds.filter((chunkId) => relevantSet.has(chunkId)),
  ).size;

  return {
    first_relevant_rank: firstRelevantRank,
    reciprocal_rank_at_5:
      firstRelevantRank === null ? 0 : 1 / firstRelevantRank,
    relevant_retrieved_count: relevantRetrievedCount,
    precision_at_5: relevantRetrievedCount / TOP_K,
    recall_at_5: relevantRetrievedCount / relevantSet.size,
    hit_at_5: relevantRetrievedCount > 0 ? 1 : 0,
  };
}

function validateCaseMetric(value, index) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`caseMetrics[${index}] debe ser un objeto`);
  }
  const numericFields = [
    "reciprocal_rank_at_5",
    "precision_at_5",
    "recall_at_5",
    "hit_at_5",
  ];
  for (const field of numericFields) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      fail(`caseMetrics[${index}].${field} debe ser finito`);
    }
  }
  if (
    !(
      value.first_relevant_rank === null ||
      (Number.isSafeInteger(value.first_relevant_rank) &&
        value.first_relevant_rank >= 1 &&
        value.first_relevant_rank <= TOP_K)
    )
  ) {
    fail(`caseMetrics[${index}].first_relevant_rank debe ser null o un rank 1..${TOP_K}`);
  }
  if (
    !Number.isSafeInteger(value.relevant_retrieved_count) ||
    value.relevant_retrieved_count < 0 ||
    value.relevant_retrieved_count > TOP_K
  ) {
    fail(`caseMetrics[${index}].relevant_retrieved_count debe ser un entero 0..${TOP_K}`);
  }
  for (const field of ["reciprocal_rank_at_5", "precision_at_5", "recall_at_5"]) {
    if (value[field] < 0 || value[field] > 1) {
      fail(`caseMetrics[${index}].${field} debe estar entre 0 y 1`);
    }
  }
  if (value.hit_at_5 !== 0 && value.hit_at_5 !== 1) {
    fail(`caseMetrics[${index}].hit_at_5 debe ser 0 o 1`);
  }
  const expectedReciprocalRank =
    value.first_relevant_rank === null ? 0 : 1 / value.first_relevant_rank;
  if (
    value.reciprocal_rank_at_5 !== expectedReciprocalRank ||
    value.precision_at_5 !== value.relevant_retrieved_count / TOP_K ||
    value.hit_at_5 !== (value.relevant_retrieved_count > 0 ? 1 : 0)
  ) {
    fail(`caseMetrics[${index}] contiene métricas inconsistentes`);
  }
}

export function aggregateMetrics(caseMetrics, totalRelevantCount) {
  if (!Array.isArray(caseMetrics) || caseMetrics.length === 0) {
    fail("caseMetrics debe ser un array no vacío");
  }
  if (!Number.isSafeInteger(totalRelevantCount) || totalRelevantCount < 1) {
    fail("totalRelevantCount debe ser un entero positivo");
  }
  caseMetrics.forEach(validateCaseMetric);

  const casesEvaluated = caseMetrics.length;
  const sum = (field) =>
    caseMetrics.reduce((total, metric) => total + metric[field], 0);
  const casesWithHit = sum("hit_at_5");

  return {
    cases_evaluated: casesEvaluated,
    mrr_at_5: sum("reciprocal_rank_at_5") / casesEvaluated,
    mean_precision_at_5: sum("precision_at_5") / casesEvaluated,
    mean_recall_at_5: sum("recall_at_5") / casesEvaluated,
    hit_rate_at_5: casesWithHit / casesEvaluated,
    cases_with_hit: casesWithHit,
    cases_without_hit: casesEvaluated - casesWithHit,
    theoretical_max_mean_precision_at_5:
      totalRelevantCount / (casesEvaluated * TOP_K),
  };
}
