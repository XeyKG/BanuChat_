import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, open, readFile, unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadDefaultIntentRouter } from "../../backend/api/dist/index.js";

const EXPECTED_ARTIFACT_TYPE = "intent_routing_m3_2_reserved_cases";
const EXPECTED_EVALUATION_STAGE = "M3.2-D";
const EXPECTED_CATALOG_VERSION = "1.2.0-draft";
const EXPECTED_ROUTER_FROZEN_COMMIT =
  "e55ba47299822940b36332ec6d93cbd2bb553267";
const EXPECTED_FIXTURE_SHA256 =
  "6e84d3bf8c9c1fc9479ab61eb2c2d9a424b7103e2b22153b5737421e59fa4102";
const EXPECTED_CATALOG_SHA256 =
  "af881e8399f7d43af291aa0ad16e34d89a159999d730ed021a821a23d414e95f";
const ROUTER_BEHAVIOR_PATHS = [
  "backend/api/intent-routing.catalog.json",
  "backend/api/intent-routing.schema.json",
  "backend/api/src/routing/intent-router.ts",
  "backend/api/src/routing/intent-router-types.ts",
];
const EXPECTED_CONTEXT = {
  profile_selected: true,
  now: "2026-09-26T15:00:00-05:00",
};
const EXPECTED_COHORT_COUNTS = {
  reserved_primary: 14,
  development_overlap: 5,
  contextual_fragment: 1,
  meta_message: 4,
};
const EXPECTED_TOTAL_CASES = 24;
const EXPECTED_IDS = [
  "R-01",
  "R-02",
  "R-03",
  "R-04",
  "R-05",
  "R-06",
  "R-07",
  "R-08",
  "R-09",
  "R-10",
  "R-11",
  "R-12",
  "R-13",
  "R-14",
  "O-01",
  "O-02",
  "O-03",
  "O-04",
  "O-05",
  "X-01",
  "M-01",
  "M-02",
  "M-03",
  "M-04",
];
const VALID_CATEGORIES_BY_COHORT = {
  reserved_primary: new Set(["unknown_content", "unsupported", "ambiguous"]),
  development_overlap: new Set(["unknown_content", "unsupported"]),
  contextual_fragment: new Set(["context_dependent"]),
  meta_message: new Set(["not_a_standalone_query"]),
};
const execFileAsync = promisify(execFile);

const evaluationDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../", evaluationDirectory);
const fixtureUrl = new URL("m3-2-reserved-cases.json", evaluationDirectory);
const catalogUrl = new URL(
  "backend/api/intent-routing.catalog.json",
  repositoryRoot,
);
const resultsDirectory = new URL("results/", evaluationDirectory);
const jsonResultUrl = new URL(
  "m3-2-reserved-first-run.json",
  resultsDirectory,
);
const markdownResultUrl = new URL(
  "m3-2-reserved-first-run.md",
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

function validateFixture(document) {
  const errors = [];
  if (!isRecord(document)) {
    throw new Error("m3-2-reserved-cases.json debe contener un objeto JSON.");
  }

  const expectedMetadata = {
    artifact_type: EXPECTED_ARTIFACT_TYPE,
    evaluation_stage: EXPECTED_EVALUATION_STAGE,
    catalog_version: EXPECTED_CATALOG_VERSION,
    router_frozen_commit: EXPECTED_ROUTER_FROZEN_COMMIT,
    expectations_frozen_before_execution: true,
    reserved_primary_count: 14,
    development_overlap_count: 5,
    contextual_fragment_count: 1,
    meta_message_count: 4,
    total_cases: EXPECTED_TOTAL_CASES,
  };
  for (const [field, expected] of Object.entries(expectedMetadata)) {
    if (document[field] !== expected) {
      errors.push(`${field} debe ser ${JSON.stringify(expected)}`);
    }
  }
  if (document.provenance !== "peer_authored") {
    errors.push("provenance debe ser peer_authored");
  }
  if (!deepEqual(document.default_context, EXPECTED_CONTEXT)) {
    errors.push("default_context no coincide con el contexto congelado");
  }
  if (
    typeof document.methodology_note !== "string" ||
    document.methodology_note.length === 0
  ) {
    errors.push("methodology_note debe ser un string no vacío");
  }

  if (!Array.isArray(document.cases)) {
    errors.push("cases debe ser un array");
  } else {
    if (document.cases.length !== EXPECTED_TOTAL_CASES) {
      errors.push(`cases debe contener exactamente ${EXPECTED_TOTAL_CASES} casos`);
    }
    const ids = new Set();
    const cohortCounts = Object.fromEntries(
      Object.keys(EXPECTED_COHORT_COUNTS).map((cohort) => [cohort, 0]),
    );

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
      if (testCase.id !== EXPECTED_IDS[index]) {
        errors.push(`${prefix}.id debe ser ${EXPECTED_IDS[index]}`);
      }
      if (typeof testCase.input !== "string" || testCase.input.length === 0) {
        errors.push(`${prefix}.input debe ser un string no vacío`);
      }
      if (!deepEqual(testCase.context, EXPECTED_CONTEXT)) {
        errors.push(`${prefix}.context no coincide con el contexto congelado`);
      }
      if (testCase.expected_route !== "agent_fallback") {
        errors.push(`${prefix}.expected_route debe ser agent_fallback`);
      }
      if (!isRecord(testCase.expected_parameters)) {
        errors.push(`${prefix}.expected_parameters debe ser un objeto`);
      } else if (Object.keys(testCase.expected_parameters).length !== 0) {
        errors.push(`${prefix}.expected_parameters debe ser {}`);
      }
      if (testCase.expected_response_variant !== null) {
        errors.push(`${prefix}.expected_response_variant debe ser null`);
      }
      if (testCase.provenance !== "peer_authored") {
        errors.push(`${prefix}.provenance debe ser peer_authored`);
      }

      const validCategories = VALID_CATEGORIES_BY_COHORT[testCase.cohort];
      if (validCategories === undefined) {
        errors.push(`${prefix}.cohort no es válido`);
      } else {
        cohortCounts[testCase.cohort] += 1;
        if (!validCategories.has(testCase.category)) {
          errors.push(`${prefix}.category no es válida para ${testCase.cohort}`);
        }
      }
      if (
        testCase.cohort === "development_overlap" &&
        (typeof testCase.overlap_note !== "string" ||
          testCase.overlap_note.length === 0)
      ) {
        errors.push(`${prefix}.overlap_note debe ser un string no vacío`);
      }
    });

    for (const [cohort, expectedCount] of Object.entries(
      EXPECTED_COHORT_COUNTS,
    )) {
      if (cohortCounts[cohort] !== expectedCount) {
        errors.push(
          `${cohort} debe contener ${expectedCount} casos; se encontraron ${cohortCounts[cohort]}`,
        );
      }
    }
    if (
      ids.size !== EXPECTED_IDS.length ||
      EXPECTED_IDS.some((id) => !ids.has(id))
    ) {
      errors.push("el conjunto de IDs no coincide con los 24 IDs congelados");
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `m3-2-reserved-cases.json inválido:\n- ${errors.join("\n- ")}`,
    );
  }
  return document.cases;
}

function validateCatalog(document) {
  if (!isRecord(document)) {
    throw new Error("intent-routing.catalog.json debe contener un objeto JSON.");
  }
  if (
    document.artifact_type !== "intent_routing_catalog" ||
    document.catalog_version !== EXPECTED_CATALOG_VERSION
  ) {
    throw new Error(
      `El catálogo debe ser intent_routing_catalog ${EXPECTED_CATALOG_VERSION}.`,
    );
  }
}

async function assertGitCheck(args, errorMessage) {
  try {
    await execFileAsync("git", args, {
      cwd: fileURLToPath(repositoryRoot),
      windowsHide: true,
    });
  } catch {
    throw new Error(errorMessage);
  }
}

async function readRepositoryRevision() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: fileURLToPath(repositoryRoot),
    windowsHide: true,
  });
  const revision = stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(revision)) {
    throw new Error("No fue posible obtener una revisión Git HEAD válida.");
  }
  await assertGitCheck(
    ["cat-file", "-e", `${EXPECTED_ROUTER_FROZEN_COMMIT}^{commit}`],
    `El commit congelado del router ${EXPECTED_ROUTER_FROZEN_COMMIT} no existe.`,
  );
  await assertGitCheck(
    ["merge-base", "--is-ancestor", EXPECTED_ROUTER_FROZEN_COMMIT, revision],
    `El commit congelado del router ${EXPECTED_ROUTER_FROZEN_COMMIT} no es ancestro de HEAD.`,
  );
  await assertGitCheck(
    [
      "diff",
      "--quiet",
      EXPECTED_ROUTER_FROZEN_COMMIT,
      revision,
      "--",
      ...ROUTER_BEHAVIOR_PATHS,
    ],
    "Los archivos que determinan el comportamiento del Intent Router cambiaron desde el commit congelado.",
  );
  return revision;
}

