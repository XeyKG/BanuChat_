import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadDefaultIntentRouter } from "../../backend/api/dist/index.js";

const EXPECTED_ARTIFACT_TYPE = "m3_2_intent_routing_cases";
const FIXTURE_DECLARED_CATALOG_VERSION = "1.1.0-draft";
const EVALUATED_CATALOG_VERSION = "1.2.0-draft";
const EXPECTED_TOTAL_CASES = 20;
const EXPECTED_IDS = [
  "V-01",
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06",
  "V-07",
  "P-01",
  "P-02",
  "P-03",
  "P-04",
  "P-05",
  "P-06",
  "P-07",
  "A-01",
  "A-02",
  "A-03",
  "A-04",
  "A-05",
  "A-06",
];
const EXPECTED_COHORT_COUNTS = { V: 7, P: 7, A: 6 };
const EXPECTED_CATEGORY_COUNTS = {
  valid_paraphrase: 7,
  unknown_content: 4,
  unsupported: 2,
  ambiguous: 7,
};
const EXPECTED_PROVENANCE_COUNTS = {
  peer_authored: 14,
  user_authored: 6,
};
const VALID_CATEGORIES = new Set(Object.keys(EXPECTED_CATEGORY_COUNTS));
const VALID_PROVENANCES = new Set(Object.keys(EXPECTED_PROVENANCE_COUNTS));
const VALID_RESPONSE_VARIANTS = new Set([
  null,
  "greeting",
  "thanks",
  "farewell",
  "capabilities",
  "not_available",
]);
const execFileAsync = promisify(execFile);

const evaluationDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../", evaluationDirectory);
const fixtureUrl = new URL("m3-2-cases.json", evaluationDirectory);
const catalogUrl = new URL(
  "backend/api/intent-routing.catalog.json",
  repositoryRoot,
);
const resultsDirectory = new URL("results/", evaluationDirectory);
const jsonResultUrl = new URL(
  "m3-2-postweighted-reviewed.json",
  resultsDirectory,
);
const markdownResultUrl = new URL(
  "m3-2-postweighted-reviewed.md",
  resultsDirectory,
);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) => deepEqual(entry, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          deepEqual(left[key], right[key]),
      )
    );
  }
  return false;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} no contiene JSON válido.`);
  }
}

function cohortFor(testCase) {
  return testCase.id.slice(0, 1);
}

function validateCountMap(actual, expected, label, errors) {
  for (const [key, expectedCount] of Object.entries(expected)) {
    const actualCount = actual[key] ?? 0;
    if (actualCount !== expectedCount) {
      errors.push(
        `${label}.${key} debe contener ${expectedCount} casos; se encontraron ${actualCount}`,
      );
    }
  }
}

function validateFixture(document) {
  const errors = [];
  if (!isRecord(document)) {
    throw new Error("m3-2-cases.json debe contener un objeto JSON.");
  }
  if (document.artifact_type !== EXPECTED_ARTIFACT_TYPE) {
    errors.push(`artifact_type debe ser ${EXPECTED_ARTIFACT_TYPE}`);
  }
  if (document.catalog_version !== FIXTURE_DECLARED_CATALOG_VERSION) {
    errors.push(`catalog_version debe ser ${FIXTURE_DECLARED_CATALOG_VERSION}`);
  }
  if (document.purpose !== "preimplementation_design_expectations") {
    errors.push("purpose debe identificar expectativas de diseño preimplementación");
  }
  if (document.defined_before_implementation !== true) {
    errors.push("defined_before_implementation debe ser true");
  }
  if (!Array.isArray(document.cases)) {
    errors.push("cases debe ser un array");
  } else {
    if (document.cases.length !== EXPECTED_TOTAL_CASES) {
      errors.push(`cases debe contener exactamente ${EXPECTED_TOTAL_CASES} casos`);
    }
    const ids = new Set();
    const cohortCounts = {};
    const categoryCounts = {};
    const provenanceCounts = {};

    document.cases.forEach((testCase, index) => {
      const prefix = `cases[${index}]`;
      if (!isRecord(testCase)) {
        errors.push(`${prefix} debe ser un objeto`);
        return;
      }
      if (testCase.id !== EXPECTED_IDS[index]) {
        errors.push(`${prefix}.id debe ser ${EXPECTED_IDS[index]}`);
      }
      if (typeof testCase.id !== "string" || ids.has(testCase.id)) {
        errors.push(`${prefix}.id debe ser un string único`);
      } else {
        ids.add(testCase.id);
        const cohort = cohortFor(testCase);
        cohortCounts[cohort] = (cohortCounts[cohort] ?? 0) + 1;
      }
      if (typeof testCase.input !== "string" || testCase.input.length === 0) {
        errors.push(`${prefix}.input debe ser un string no vacío`);
      }
      if (!isRecord(testCase.context)) {
        errors.push(`${prefix}.context debe ser un objeto`);
      } else if (
        testCase.context.profile_selected !== true ||
        testCase.context.now !== "2026-09-26T15:00:00-05:00"
      ) {
        errors.push(`${prefix}.context no coincide con el contexto congelado`);
      }
      if (typeof testCase.expected_route !== "string") {
        errors.push(`${prefix}.expected_route debe ser string`);
      }
      if (!isRecord(testCase.expected_parameters)) {
        errors.push(`${prefix}.expected_parameters debe ser un objeto`);
      }
      if (!VALID_RESPONSE_VARIANTS.has(testCase.expected_response_variant)) {
        errors.push(`${prefix}.expected_response_variant no es válido`);
      }
      if (!VALID_CATEGORIES.has(testCase.category)) {
        errors.push(`${prefix}.category no es válida`);
      } else {
        categoryCounts[testCase.category] =
          (categoryCounts[testCase.category] ?? 0) + 1;
      }
      if (!VALID_PROVENANCES.has(testCase.provenance)) {
        errors.push(`${prefix}.provenance no es válida`);
      } else {
        provenanceCounts[testCase.provenance] =
          (provenanceCounts[testCase.provenance] ?? 0) + 1;
      }
      if (typeof testCase.rationale !== "string" || testCase.rationale.length === 0) {
        errors.push(`${prefix}.rationale debe ser un string no vacío`);
      }
      if (
        !Array.isArray(testCase.tags) ||
        testCase.tags.length === 0 ||
        testCase.tags.some((tag) => typeof tag !== "string")
      ) {
        errors.push(`${prefix}.tags debe ser un array no vacío de strings`);
      }

      const cohort = typeof testCase.id === "string" ? cohortFor(testCase) : "";
      if (
        (cohort === "V" || cohort === "P") &&
        testCase.provenance !== "peer_authored"
      ) {
        errors.push(`${prefix}.provenance debe ser peer_authored para V/P`);
      }
      if (cohort === "A" && testCase.provenance !== "user_authored") {
        errors.push(`${prefix}.provenance debe ser user_authored para A`);
      }
    });

    validateCountMap(cohortCounts, EXPECTED_COHORT_COUNTS, "cohorts", errors);
    validateCountMap(categoryCounts, EXPECTED_CATEGORY_COUNTS, "categories", errors);
    validateCountMap(
      provenanceCounts,
      EXPECTED_PROVENANCE_COUNTS,
      "provenance",
      errors,
    );
  }
  if (errors.length > 0) {
    throw new Error(`m3-2-cases.json inválido:\n- ${errors.join("\n- ")}`);
  }
  return document.cases;
}

function differingFields(expected, actual) {
  return ["route", "parameters", "response_variant"].filter(
    (field) => !deepEqual(expected[field], actual[field]),
  );
}

function percentage(value) {
  return `${(value * 100).toFixed(2)} %`;
}

function newMetricAccumulator() {
  return {
    total_cases: 0,
    route_correct: 0,
    exact_correct: 0,
    unexpected_fast_path: 0,
    unexpected_fallback: 0,
    wrong_nonfallback_route: 0,
  };
}

function recordMetrics(
  accumulator,
  expectedRoute,
  actualRoute,
  routeCorrect,
  exactCorrect,
) {
  accumulator.total_cases += 1;
  if (routeCorrect) accumulator.route_correct += 1;
  if (exactCorrect) accumulator.exact_correct += 1;
  if (expectedRoute === "agent_fallback" && actualRoute !== "agent_fallback") {
    accumulator.unexpected_fast_path += 1;
  }
  if (expectedRoute !== "agent_fallback" && actualRoute === "agent_fallback") {
    accumulator.unexpected_fallback += 1;
  }
  if (
    expectedRoute !== "agent_fallback" &&
    actualRoute !== "agent_fallback" &&
    actualRoute !== expectedRoute
  ) {
    accumulator.wrong_nonfallback_route += 1;
  }
}

function finalizedMetrics(accumulator) {
  const denominator = accumulator.total_cases;
  return {
    ...accumulator,
    route_accuracy: denominator === 0 ? null : accumulator.route_correct / denominator,
    exact_case_accuracy:
      denominator === 0 ? null : accumulator.exact_correct / denominator,
  };
}

async function readRepositoryRevision() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: fileURLToPath(repositoryRoot),
    windowsHide: true,
  });
  const revision = stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(revision)) {
    throw new Error("No fue posible obtener una revisión Git válida para la evidencia.");
  }
  return revision;
}

async function writeEvidenceExclusively(jsonContent, markdownContent) {
  let jsonHandle;
  let markdownHandle;
  try {
    jsonHandle = await open(jsonResultUrl, "wx");
    markdownHandle = await open(markdownResultUrl, "wx");
    await jsonHandle.writeFile(jsonContent, "utf8");
    await markdownHandle.writeFile(markdownContent, "utf8");
  } catch (error) {
    await jsonHandle?.close().catch(() => {});
    await markdownHandle?.close().catch(() => {});
    if (jsonHandle !== undefined) await unlink(jsonResultUrl).catch(() => {});
    if (markdownHandle !== undefined) {
      await unlink(markdownResultUrl).catch(() => {});
    }
    if (error !== null && typeof error === "object" && error.code === "EEXIST") {
      throw new Error(
        "La evidencia postweighted M3.2 ya existe; se abortó sin sobrescribirla.",
      );
    }
    throw error;
  }
  await jsonHandle.close();
  await markdownHandle.close();
}

function metricRows(entries) {
  return entries.map(
    ([name, row]) =>
      `| ${name} | ${row.total_cases} | ${row.route_correct} | ${row.exact_correct} | ${row.unexpected_fast_path} | ${row.unexpected_fallback} | ${row.wrong_nonfallback_route} |`,
  );
}

function markdownFor(result) {
  const metric = result.metrics;
  const cohortRows = metricRows(Object.entries(result.by_cohort));
  const categoryRows = metricRows(Object.entries(result.by_category));
  const provenanceRows = metricRows(Object.entries(result.by_provenance));
  const mismatchLines =
    result.mismatches.length === 0
      ? ["0 mismatches."]
      : result.mismatches.map(
          (mismatch) =>
            `- \`${mismatch.id}\` — ${mismatch.input} Expected \`${mismatch.expected.route}\` with \`${JSON.stringify(mismatch.expected.parameters)}\`; actual \`${mismatch.actual.route}\` with \`${JSON.stringify(mismatch.actual.parameters)}\`. Differing fields: ${mismatch.differing_fields.join(", ")}.`,
        );

  return `# M3.2-C.1 — Evaluación postweighted revisada del Intent Router

## Alcance

Esta evidencia corresponde al estado **postweighted M3.2** del Intent Router. Ejecuta los 20 casos de desarrollo definidos previamente bajo el catálogo \`${result.fixture_declared_catalog_version}\` contra el catálogo \`${result.evaluated_catalog_version}\`.

- Cohortes V y P: casos \`peer_authored\`.
- Cohorte A: casos \`user_authored\`.
- El resultado mide conformidad con casos de diseño; no mide accuracy poblacional.
- Los casos V miden la cobertura de paráfrasis válidas buscada por M3.2.
- Los casos negativos P y A miden fast paths inesperados.

## Identificación e integridad

- Commit/revisión evaluada: \`${result.repository_revision}\`
- Versión declarada por el fixture: \`${result.fixture_declared_catalog_version}\`
- Versión del catálogo evaluado: \`${result.evaluated_catalog_version}\`
- SHA-256 de m3-2-cases.json: \`${result.inputs.fixture_sha256}\`
- SHA-256 de intent-routing.catalog.json: \`${result.inputs.catalog_sha256}\`
- Casos ejecutados: ${metric.total_cases}
- Casos V: ${result.inputs.cohort_counts.V}
- Casos P: ${result.inputs.cohort_counts.P}
- Casos A: ${result.inputs.cohort_counts.A}

## Métricas globales observadas

- Route correct: ${metric.route_correct}/${metric.total_cases} (${percentage(metric.route_accuracy)})
- Exact correct: ${metric.exact_correct}/${metric.total_cases} (${percentage(metric.exact_case_accuracy)})
- Unexpected fast path: ${metric.unexpected_fast_path}
- Unexpected fallback: ${metric.unexpected_fallback}
- Wrong non-fallback route: ${metric.wrong_nonfallback_route}

## Breakdown por cohorte

| Cohorte | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${cohortRows.join("\n")}

## Breakdown por categoría

| Categoría | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${categoryRows.join("\n")}

## Breakdown por procedencia

| Procedencia | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${provenanceRows.join("\n")}

## Mismatches

${mismatchLines.join("\n")}

No se atribuyen causas automáticamente. El detalle estructurado de expectativas, resultados y campos diferentes está en \`m3-2-postweighted-reviewed.json\`.

## Interpretación

Esta evaluación captura el comportamiento postweighted frente a expectativas de diseño congeladas antes de implementar M3.2. Un acierto indica conformidad con el caso correspondiente; no demuestra generalización sobre consultas reales ni calidad del fallback RAG.
`;
}

