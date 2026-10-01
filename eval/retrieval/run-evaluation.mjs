import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { aggregateMetrics, calculateCaseMetrics } from "./metrics.mjs";

const execFileAsync = promisify(execFile);
const EXPECTED_SCHEMA_VERSION = "1";
const EXPECTED_BENCHMARK_ID = "banuchat-retrieval-k2-v1";
const EXPECTED_RELEASE_ID = "5b307391-f475-4120-b8de-30df8f9a7d63";
const EXPECTED_CORPUS_CHUNK_COUNT = 60;
const EXPECTED_TOP_K = 5;
const EXPECTED_CHUNKED_CASES = 18;
const EXPECTED_RELEVANT_REFERENCES = 20;
const BENCHMARK_FROZEN_COMMIT = "7a38967739b59d382b0c270c2aeaeceb89c8f81b";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const evaluationDirectory = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../", evaluationDirectory);
const goldUrl = new URL("gold-v1.json", evaluationDirectory);
const apiPackageUrl = new URL("backend/api/package.json", repositoryRoot);
const apiDistUrl = new URL("backend/api/dist/index.js", repositoryRoot);
const resultsDirectory = new URL("results/", evaluationDirectory);
const jsonResultUrl = new URL("k2-v1-2026-10-01.json", resultsDirectory);
const markdownResultUrl = new URL("k2-v1-2026-10-01.md", resultsDirectory);

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} debe ser un objeto`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\0") !== wanted.join("\0")) {
    errors.push(`${label} debe tener exactamente las claves ${wanted.join(", ")}`);
  }
  return true;
}

function parseGold(bytes) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("gold-v1.json no contiene JSON UTF-8 válido.");
  }
}

function validateGold(gold) {
  const errors = [];
  exactKeys(
    gold,
    [
      "schema_version",
      "benchmark_id",
      "release_id",
      "corpus_chunk_count",
      "top_k",
      "chunked_cases",
      "full_document_cases",
    ],
    "gold",
    errors,
  );
  if (gold?.schema_version !== EXPECTED_SCHEMA_VERSION) {
    errors.push(`schema_version debe ser ${EXPECTED_SCHEMA_VERSION}`);
  }
  if (gold?.benchmark_id !== EXPECTED_BENCHMARK_ID) {
    errors.push(`benchmark_id debe ser ${EXPECTED_BENCHMARK_ID}`);
  }
  if (gold?.release_id !== EXPECTED_RELEASE_ID) {
    errors.push(`release_id debe ser ${EXPECTED_RELEASE_ID}`);
  }
  if (gold?.corpus_chunk_count !== EXPECTED_CORPUS_CHUNK_COUNT) {
    errors.push(`corpus_chunk_count debe ser ${EXPECTED_CORPUS_CHUNK_COUNT}`);
  }
  if (gold?.top_k !== EXPECTED_TOP_K) {
    errors.push(`top_k debe ser ${EXPECTED_TOP_K}`);
  }

  if (!Array.isArray(gold?.chunked_cases)) {
    errors.push("chunked_cases debe ser un array");
  } else {
    if (gold.chunked_cases.length !== EXPECTED_CHUNKED_CASES) {
      errors.push(`chunked_cases debe contener ${EXPECTED_CHUNKED_CASES} casos`);
    }
    let referenceCount = 0;
    const referenceIds = new Set();
    gold.chunked_cases.forEach((testCase, index) => {
      const label = `chunked_cases[${index}]`;
      if (!exactKeys(testCase, ["id", "query", "relevant_chunks"], label, errors)) {
        return;
      }
      const expectedId = `K2-${String(index + 1).padStart(2, "0")}`;
      if (testCase.id !== expectedId) errors.push(`${label}.id debe ser ${expectedId}`);
      if (typeof testCase.query !== "string" || testCase.query.length === 0) {
        errors.push(`${label}.query debe ser un string no vacío`);
      }
      if (!Array.isArray(testCase.relevant_chunks) || testCase.relevant_chunks.length === 0) {
        errors.push(`${label}.relevant_chunks debe ser un array no vacío`);
        return;
      }
      referenceCount += testCase.relevant_chunks.length;
      testCase.relevant_chunks.forEach((reference, referenceIndex) => {
        const referenceLabel = `${label}.relevant_chunks[${referenceIndex}]`;
        if (
          !exactKeys(
            reference,
            ["document_key", "ordinal", "chunk_id", "locator"],
            referenceLabel,
            errors,
          )
        ) {
          return;
        }
        if (typeof reference.document_key !== "string" || reference.document_key.length === 0) {
          errors.push(`${referenceLabel}.document_key debe ser no vacío`);
        }
        if (!Number.isSafeInteger(reference.ordinal) || reference.ordinal < 0) {
          errors.push(`${referenceLabel}.ordinal debe ser un entero no negativo`);
        }
        if (typeof reference.chunk_id !== "string" || !UUID_PATTERN.test(reference.chunk_id)) {
          errors.push(`${referenceLabel}.chunk_id debe ser UUID`);
        } else if (referenceIds.has(reference.chunk_id)) {
          errors.push(`${referenceLabel}.chunk_id está duplicado`);
        } else {
          referenceIds.add(reference.chunk_id);
        }
        if (typeof reference.locator !== "string" || reference.locator.length === 0) {
          errors.push(`${referenceLabel}.locator debe ser no vacío`);
        }
      });
    });
    if (referenceCount !== EXPECTED_RELEVANT_REFERENCES) {
      errors.push(`debe haber ${EXPECTED_RELEVANT_REFERENCES} referencias relevantes`);
    }
  }

  if (!Array.isArray(gold?.full_document_cases) || gold.full_document_cases.length !== 2) {
    errors.push("full_document_cases debe contener exactamente 2 casos");
  } else {
    const expected = [
      { id: "K2-19", document: "doc-011" },
      { id: "K2-20", document: "doc-012" },
    ];
    gold.full_document_cases.forEach((testCase, index) => {
      const label = `full_document_cases[${index}]`;
      if (!exactKeys(testCase, ["id", "query", "relevant_document", "retrieval_mode"], label, errors)) {
        return;
      }
      if (testCase.id !== expected[index].id) errors.push(`${label}.id debe ser ${expected[index].id}`);
      if (typeof testCase.query !== "string" || testCase.query.length === 0) {
        errors.push(`${label}.query debe ser un string no vacío`);
      }
      if (testCase.relevant_document !== expected[index].document) {
        errors.push(`${label}.relevant_document debe ser ${expected[index].document}`);
      }
      if (testCase.retrieval_mode !== "full_document") {
        errors.push(`${label}.retrieval_mode debe ser full_document`);
      }
    });
  }

  if (errors.length > 0) {
    fail(`gold-v1.json inválido:\n- ${errors.join("\n- ")}`);
  }
  return gold;
}

async function implementationRevision() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: fileURLToPath(repositoryRoot),
      windowsHide: true,
    });
    const revision = stdout.trim();
    if (!/^[0-9a-f]{40}$/.test(revision)) fail("revisión Git inválida");
    return revision;
  } catch {
    return fail("No fue posible obtener implementation_revision con git rev-parse HEAD.");
  }
}

function databaseConfig() {
  const portText = process.env.POSTGRES_PORT ?? "5432";
  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    fail("POSTGRES_PORT debe ser un puerto válido.");
  }
  for (const name of ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]) {
    if (typeof process.env[name] !== "string" || process.env[name].length === 0) {
      fail(`Falta la variable requerida ${name}.`);
    }
  }
  return {
    host: "127.0.0.1",
    port,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };
}

async function preflight(sql, gold) {
  const releaseResult = await sql.query(
    `SELECT
       ds.current_release_id,
       dr.id AS release_id,
       dr.status,
       dr.embedding_config_id,
       ec.provider,
       ec.model,
       ec.model_revision,
       ec.dimension,
       ec.distance_metric,
       ec.parameters,
       (SELECT count(*)::integer
          FROM banuchat.document_chunks dc
         WHERE dc.dataset_release_id = $1) AS chunk_count
     FROM banuchat.datasets ds
     LEFT JOIN banuchat.dataset_releases dr ON dr.id = $1 AND dr.dataset_id = ds.id
     LEFT JOIN banuchat.embedding_configs ec ON ec.id = dr.embedding_config_id
     WHERE ds.id = 1`,
    [gold.release_id],
  );
  if (releaseResult.rows.length !== 1) fail("Preflight: el dataset id=1 no existe o no es único.");
  const release = releaseResult.rows[0];
  if (release.current_release_id !== gold.release_id) {
    fail("Preflight: datasets.id=1 no apunta al release del gold.");
  }
  if (release.release_id !== gold.release_id || release.status !== "ready") {
    fail("Preflight: el release del gold no existe o no está ready.");
  }
  if (release.chunk_count !== EXPECTED_CORPUS_CHUNK_COUNT) {
    fail(`Preflight: la release tiene ${String(release.chunk_count)} chunks; se esperaban ${EXPECTED_CORPUS_CHUNK_COUNT}.`);
  }
  if (!isRecord(release.parameters) || typeof release.parameters.runtime_version !== "string") {
    fail("Preflight: parameters.runtime_version de embedding no es válido.");
  }

  const references = gold.chunked_cases.flatMap((testCase) => testCase.relevant_chunks);
  const referenceResult = await sql.query(
    `SELECT
       dc.id AS chunk_id,
       d.document_key,
       dc.ordinal,
       dc.locator,
       dc.dataset_release_id AS release_id
     FROM banuchat.document_chunks dc
     JOIN banuchat.document_versions dv ON dv.id = dc.document_version_id
     JOIN banuchat.documents d ON d.id = dv.document_id
     WHERE dc.id = ANY($1::uuid[])`,
    [references.map(({ chunk_id }) => chunk_id)],
  );
  const byChunkId = new Map(referenceResult.rows.map((row) => [row.chunk_id, row]));
  for (const expected of references) {
    const actual = byChunkId.get(expected.chunk_id);
    if (actual === undefined) fail(`Preflight: no existe el gold chunk_id ${expected.chunk_id}.`);
    for (const field of ["document_key", "ordinal", "locator"]) {
      if (actual[field] !== expected[field]) {
        fail(`Preflight: ${expected.chunk_id} no coincide en ${field}.`);
      }
    }
    if (actual.release_id !== gold.release_id) {
      fail(`Preflight: ${expected.chunk_id} pertenece a otra release.`);
    }
  }

  const fullDocumentResult = await sql.query(
    `SELECT document_key, retrieval_mode
       FROM banuchat.documents
      WHERE dataset_id = 1 AND document_key = ANY($1::text[])`,
    [["doc-011", "doc-012"]],
  );
  const fullDocuments = new Map(
    fullDocumentResult.rows.map((row) => [row.document_key, row.retrieval_mode]),
  );
  for (const documentKey of ["doc-011", "doc-012"]) {
    if (fullDocuments.get(documentKey) !== "full_document") {
      fail(`Preflight: ${documentKey} no tiene retrieval_mode=full_document.`);
    }
  }

  return {
    embedding_config_id: release.embedding_config_id,
    provider: release.provider,
    model: release.model,
    model_revision: release.model_revision,
    dimension: release.dimension,
    distance_metric: release.distance_metric,
    stored_runtime_version: release.parameters.runtime_version,
  };
}

function validateRetrieved(testCase, rows, releaseId) {
  if (!Array.isArray(rows) || rows.length !== EXPECTED_TOP_K) {
    fail(`${testCase.id}: F1b debe devolver exactamente ${EXPECTED_TOP_K} resultados.`);
  }
  const seen = new Set();
  return rows.map((row, index) => {
    if (
      !isRecord(row) ||
      typeof row.chunk_id !== "string" ||
      !UUID_PATTERN.test(row.chunk_id) ||
      typeof row.document_key !== "string" ||
      typeof row.document_version_id !== "string" ||
      !UUID_PATTERN.test(row.document_version_id) ||
      !Number.isSafeInteger(row.ordinal) ||
      typeof row.title !== "string" ||
      typeof row.chunk_locator !== "string" ||
      typeof row.cosine_distance !== "number" ||
      !Number.isFinite(row.cosine_distance) ||
      typeof row.cosine_similarity !== "number" ||
      !Number.isFinite(row.cosine_similarity) ||
      row.release_id !== releaseId
    ) {
      fail(`${testCase.id}: resultado inválido en rank ${index + 1}.`);
    }
    if (seen.has(row.chunk_id)) fail(`${testCase.id}: F1b devolvió un chunk_id duplicado.`);
    seen.add(row.chunk_id);
    return {
      rank: index + 1,
      chunk_id: row.chunk_id,
      document_key: row.document_key,
      document_version_id: row.document_version_id,
      ordinal: row.ordinal,
      title: row.title,
      locator: row.chunk_locator,
      cosine_distance: row.cosine_distance,
      cosine_similarity: row.cosine_similarity,
    };
  });
}

function metric(value) {
  return `${value.toFixed(4)} (${(value * 100).toFixed(2)} %)`;
}

function markdownFor(result) {
  const rows = result.cases.map(
    (testCase) =>
      `| ${testCase.id} | ${testCase.first_relevant_rank ?? "—"} | ${testCase.reciprocal_rank_at_5.toFixed(4)} | ${testCase.precision_at_5.toFixed(4)} | ${testCase.recall_at_5.toFixed(4)} | ${testCase.hit_at_5} |`,
  );
  const misses = result.cases.filter(({ hit_at_5 }) => hit_at_5 === 0);
  const missLines = misses.length === 0 ? "Ninguno." : misses.map(({ id }) => `- \`${id}\``).join("\n");
  const fullDocumentLines = result.full_document_cases.map(
    ({ id, relevant_document, status }) => `- \`${id}\` (${relevant_document}): \`${status}\`.`,
  );
  const metrics = result.metrics;

  return `# Evaluación cuantitativa de retrieval K2 v1

## Propósito

Evaluar de forma reproducible el retrieval vectorial productivo F1b sobre los casos chunked del benchmark congelado.

## Identificación e integridad

- Benchmark: \`${result.benchmark_id}\`
- Frozen commit: \`${result.benchmark_frozen_commit}\`
- Implementation revision: \`${result.implementation_revision}\`
- SHA-256 de gold-v1.json: \`${result.inputs.gold_sha256}\`
- Release: \`${result.inputs.release_id}\`
- Corpus: ${result.inputs.corpus_chunk_count} chunks; top_k=${result.inputs.top_k}

## Runtime de embeddings

- Configuración: \`${result.embedding_runtime.embedding_config_id}\`
- Proveedor/modelo: \`${result.embedding_runtime.provider}\` / \`${result.embedding_runtime.model}\`
- Digest/revisión: \`${result.embedding_runtime.model_revision}\`
- Dimensión/distancia: ${result.embedding_runtime.dimension} / \`${result.embedding_runtime.distance_metric}\`
- Runtime almacenado: \`${result.embedding_runtime.stored_runtime_version}\`

## Métricas agregadas

- MRR@5: ${metric(metrics.mrr_at_5)}
- Mean Precision@5: ${metric(metrics.mean_precision_at_5)}
- Mean Recall@5: ${metric(metrics.mean_recall_at_5)}
- Hit rate@5: ${metric(metrics.hit_rate_at_5)}
- Casos con hit / sin hit: ${metrics.cases_with_hit} / ${metrics.cases_without_hit}
- Máximo teórico de Mean Precision@5: ${metric(metrics.theoretical_max_mean_precision_at_5)}

El objetivo histórico documentado es MRR >= 0.70. La comparación con MRR@5 se presenta de forma provisional y conservadora: este valor no equivale automáticamente al MRR de un ranking completo.

## Resultados por caso

| ID | First relevant rank | RR@5 | P@5 | Recall@5 | Hit@5 |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows.join("\n")}

## Casos sin hit

${missLines}

## Casos full_document

${fullDocumentLines.join("\n")}

## Latencia observacional

La duración total de retrieval fue ${result.latency_observation.total_duration_ms.toFixed(2)} ms. Es latencia observacional de esta evaluación de retrieval; no acredita OE6 ni representa latencia del generador o de POST /messages.

## Limitaciones

- El benchmark fue construido sobre corpus sintético.
- MRR observado aquí es MRR@5 porque el sistema recupera top_k=5.
- Precision@5 tiene máximo teórico agregado ≈0.2222 por la densidad del gold.
- Hit@5 y Recall@5 son diagnósticos complementarios.
- La evaluación no mide generación LLM, faithfulness, answer relevancy, experiencia de usuario ni latencia E2E de POST /messages.
- No se realizó tuning usando estos resultados antes de esta ejecución.
`;
}

