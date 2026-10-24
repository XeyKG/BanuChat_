import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import {
  assertGitIgnored,
  fail,
  parseArguments,
  readJson,
  requireOption,
  sha256,
  validateApprovedBenchmark,
} from "./oe1-core.mjs";
import { aggregateRetrievalOutcomes, calculateCaseMetrics } from "./oe1-metrics.mjs";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const privateRoot = join(root, "data/ccd/local");
const apiPackage = join(root, "backend/api/package.json");
const apiDist = join(root, "backend/api/dist/index.js");
const DEFAULT_OLLAMA = "http://127.0.0.1:11434";

function databaseConfig() {
  const port = Number(process.env.POSTGRES_PORT ?? "5432");
  for (const name of ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]) {
    if (!process.env[name]) fail(`Falta ${name}.`);
  }
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) fail("POSTGRES_PORT inválido.");
  return { host: "127.0.0.1", port, database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD };
}

async function gitState() {
  const [revision, status] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root, windowsHide: true }),
    execFileAsync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, windowsHide: true }),
  ]);
  return { revision: revision.stdout.trim(), worktree_dirty: status.stdout.trim().length > 0 };
}

function contextKey(context) {
  return `${context.document_key}\0${context.ordinal}\0${context.locator}\0${context.source_sha256}`;
}

export async function preflight(sql, benchmark) {
  const expected = benchmark.corpus;
  const releaseResult = await sql.query(
    `SELECT ds.name, ds.current_release_id, dr.id AS release_id, dr.status,
            dr.dataset_schema_version, dr.manifest_sha256, dr.pipeline_sha256,
            ec.provider, ec.model, ec.model_revision, ec.dimension,
            ec.distance_metric, ec.config_sha256, ec.parameters,
            (SELECT count(*)::integer FROM banuchat.document_versions dv WHERE dv.dataset_release_id=dr.id) AS document_count,
            (SELECT count(*)::integer FROM banuchat.document_chunks dc WHERE dc.dataset_release_id=dr.id) AS chunk_count,
            (SELECT count(*)::integer FROM banuchat.document_chunks dc WHERE dc.dataset_release_id=dr.id AND dc.embedding IS NOT NULL) AS embedding_count
       FROM banuchat.datasets ds
       JOIN banuchat.dataset_releases dr ON dr.id=$1 AND dr.dataset_id=ds.id
       JOIN banuchat.embedding_configs ec ON ec.id=dr.embedding_config_id
      WHERE ds.name=$2`,
    [expected.release_id, expected.dataset_key],
  );
  if (releaseResult.rows.length !== 1) fail("Preflight: dataset/release no existe o no es único.");
  const row = releaseResult.rows[0];
  const comparisons = {
    current_release_id: expected.release_id,
    release_id: expected.release_id,
    status: "ready",
    dataset_schema_version: expected.schema_version,
    manifest_sha256: expected.manifest_sha256,
    document_count: expected.document_count,
    chunk_count: expected.chunk_count,
    embedding_count: expected.chunk_count,
  };
  for (const [field, value] of Object.entries(comparisons)) {
    if (row[field] !== value) fail(`Preflight: ${field} no coincide con el banco.`);
  }
  if (row.provider !== "ollama" || row.model !== "qwen3-embedding:0.6b" || row.dimension !== 1024 || row.distance_metric !== "cosine") {
    fail("Preflight: la configuración de embeddings no es la canónica de OE1.");
  }
  const references = benchmark.cases.flatMap((testCase) => testCase.relevant_contexts);
  const documentKeys = [...new Set(references.map(({ document_key }) => document_key))];
  const contextsResult = await sql.query(
    `SELECT dc.id AS chunk_id, d.document_key, dc.ordinal, dc.locator,
            dv.source_sha256, dc.content
       FROM banuchat.document_chunks dc
       JOIN banuchat.document_versions dv ON dv.id=dc.document_version_id AND dv.dataset_release_id=dc.dataset_release_id
       JOIN banuchat.documents d ON d.id=dv.document_id AND d.dataset_id=dv.dataset_id
      WHERE dc.dataset_release_id=$1 AND d.document_key=ANY($2::text[])`,
    [expected.release_id, documentKeys],
  );
  const contexts = new Map(contextsResult.rows.map((item) => [contextKey(item), item]));
  for (const reference of references) if (!contexts.has(contextKey(reference))) fail(`Preflight: gold no resoluble para ${reference.document_key}.`);
  return {
    release: {
      dataset: row.name,
      release_id: row.release_id,
      manifest_sha256: row.manifest_sha256,
      pipeline_sha256: row.pipeline_sha256,
      document_count: row.document_count,
      chunk_count: row.chunk_count,
      embedding_count: row.embedding_count,
    },
    embedding: {
      provider: row.provider,
      model: row.model,
      model_revision: row.model_revision,
      dimension: row.dimension,
      distance_metric: row.distance_metric,
      config_sha256: row.config_sha256,
      runtime_version: row.parameters?.runtime_version ?? null,
    },
    contexts,
  };
}