async function main() {
  const [fixtureBytes, catalogBytes] = await Promise.all([
    readFile(fixtureUrl),
    readFile(catalogUrl),
  ]);
  const fixtureDocument = parseJson(fixtureBytes, "m3-2-cases.json");
  const cases = validateFixture(fixtureDocument);
  const catalogDocument = parseJson(
    catalogBytes,
    "intent-routing.catalog.json",
  );
  if (catalogDocument.catalog_version !== EVALUATED_CATALOG_VERSION) {
    throw new Error(
      `El catálogo debe usar la versión ${EVALUATED_CATALOG_VERSION}.`,
    );
  }

  const router = await loadDefaultIntentRouter();
  if (
    router.catalog_valid !== true ||
    router.catalog_version !== EVALUATED_CATALOG_VERSION
  ) {
    throw new Error(
      `Evaluación inválida: catálogo cargado con catalog_valid=${String(router.catalog_valid)} y catalog_version=${String(router.catalog_version)}.`,
    );
  }

  const combinedAccumulator = newMetricAccumulator();
  const cohortAccumulators = Object.fromEntries(
    Object.keys(EXPECTED_COHORT_COUNTS).map((key) => [key, newMetricAccumulator()]),
  );
  const categoryAccumulators = Object.fromEntries(
    Object.keys(EXPECTED_CATEGORY_COUNTS).map((key) => [
      key,
      newMetricAccumulator(),
    ]),
  );
  const provenanceAccumulators = Object.fromEntries(
    Object.keys(EXPECTED_PROVENANCE_COUNTS).map((key) => [
      key,
      newMetricAccumulator(),
    ]),
  );
  const mismatches = [];

  for (const testCase of cases) {
    const actualResult = router.route({
      content: testCase.input,
      context: testCase.context,
    });
    const expected = {
      route: testCase.expected_route,
      parameters: testCase.expected_parameters,
      response_variant: testCase.expected_response_variant,
    };
    const actual = {
      route: actualResult.route,
      parameters: actualResult.parameters,
      response_variant: actualResult.response_variant,
    };
    const routeCorrect = actual.route === expected.route;
    const exactCorrect = routeCorrect && deepEqual(actual, expected);
    const accumulators = [
      combinedAccumulator,
      cohortAccumulators[cohortFor(testCase)],
      categoryAccumulators[testCase.category],
      provenanceAccumulators[testCase.provenance],
    ];
    for (const accumulator of accumulators) {
      recordMetrics(
        accumulator,
        expected.route,
        actual.route,
        routeCorrect,
        exactCorrect,
      );
    }
    if (!exactCorrect) {
      mismatches.push({
        id: testCase.id,
        input: testCase.input,
        category: testCase.category,
        provenance: testCase.provenance,
        expected,
        actual,
        differing_fields: differingFields(expected, actual),
      });
    }
  }

  const repositoryRevision = await readRepositoryRevision();
  const result = {
    evaluation_type: "m3_2_c_1_reviewed_postweighted_design_case_evaluation",
    baseline_stage: "post_m3_2_c_1_reviewed",
    repository_revision: repositoryRevision,
    fixture_declared_catalog_version: FIXTURE_DECLARED_CATALOG_VERSION,
    evaluated_catalog_version: EVALUATED_CATALOG_VERSION,
    inputs: {
      fixture_sha256: sha256(fixtureBytes),
      catalog_sha256: sha256(catalogBytes),
      total_cases: cases.length,
      defined_before_implementation: fixtureDocument.defined_before_implementation,
      cohort_counts: EXPECTED_COHORT_COUNTS,
    },
    metrics: finalizedMetrics(combinedAccumulator),
    by_cohort: Object.fromEntries(
      Object.entries(cohortAccumulators).map(([key, value]) => [
        key,
        finalizedMetrics(value),
      ]),
    ),
    by_category: Object.fromEntries(
      Object.entries(categoryAccumulators).map(([key, value]) => [
        key,
        finalizedMetrics(value),
      ]),
    ),
    by_provenance: Object.fromEntries(
      Object.entries(provenanceAccumulators).map(([key, value]) => [
        key,
        finalizedMetrics(value),
      ]),
    ),
    mismatches,
  };

  await mkdir(resultsDirectory, { recursive: true });
  await writeEvidenceExclusively(
    `${JSON.stringify(result, null, 2)}\n`,
    markdownFor(result),
  );
  console.log(
    JSON.stringify(
      {
        repository_revision: repositoryRevision,
        metrics: result.metrics,
        by_cohort: result.by_cohort,
        by_category: result.by_category,
        by_provenance: result.by_provenance,
        mismatch_ids: mismatches.map(({ id }) => id),
      },
      null,
      2,
    ),
  );
  console.log(`Resultados: ${fileURLToPath(jsonResultUrl)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evaluación fallida.");
  process.exitCode = 1;
});