async function assertResultsAbsent() {
  for (const resultUrl of [jsonResultUrl, markdownResultUrl]) {
    try {
      await access(resultUrl);
    } catch (error) {
      if (error !== null && typeof error === "object" && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    throw new Error(
      "La evidencia reservada first-run ya existe; se abortó antes de ejecutar casos.",
    );
  }
}

function differingFields(expected, actual) {
  return ["route", "parameters", "response_variant"].filter(
    (field) => !deepEqual(expected[field], actual[field]),
  );
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

function recordMetrics(accumulator, expected, actual) {
  const routeCorrect = actual.route === expected.route;
  const exactCorrect =
    routeCorrect &&
    deepEqual(actual.parameters, expected.parameters) &&
    actual.response_variant === expected.response_variant;
  accumulator.total_cases += 1;
  if (routeCorrect) accumulator.route_correct += 1;
  if (exactCorrect) accumulator.exact_correct += 1;
  if (expected.route === "agent_fallback" && actual.route !== "agent_fallback") {
    accumulator.unexpected_fast_path += 1;
  }
  if (expected.route !== "agent_fallback" && actual.route === "agent_fallback") {
    accumulator.unexpected_fallback += 1;
  }
  if (
    expected.route !== "agent_fallback" &&
    actual.route !== "agent_fallback" &&
    actual.route !== expected.route
  ) {
    accumulator.wrong_nonfallback_route += 1;
  }
  return { routeCorrect, exactCorrect };
}

function finalizeMetrics(accumulator, includeFalseFastPathRate = false) {
  const metrics = {
    ...accumulator,
    route_accuracy: accumulator.route_correct / accumulator.total_cases,
    exact_case_accuracy: accumulator.exact_correct / accumulator.total_cases,
  };
  if (includeFalseFastPathRate) {
    metrics.false_fast_path_rate =
      accumulator.unexpected_fast_path / accumulator.total_cases;
  }
  return metrics;
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
      throw new Error(
        "La evidencia reservada first-run ya existe; no fue sobrescrita.",
      );
    }
    throw error;
  }
  await jsonHandle.close();
  await markdownHandle.close();
}

function percentage(value) {
  return `${(value * 100).toFixed(2)} %`;
}

function markdownFor(result) {
  const primary = result.primary_metric;
  const cohortRows = Object.entries(result.metrics_by_cohort).map(
    ([cohort, metrics]) =>
      `| ${cohort} | ${metrics.total_cases} | ${metrics.route_correct} | ${metrics.exact_correct} | ${metrics.unexpected_fast_path} | ${metrics.unexpected_fallback} | ${metrics.wrong_nonfallback_route} |`,
  );
  const mismatchLines =
    result.mismatches.length === 0
      ? ["0 mismatches."]
      : result.mismatches.map(
          (mismatch) =>
            `- \`${mismatch.id}\` (${mismatch.cohort}): difieren ${mismatch.differing_fields.join(", ")}.`,
        );

  return `# M3.2-D — Primera evaluación reservada por cohortes

## Identificación e integridad

- HEAD durante la ejecución: \`${result.repository_revision}\`
- Commit donde se congeló el router: \`${result.router_frozen_commit}\`
- Versión del catálogo: \`${result.catalog_version}\`
- SHA-256 del fixture: \`${result.inputs.fixture_sha256}\`
- SHA-256 del catálogo: \`${result.inputs.catalog_sha256}\`

## Métrica independiente primaria

\`reserved_primary\` es la única cohorte independiente primaria.

- Route correct: ${primary.route_correct}/${primary.total_cases}
- Exact correct: ${primary.exact_correct}/${primary.total_cases}
- Unexpected fast path: ${primary.unexpected_fast_path}
- False fast-path rate: ${primary.unexpected_fast_path}/${primary.total_cases} (${percentage(primary.false_fast_path_rate)})

## Resultados separados por cohorte

| Cohorte | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${cohortRows.join("\n")}

## Mismatches

${mismatchLines.join("\n")}

El JSON asociado registra para cada mismatch su ID, input, expected, actual y differing_fields.

## Interpretación

- \`reserved_primary\` es la métrica independiente primaria.
- \`development_overlap\` no es evidencia independiente.
- \`contextual_fragment\` y \`meta_message\` son cohortes exploratorias.
- Todos los casos primarios son negativos y esperan fallback.
- Incluso un resultado 14/14 no demuestra accuracy poblacional.
- Incluso un resultado 14/14 no demuestra recall ni generalización positiva.
- Un resultado sin errores puede evidenciar ausencia de fast paths indebidos únicamente en esta muestra concreta.
`;
}

async function main() {
  const [fixtureBytes, catalogBytes] = await Promise.all([
    readFile(fixtureUrl),
    readFile(catalogUrl),
  ]);
  const fixtureSha256 = sha256(fixtureBytes);
  const catalogSha256 = sha256(catalogBytes);
  if (fixtureSha256 !== EXPECTED_FIXTURE_SHA256) {
    throw new Error("El SHA-256 del fixture reservado no coincide con el congelado.");
  }
  if (catalogSha256 !== EXPECTED_CATALOG_SHA256) {
    throw new Error("El SHA-256 del catálogo no coincide con el congelado.");
  }
  const fixtureDocument = parseJson(
    fixtureBytes,
    "m3-2-reserved-cases.json",
  );
  const cases = validateFixture(fixtureDocument);
  const catalogDocument = parseJson(
    catalogBytes,
    "intent-routing.catalog.json",
  );
  validateCatalog(catalogDocument);
  await assertResultsAbsent();
  const repositoryRevision = await readRepositoryRevision();

  const router = await loadDefaultIntentRouter();
  if (
    router.catalog_valid !== true ||
    router.catalog_version !== EXPECTED_CATALOG_VERSION
  ) {
    throw new Error(
      `Evaluación inválida: catálogo cargado con catalog_valid=${String(router.catalog_valid)} y catalog_version=${String(router.catalog_version)}.`,
    );
  }

  const accumulators = Object.fromEntries(
    Object.keys(EXPECTED_COHORT_COUNTS).map((cohort) => [
      cohort,
      newMetricAccumulator(),
    ]),
  );
  const mismatches = [];

  for (const testCase of cases) {
    const expected = {
      route: testCase.expected_route,
      parameters: testCase.expected_parameters,
      response_variant: testCase.expected_response_variant,
    };
    const actualResult = router.route({
      content: testCase.input,
      context: testCase.context,
    });
    const actual = {
      route: actualResult.route,
      parameters: actualResult.parameters,
      response_variant: actualResult.response_variant,
    };
    const { exactCorrect } = recordMetrics(
      accumulators[testCase.cohort],
      expected,
      actual,
    );
    if (!exactCorrect) {
      mismatches.push({
        id: testCase.id,
        input: testCase.input,
        cohort: testCase.cohort,
        expected,
        actual,
        differing_fields: differingFields(expected, actual),
      });
    }
  }

  const metricsByCohort = Object.fromEntries(
    Object.entries(accumulators).map(([cohort, accumulator]) => [
      cohort,
      finalizeMetrics(accumulator, cohort === "reserved_primary"),
    ]),
  );
  const result = {
    evaluation_type: "m3_2_d_reserved_first_run",
    evaluation_stage: EXPECTED_EVALUATION_STAGE,
    repository_revision: repositoryRevision,
    router_frozen_commit: EXPECTED_ROUTER_FROZEN_COMMIT,
    catalog_version: EXPECTED_CATALOG_VERSION,
    expectations_frozen_before_execution:
      fixtureDocument.expectations_frozen_before_execution,
    inputs: {
      fixture_sha256: fixtureSha256,
      catalog_sha256: catalogSha256,
      total_cases: cases.length,
      cohort_counts: EXPECTED_COHORT_COUNTS,
    },
    primary_cohort: "reserved_primary",
    primary_metric: metricsByCohort.reserved_primary,
    metrics_by_cohort: metricsByCohort,
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
        primary_cohort: result.primary_cohort,
        primary_metric: result.primary_metric,
        metrics_by_cohort: result.metrics_by_cohort,
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
