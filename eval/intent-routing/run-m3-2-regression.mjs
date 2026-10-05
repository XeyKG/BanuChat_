import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadDefaultIntentRouter } from "../../backend/api/dist/index.js";

const EXPECTED_ARTIFACT_TYPE = "intent_routing_cases";
const FIXTURE_DECLARED_CATALOG_VERSION = "1.1.0-draft";
const EVALUATED_CATALOG_VERSION = "1.2.0-draft";
const EXPECTED_TOTAL_CASES = 158;
const EXPECTED_THROUGH_K1_1_CASES = 154;
const EXPECTED_POST_K1_1_CASES = 4;
const execFileAsync = promisify(execFile);
const EXPECTED_ROUTES = [
  "profile_progress",
  "course_catalog",
  "calendar_events",
  "announcements",
  "document_lookup",
  "capabilities_help",
  "basic_social",
  "known_out_of_scope",
  "agent_fallback",
];
const VALID_RESPONSE_VARIANTS = new Set([
  null,
  "greeting",
  "thanks",
  "farewell",
  "capabilities",
  "not_available",
]);

const evaluationDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../", evaluationDirectory);
const casesUrl = new URL("eval/intent-routing/cases.json", repositoryRoot);
const catalogUrl = new URL(
  "backend/api/intent-routing.catalog.json",
  repositoryRoot,
);
const resultsDirectory = new URL("results/", evaluationDirectory);
const jsonResultUrl = new URL("m3-2-regression.json", resultsDirectory);
const markdownResultUrl = new URL("m3-2-regression.md", resultsDirectory);

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