async function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "EVAL_TIMEOUT" })), milliseconds);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

function safeError(error) {
  if (error?.code === "EVAL_TIMEOUT") return { code: "timeout", message: "Tiempo máximo de evaluación agotado." };
  const reason = error && typeof error === "object" && "reason" in error ? String(error.reason) : "runtime_failure";
  return { code: reason.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80), message: "Falló retrieval; revise el log local del runtime." };
}

function validateResponses(value, benchmarkSha, validIds) {
  if (!value || value.schema_version !== "1.0.0" || value.benchmark_sha256 !== benchmarkSha || !Array.isArray(value.cases)) {
    fail("Archivo de respuestas inválido o vinculado a otro benchmark.");
  }
  const result = new Map();
  for (const item of value.cases) {
    if (!item || typeof item.id !== "string" || result.has(item.id) || !["completed", "error", "timeout", "abstention"].includes(item.status)) fail("Caso inválido o duplicado en respuestas.");
    if (!validIds.has(item.id)) fail(`Respuesta para ID ajeno al benchmark: ${item.id}.`);
    if (item.status === "completed" && (typeof item.response !== "string" || item.response.trim() === "")) fail(`${item.id}: response vacío.`);
    if (["error", "timeout"].includes(item.status) && item.error_code !== undefined && (typeof item.error_code !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(item.error_code))) fail(`${item.id}: error_code inválido.`);
    result.set(item.id, item);
  }
  return result;
}

export async function evaluateCases({ benchmark, benchmarkSha, contexts, retrieve, timeoutMs, responses }) {
  const outcomes = [];
  for (const testCase of benchmark.cases) {
    const gold = testCase.relevant_contexts.map((context) => contexts.get(contextKey(context)).chunk_id);
    const started = performance.now();
    try {
      const rows = await withTimeout(retrieve(testCase.question), timeoutMs);
      if (!Array.isArray(rows) || rows.length !== benchmark.top_k) fail(`${testCase.id}: retrieval no devolvió top_k=${benchmark.top_k}.`);
      const metrics = calculateCaseMetrics(gold, rows.map(({ chunk_id }) => chunk_id));
      const response = responses?.get(testCase.id);
      const responseStatus = response?.status ?? "not_provided";
      const ragasEvaluable = responseStatus === "completed";
      outcomes.push({
        id: testCase.id,
        status: "completed",
        response_status: responseStatus,
        response_outcome: { status: responseStatus, ...(response?.error_code ? { error_code: response.error_code } : {}) },
        latency_ms: performance.now() - started,
        relevant_count: gold.length,
        relevant_chunk_ids: gold,
        retrieved: rows.map((row, index) => ({
          rank: index + 1,
          chunk_id: row.chunk_id,
          document_key: row.document_key,
          ordinal: row.ordinal,
          locator: row.chunk_locator,
          source_sha256: row.source_sha256,
          cosine_similarity: row.cosine_similarity,
          content: row.content,
        })),
        metrics,
        ...(ragasEvaluable ? { ragas_input: {
          user_input: testCase.question,
          response: response.response,
          reference: testCase.reference_answer,
          retrieved_contexts: rows.map(({ content }) => content),
          reference_contexts: testCase.relevant_contexts.map((context) => contexts.get(contextKey(context)).content),
          retrieved_context_ids: rows.map(({ chunk_id }) => chunk_id),
          reference_context_ids: gold,
        } } : {}),
      });
    } catch (error) {
      const detail = safeError(error);
      outcomes.push({ id: testCase.id, status: detail.code === "timeout" ? "timeout" : "error", response_status: responses?.get(testCase.id)?.status ?? "not_provided", latency_ms: performance.now() - started, error: detail });
    }
  }
  return { benchmark_sha256: benchmarkSha, outcomes };
}

