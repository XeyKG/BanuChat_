import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { loadDefaultIntentRouter } from "../../backend/api/dist/index.js";

const EXPECTED_ARTIFACT_TYPE = "intent_routing_cases";
const EXPECTED_CATALOG_VERSION = "1.0.0-draft";
const EXPECTED_TOTAL_CASES = 129;
const ROUTER_REVISION = "d7527947236674489c9a8308ee0c509932129431";
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
const jsonResultUrl = new URL("checkpoint-2026-10-router.json", resultsDirectory);
const markdownResultUrl = new URL("checkpoint-2026-10-router.md", resultsDirectory);

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
  if (document.catalog_version !== EXPECTED_CATALOG_VERSION) {
    errors.push(`catalog_version debe ser ${EXPECTED_CATALOG_VERSION}`);
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
    });
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

  return `# Evaluación reproducible del Intent Router — Checkpoint 2026-10

## Propósito

Evaluar la conformidad del router determinista productivo con los casos de diseño congelados en \`eval/intent-routing/cases.json\`.

## Identificación e integridad

- Revisión del router: \`${result.router_revision}\`
- Versión del catálogo: \`${result.catalog_version}\`
- SHA-256 de cases.json: \`${result.inputs.cases_sha256}\`
- SHA-256 de intent-routing.catalog.json: \`${result.inputs.catalog_sha256}\`
- Casos ejecutados: ${metric.total_cases}

## Métricas observadas

- Route accuracy: ${metric.route_correct}/${metric.total_cases} (${percentage(metric.route_accuracy)})
- Exact case accuracy: ${metric.exact_correct}/${metric.total_cases} (${percentage(metric.exact_case_accuracy)})
- Unexpected fast path: ${metric.unexpected_fast_path}
- Unexpected fallback: ${metric.unexpected_fallback}
- Wrong non-fallback route: ${metric.wrong_nonfallback_route}

## Breakdown por ruta esperada

| Ruta esperada | Total | Route correct | Exact correct |
| --- | ---: | ---: | ---: |
${routeRows.join("\n")}

## Mismatches

${mismatchLines.join("\n")}

El detalle estructurado completo de cada mismatch está en \`checkpoint-2026-10-router.json\`. No se atribuyen causas automáticamente; solo se indican los campos diferentes.

## Limitaciones de interpretación

> **Advertencia:** Estos resultados miden conformidad contra casos de diseño congelados del Intent Router. No representan accuracy de un modelo de IA, generalización sobre consultas reales ni evaluación de calidad RAG.

\`cases.json\` forma parte del diseño del router y no es un dataset externo independiente. Esta evaluación tampoco mide desempeño sobre usuarios reales.

## Ejecución

La evaluación requiere compilar previamente \`backend/api\` y después ejecutar:

\`node eval/intent-routing/run-evaluation.mjs\`

En esta ejecución, \`npm\` no estaba disponible en \`PATH\`; \`backend/api\` se compiló con el compilador TypeScript local equivalente y el runner se ejecutó inmediatamente después con Node.js.
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
    router.catalog_version !== EXPECTED_CATALOG_VERSION
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
  let routeCorrectCount = 0;
  let exactCorrectCount = 0;
  let unexpectedFastPath = 0;
  let unexpectedFallback = 0;
  let wrongNonfallbackRoute = 0;

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
    const routeBreakdown = byExpectedRoute[expected.route];
    if (routeBreakdown === undefined) {
      throw new Error(`Ruta esperada no soportada en ${testCase.id}: ${expected.route}`);
    }
    routeBreakdown.total += 1;
    if (routeCorrect) {
      routeCorrectCount += 1;
      routeBreakdown.route_correct += 1;
    }
    if (exactCorrect) {
      exactCorrectCount += 1;
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
        differing_fields: differingFields(expected, actual),
      });
    }
    if (expected.route === "agent_fallback" && actual.route !== "agent_fallback") {
      unexpectedFastPath += 1;
    }
    if (expected.route !== "agent_fallback" && actual.route === "agent_fallback") {
      unexpectedFallback += 1;
    }
    if (
      expected.route !== "agent_fallback" &&
      actual.route !== "agent_fallback" &&
      actual.route !== expected.route
    ) {
      wrongNonfallbackRoute += 1;
    }
  }

  const result = {
    evaluation_type: "intent_router_design_case_conformance",
    router_revision: ROUTER_REVISION,
    catalog_version: EXPECTED_CATALOG_VERSION,
    inputs: {
      cases_sha256: sha256(casesBytes),
      catalog_sha256: sha256(catalogBytes),
    },
    metrics: {
      total_cases: cases.length,
      route_correct: routeCorrectCount,
      route_accuracy: routeCorrectCount / cases.length,
      exact_correct: exactCorrectCount,
      exact_case_accuracy: exactCorrectCount / cases.length,
      unexpected_fast_path: unexpectedFastPath,
      unexpected_fallback: unexpectedFallback,
      wrong_nonfallback_route: wrongNonfallbackRoute,
    },
    by_expected_route: byExpectedRoute,
    mismatches,
  };

  await mkdir(resultsDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonResultUrl, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
    writeFile(markdownResultUrl, markdownFor(result), "utf8"),
  ]);
  console.log(JSON.stringify(result.metrics, null, 2));
  if (mismatches.length > 0) {
    console.log(`Mismatches: ${mismatches.map(({ id }) => id).join(", ")}`);
  }
  console.log(`Resultados: ${fileURLToPath(jsonResultUrl)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evaluación fallida.");
  process.exitCode = 1;
});