async function main() {
  const goldBytes = await readFile(goldUrl);
  const gold = validateGold(parseGold(goldBytes));
  const goldSha256 = createHash("sha256").update(goldBytes).digest("hex");
  const revision = await implementationRevision();

  let backend;
  try {
    backend = await import(apiDistUrl.href);
  } catch {
    fail("No fue posible importar backend/api/dist/index.js; compile backend/api antes de ejecutar.");
  }
  const { PgSqlClient, OllamaQueryEmbeddingClient, retrieveDocumentChunksForQuery } = backend;
  if (
    typeof PgSqlClient !== "function" ||
    typeof OllamaQueryEmbeddingClient !== "function" ||
    typeof retrieveDocumentChunksForQuery !== "function"
  ) {
    fail("backend/api/dist/index.js no expone las dependencias F1b requeridas.");
  }

  const requireFromApi = createRequire(apiPackageUrl);
  const { Pool } = requireFromApi("pg");
  const pool = new Pool(databaseConfig());
  const sql = new PgSqlClient(pool);

  try {
    const embeddingRuntime = await preflight(sql, gold);
    const ollamaBaseUrl = process.env.BANUCHAT_EVAL_OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
    const queryEmbeddingClient = new OllamaQueryEmbeddingClient(ollamaBaseUrl);
    const cases = [];
    const evaluationStarted = performance.now();

    for (const testCase of gold.chunked_cases) {
      const started = performance.now();
      let rawRows;
      try {
        rawRows = await retrieveDocumentChunksForQuery(
          { sql, query_embedding_client: queryEmbeddingClient },
          { release_id: gold.release_id, query: testCase.query, top_k: EXPECTED_TOP_K },
        );
      } catch (error) {
        const reason = error instanceof Error && "reason" in error ? ` (${String(error.reason)})` : "";
        fail(`${testCase.id}: falló retrieveDocumentChunksForQuery${reason}.`);
      }
      const latencyMs = performance.now() - started;
      const retrieved = validateRetrieved(testCase, rawRows, gold.release_id);
      const relevantChunks = testCase.relevant_chunks.map(({ chunk_id }) => chunk_id);
      const metrics = calculateCaseMetrics(
        relevantChunks,
        retrieved.map(({ chunk_id }) => chunk_id),
      );
      cases.push({
        id: testCase.id,
        query: testCase.query,
        relevant_chunks: testCase.relevant_chunks,
        latency_ms: latencyMs,
        retrieved,
        ...metrics,
      });
      console.log(`${testCase.id}: completado`);
    }

    const totalDurationMs = performance.now() - evaluationStarted;
    const result = {
      evaluation_type: "retrieval_quantitative_k2_at_5",
      benchmark_id: gold.benchmark_id,
      benchmark_frozen_commit: BENCHMARK_FROZEN_COMMIT,
      implementation_revision: revision,
      generated_at: new Date().toISOString(),
      inputs: {
        gold_sha256: goldSha256,
        release_id: gold.release_id,
        corpus_chunk_count: gold.corpus_chunk_count,
        top_k: gold.top_k,
      },
      embedding_runtime: embeddingRuntime,
      metrics: aggregateMetrics(cases, EXPECTED_RELEVANT_REFERENCES),
      latency_observation: {
        label: "retrieval evaluation observational latency",
        total_duration_ms: totalDurationMs,
      },
      cases,
      full_document_cases: gold.full_document_cases.map((testCase) => ({
        id: testCase.id,
        query: testCase.query,
        relevant_document: testCase.relevant_document,
        status: "not_evaluated_by_vector_retrieval",
      })),
    };

    await mkdir(resultsDirectory, { recursive: true });
    await Promise.all([
      writeFile(jsonResultUrl, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
      writeFile(markdownResultUrl, markdownFor(result), "utf8"),
    ]);
    console.log(JSON.stringify(result.metrics, null, 2));
    console.log(`Resultados: ${fileURLToPath(jsonResultUrl)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Preflight:")) throw error;
    if (error instanceof Error && /^K2-\d{2}:/.test(error.message)) throw error;
    fail("La evaluación falló durante PostgreSQL, Ollama o la validación de resultados.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evaluación K2 fallida.");
  process.exitCode = 1;
});