async function main() {
  const { options } = parseArguments(["run", ...process.argv.slice(2)]);
  const benchmarkPath = resolve(requireOption(options, "benchmark"));
  const outputPath = resolve(requireOption(options, "output"));
  await Promise.all([assertGitIgnored(benchmarkPath, root), assertGitIgnored(outputPath, root)]);
  const { value: benchmark, bytes } = await readJson(benchmarkPath);
  const validation = validateApprovedBenchmark(benchmark);
  if (!validation.valid) fail(`Benchmark no aprobado:\n- ${validation.errors.join("\n- ")}`);
  const benchmarkSha = sha256(bytes);
  let responses;
  if (options.responses) {
    const responsePath = resolve(options.responses);
    await assertGitIgnored(responsePath, root);
    responses = validateResponses((await readJson(responsePath)).value, benchmarkSha, new Set(benchmark.cases.map(({ id }) => id)));
  }
  const backend = await import(pathToFileURL(apiDist).href);
  for (const name of ["PgSqlClient", "OllamaQueryEmbeddingClient", "retrieveDocumentChunksForQuery"]) {
    if (typeof backend[name] !== "function") fail(`backend/api/dist no expone ${name}; compile backend/api.`);
  }
  const requireFromApi = createRequire(apiPackage);
  const { Pool } = requireFromApi("pg");
  const pool = new Pool(databaseConfig());
  const sql = new backend.PgSqlClient(pool);
  try {
    const checked = await preflight(sql, benchmark);
    const queryClient = new backend.OllamaQueryEmbeddingClient(process.env.BANUCHAT_EVAL_OLLAMA_BASE_URL ?? DEFAULT_OLLAMA);
    const timeoutMs = Number(options.timeout_ms ?? 120000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) fail("--timeout-ms inválido.");
    const executed = options.preflight_only ? { benchmark_sha256: benchmarkSha, outcomes: [] } : await evaluateCases({
      benchmark,
      benchmarkSha,
      contexts: checked.contexts,
      timeoutMs,
      responses,
      retrieve: (question) => backend.retrieveDocumentChunksForQuery({ sql, query_embedding_client: queryClient }, { release_id: benchmark.corpus.release_id, query: question, top_k: benchmark.top_k }),
    });
    const result = {
      schema_version: "1.0.0",
      evaluation_id: "banuchat-oe1-d3",
      evaluation_scope: options.preflight_only ? "preflight_only" : "retrieval_and_ragas_preparation",
      generated_at: new Date().toISOString(),
      implementation: await gitState(),
      inputs: { benchmark_path: "private_local_ignored", benchmark_sha256: benchmarkSha, response_capture_supplied: Boolean(responses) },
      parameters: { top_k: benchmark.top_k, timeout_ms: timeoutMs, automatic_retries: 0 },
      runtime: checked.release,
      embedding: checked.embedding,
      retrieval: executed.outcomes.length ? aggregateRetrievalOutcomes(executed.outcomes) : null,
      ragas: {
        version: "0.4.3",
        api: "ragas.metrics.collections",
        judge_kind: "local_llm",
        prepared_cases: executed.outcomes.filter((item) => item.ragas_input).length,
        excluded_abstentions: executed.outcomes.filter((item) => item.response_status === "abstention").length,
        response_outcomes: Object.fromEntries([...executed.outcomes.reduce((map, item) => map.set(item.response_status, (map.get(item.response_status) ?? 0) + 1), new Map())].sort()),
        note: "Las métricas RAGAS se ejecutan con ragas-adapter.py sobre este artefacto privado.",
      },
      cases: executed.outcomes,
    };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output: outputPath, retrieval: result.retrieval, ragas: result.ragas }, null, 2));
  } finally { await pool.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