function validateCases(document) {
  const errors = [];
  if (!isRecord(document)) {
    throw new Error("cases.json debe contener un objeto JSON.");
  }
  if (document.artifact_type !== EXPECTED_ARTIFACT_TYPE) {
    errors.push(`artifact_type debe ser ${EXPECTED_ARTIFACT_TYPE}`);
  }
  if (document.catalog_version !== FIXTURE_DECLARED_CATALOG_VERSION) {
    errors.push(`catalog_version debe ser ${FIXTURE_DECLARED_CATALOG_VERSION}`);
  }
  if (!Array.isArray(document.cases)) {
    errors.push("cases debe ser un array");
  } else {
    if (document.cases.length !== EXPECTED_TOTAL_CASES) {
      errors.push(`cases debe contener exactamente ${EXPECTED_TOTAL_CASES} casos`);
    }
    const ids = new Set();
    document.cases.forEach((testCase, index) => {
      const prefix = `cases[${index}]`;
      if (!isRecord(testCase)) {
        errors.push(`${prefix} debe ser un objeto`);
        return;
      }
      if (typeof testCase.id !== "string" || testCase.id.length === 0) {
        errors.push(`${prefix}.id debe ser un string no vacío`);
      } else if (ids.has(testCase.id)) {
        errors.push(`${prefix}.id está duplicado: ${testCase.id}`);
      } else {
        ids.add(testCase.id);
      }
      if (typeof testCase.input !== "string") {
        errors.push(`${prefix}.input debe ser string`);
      }
      if (!isRecord(testCase.context)) {
        errors.push(`${prefix}.context debe ser un objeto`);
      } else {
        if (typeof testCase.context.profile_selected !== "boolean") {
          errors.push(`${prefix}.context.profile_selected debe ser boolean`);
        }
        if (typeof testCase.context.now !== "string") {
          errors.push(`${prefix}.context.now debe ser string`);
        }
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
      if (
        !Array.isArray(testCase.tags) ||
        testCase.tags.some((tag) => typeof tag !== "string")
      ) {
        errors.push(`${prefix}.tags debe ser un array de strings`);
      }
    });
    const postK1_1Count = document.cases.filter(
      (testCase) =>
        isRecord(testCase) &&
        Array.isArray(testCase.tags) &&
        testCase.tags.includes("m6_1_2"),
    ).length;
    const throughK1_1Count = document.cases.length - postK1_1Count;
    if (postK1_1Count !== EXPECTED_POST_K1_1_CASES) {
      errors.push(
        `debe haber exactamente ${EXPECTED_POST_K1_1_CASES} casos con tag m6_1_2; se encontraron ${postK1_1Count}`,
      );
    }
    if (throughK1_1Count !== EXPECTED_THROUGH_K1_1_CASES) {
      errors.push(
        `debe haber exactamente ${EXPECTED_THROUGH_K1_1_CASES} casos hasta K1.1; se encontraron ${throughK1_1Count}`,
      );
    }
    if (
      document.cases.slice(0, EXPECTED_THROUGH_K1_1_CASES).some(
        (testCase) =>
          isRecord(testCase) &&
          Array.isArray(testCase.tags) &&
          testCase.tags.includes("m6_1_2"),
      ) ||
      document.cases.slice(EXPECTED_THROUGH_K1_1_CASES).some(
        (testCase) =>
          !isRecord(testCase) ||
          !Array.isArray(testCase.tags) ||
          !testCase.tags.includes("m6_1_2"),
      )
    ) {
      errors.push("los casos m6_1_2 deben estar después de los 154 casos evaluados por K1.1");
    }
  }
  if (errors.length > 0) {
    throw new Error(`cases.json inválido:\n- ${errors.join("\n- ")}`);
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

function recordMetrics(accumulator, expectedRoute, actualRoute, routeCorrect, exactCorrect) {
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
  return {
    ...accumulator,
    route_accuracy: accumulator.route_correct / accumulator.total_cases,
    exact_case_accuracy: accumulator.exact_correct / accumulator.total_cases,
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
    if (markdownHandle !== undefined) await unlink(markdownResultUrl).catch(() => {});
    if (error !== null && typeof error === "object" && error.code === "EEXIST") {
      throw new Error("La evidencia de regresión M3.2 ya existe; se abortó sin sobrescribirla.");
    }
    throw error;
  }
  await jsonHandle.close();
  await markdownHandle.close();
}

function markdownFor(result) {
  const metric = result.metrics;
  const mismatchLines =
    result.mismatches.length === 0
      ? ["0 mismatches."]
      : result.mismatches.map(
          (mismatch) =>
            `- \`${mismatch.id}\`: difieren ${mismatch.differing_fields.join(", ")}.`,
        );
  const routeRows = EXPECTED_ROUTES.map((route) => {
    const row = result.by_expected_route[route];
    return `| ${route} | ${row.total} | ${row.route_correct} | ${row.exact_correct} |`;
  });
  const provenanceRows = [
    ["through_k1_1", result.by_provenance.through_k1_1],
    ["post_k1_1", result.by_provenance.post_k1_1],
    ["combined", result.by_provenance.combined],
  ].map(
    ([name, row]) =>
      `| ${name} | ${row.total_cases} | ${row.route_correct} | ${row.exact_correct} | ${row.unexpected_fast_path} | ${row.unexpected_fallback} | ${row.wrong_nonfallback_route} |`,
  );

  return `# M3.2 — Regresión histórica del Intent Router weighted

## Propósito

Reevaluar los 158 casos históricos definidos bajo el catálogo \`${result.fixture_declared_catalog_version}\` contra el catálogo actual \`${result.evaluated_catalog_version}\`, sin modificar las evidencias históricas.

## Identificación e integridad

- Commit base del working tree al ejecutar: \`${result.repository_revision}\`
- Versión declarada por el fixture: \`${result.fixture_declared_catalog_version}\`
- Versión del catálogo evaluado: \`${result.evaluated_catalog_version}\`
- SHA-256 de cases.json: \`${result.inputs.cases_sha256}\`
- SHA-256 de intent-routing.catalog.json: \`${result.inputs.catalog_sha256}\`
- Casos ejecutados: ${metric.total_cases}
- Casos históricos hasta K1.1: ${result.inputs.through_k1_1_cases}
- Casos nuevos post-K1.1: ${result.inputs.post_k1_1_cases}

## Métricas combinadas observadas

- Route accuracy: ${metric.route_correct}/${metric.total_cases} (${percentage(metric.route_accuracy)})
- Exact case accuracy: ${metric.exact_correct}/${metric.total_cases} (${percentage(metric.exact_case_accuracy)})
- Unexpected fast path: ${metric.unexpected_fast_path}
- Unexpected fallback: ${metric.unexpected_fallback}
- Wrong non-fallback route: ${metric.wrong_nonfallback_route}

## Breakdown por procedencia

| Procedencia | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${provenanceRows.join("\n")}

## Breakdown por ruta esperada

| Ruta esperada | Total | Route correct | Exact correct |
| --- | ---: | ---: | ---: |
${routeRows.join("\n")}

## Mismatches

${mismatchLines.join("\n")}

El detalle estructurado completo de cada mismatch está en \`m3-2-regression.json\`. No se atribuyen causas automáticamente; solo se indican los campos diferentes.

## Limitaciones de interpretación

> **Advertencia:** Estos resultados miden conformidad contra casos de diseño versionados del Intent Router. No representan accuracy de un modelo de IA, generalización sobre consultas reales ni evaluación de calidad RAG.

\`cases.json\` es un artefacto de diseño, no un dataset externo independiente. Los ${result.inputs.post_k1_1_cases} casos post-K1.1 se desarrollaron durante esta corrección como regresión y conformidad; por ello, no constituyen validación externa independiente.

Un resultado de ${metric.total_cases}/${metric.total_cases}, si ocurre, demuestra conformidad y ausencia de regresión sobre estos casos versionados; no demuestra desempeño poblacional ni comportamiento sobre consultas reales.

## Ejecución

La evaluación requiere compilar y validar previamente \`backend/api\`, y después ejecutar una vez:

\`node eval/intent-routing/run-m3-2-regression.mjs\`
`;
}

async function main() {
  const [casesBytes, catalogBytes] = await Promise.all([
    readFile(casesUrl),
    readFile(catalogUrl),
  ]);
  const casesDocument = parseJson(casesBytes, "cases.json");
  const cases = validateCases(casesDocument);
  parseJson(catalogBytes, "intent-routing.catalog.json");

  const router = await loadDefaultIntentRouter();
  if (
    router.catalog_valid !== true ||
    router.catalog_version !== EVALUATED_CATALOG_VERSION
  ) {
    throw new Error(
      `Evaluación inválida: catálogo cargado con catalog_valid=${String(router.catalog_valid)} y catalog_version=${String(router.catalog_version)}.`,
    );
  }

  const byExpectedRoute = Object.fromEntries(
    EXPECTED_ROUTES.map((route) => [
      route,
      { total: 0, route_correct: 0, exact_correct: 0 },
    ]),
  );
  const mismatches = [];
  const combinedAccumulator = newMetricAccumulator();
  const throughK1_1Accumulator = newMetricAccumulator();
  const postK1_1Accumulator = newMetricAccumulator();

  for (const testCase of cases) {
    const actual = router.route({
      content: testCase.input,
      context: testCase.context,
    });
    const expected = {
      route: testCase.expected_route,
      parameters: testCase.expected_parameters,
      response_variant: testCase.expected_response_variant,
    };
    const routeCorrect = actual.route === expected.route;
    const exactCorrect = routeCorrect && deepEqual(actual.parameters, expected.parameters) &&
      actual.response_variant === expected.response_variant;
    const provenance = testCase.tags.includes("m6_1_2")
      ? "post_k1_1"
      : "through_k1_1";
    const provenanceAccumulator = provenance === "post_k1_1"
      ? postK1_1Accumulator
      : throughK1_1Accumulator;
    recordMetrics(
      combinedAccumulator,
      expected.route,
      actual.route,
      routeCorrect,
      exactCorrect,
    );
    recordMetrics(
      provenanceAccumulator,
      expected.route,
      actual.route,
      routeCorrect,
      exactCorrect,
    );
    const routeBreakdown = byExpectedRoute[expected.route];
    if (routeBreakdown === undefined) {
      throw new Error(`Ruta esperada no soportada en ${testCase.id}: ${expected.route}`);
    }
    routeBreakdown.total += 1;
    if (routeCorrect) {
      routeBreakdown.route_correct += 1;
    }
    if (exactCorrect) {
      routeBreakdown.exact_correct += 1;
    } else {
      mismatches.push({
        id: testCase.id,
        input: testCase.input,
        tags: Array.isArray(testCase.tags) ? testCase.tags : [],
        expected,
        actual: {
          route: actual.route,
          parameters: actual.parameters,
          response_variant: actual.response_variant,
        },
        route_correct: routeCorrect,
        provenance,
        differing_fields: differingFields(expected, actual),
      });
    }
  }

  const repositoryRevision = await readRepositoryRevision();
  const combinedMetrics = finalizedMetrics(combinedAccumulator);
  const throughK1_1Metrics = finalizedMetrics(throughK1_1Accumulator);
  const postK1_1Metrics = finalizedMetrics(postK1_1Accumulator);
  const result = {
    evaluation_type: "m3_2_historical_regression",
    repository_revision: repositoryRevision,
    fixture_declared_catalog_version: FIXTURE_DECLARED_CATALOG_VERSION,
    evaluated_catalog_version: EVALUATED_CATALOG_VERSION,
    inputs: {
      cases_sha256: sha256(casesBytes),
      catalog_sha256: sha256(catalogBytes),
      total_cases: cases.length,
      through_k1_1_cases: throughK1_1Metrics.total_cases,
      post_k1_1_cases: postK1_1Metrics.total_cases,
    },
    metrics: combinedMetrics,
    by_provenance: {
      through_k1_1: throughK1_1Metrics,
      post_k1_1: postK1_1Metrics,
      combined: combinedMetrics,
    },
    by_expected_route: byExpectedRoute,
    mismatches,
  };

  await mkdir(resultsDirectory, { recursive: true });
  await writeEvidenceExclusively(
    `${JSON.stringify(result, null, 2)}\n`,
    markdownFor(result),
  );
  console.log(JSON.stringify({
    repository_revision: repositoryRevision,
    metrics: result.metrics,
    by_provenance: result.by_provenance,
  }, null, 2));
  if (mismatches.length > 0) {
    console.log(`Mismatches: ${mismatches.map(({ id }) => id).join(", ")}`);
  }
  console.log(`Resultados: ${fileURLToPath(jsonResultUrl)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evaluación fallida.");
  process.exitCode = 1;
});
