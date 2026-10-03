#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const API_DIR = join(ROOT, "backend", "api");
const L1_CASES_PATH = join(HERE, "l1-rag-latency-cases.json");
const G0_PROMPTS_PATH = join(HERE, "prompts-v2.json");
const RESULTS = join(HERE, "results");
const PROFILE_KEY = "profile-001";
const REQUEST_TIMEOUT_MS = 180_000;
const PREFLIGHT_TIMEOUT_MS = 15_000;
const STAGES = [
  "conversation_context_db_ms",
  "rag_embedding_config_db_ms",
  "query_embedding_ms",
  "rag_release_availability_db_ms",
  "vector_retrieval_db_ms",
  "generation_ms",
  "persistence_db_ms",
];
const REQUIRED_SQL = [
  "conversation_context_db_ms",
  "rag_embedding_config_db_ms",
  "rag_release_availability_db_ms",
  "vector_retrieval_db_ms",
  "persistence_db_ms",
];
const HTTP_ERROR_CODES = new Set([
  "INVALID_ARGUMENT", "NOT_FOUND", "CONFLICT",
  "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const ALLOWED_CHANGES = new Set([
  "eval/generation/l1-rag-latency-cases.json",
  "eval/generation/run-rag-latency-profile.mjs",
  "eval/generation/README.md",
]);

class SafeRunnerError extends Error {}

function assert(condition, message) {
  if (!condition) throw new SafeRunnerError(message);
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteMs(value, name) {
  assert(typeof value === "number" && Number.isFinite(value) && value >= 0,
    `Métrica inválida: ${name}`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function gitState() {
  const changed = git("diff", "--name-only", "HEAD").split(/\r?\n/u).filter(Boolean);
  const untracked = git("ls-files", "--others", "--exclude-standard")
    .split(/\r?\n/u).filter(Boolean);
  const paths = [...new Set([...changed, ...untracked])];
  assert(paths.every((path) => ALLOWED_CHANGES.has(path)),
    "Hay cambios Git fuera de los archivos L1 autorizados.");
  return { implementation_revision: git("rev-parse", "HEAD"),
    implementation_changed_paths: paths };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function bogotaDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function validateG0Cases(data) {
  assert(data?.schema_version === "2" && data?.benchmark_id === "banuchat-generator-g0-v2" &&
    Array.isArray(data.cases) && data.cases.length === 10,
  "prompts-v2.json no contiene los diez casos G0 v2 esperados.");
  return data.cases.map((item, index) => {
    const id = `G0-${String(index + 1).padStart(2, "0")}`;
    assert(item?.id === id && nonempty(item.question) && [...item.question].length <= 4000,
      `Caso inválido: ${id}`);
    return { id, question: item.question };
  });
}

function validateL1Cases(data) {
  assert(data?.schema_version === "1" &&
    data?.workload_id === "banuchat-rag-latency-l1" &&
    Array.isArray(data.cases) && data.cases.length === 10,
  "l1-rag-latency-cases.json debe contener exactamente diez casos L1.");
  return data.cases.map((item, index) => {
    const id = `L1-${String(index + 1).padStart(2, "0")}`;
    assert(item?.id === id && nonempty(item.question) &&
      [...item.question].length <= 4000 && nonempty(item.rationale) &&
      Object.keys(item).sort().join(",") === "id,question,rationale",
    `Caso L1 inválido: ${id}`);
    return { id, question: item.question, rationale: item.rationale };
  });
}

function verifyRoutes(router, cases) {
  assert(router.catalog_valid === true && router.catalog_version === "1.1.0-draft",
    "El catálogo de Intent Router cambió; revisar los casos antes de medir.");
  const invalid = cases.flatMap(({ id, question }) => {
    const route = router.route({ content: question,
      context: { profile_selected: true, now: new Date().toISOString() } }).route;
    return route === "agent_fallback" ? [] : [`${id}=${route}`];
  });
  assert(invalid.length === 0, `Preguntas fuera de agent_fallback: ${invalid.join(", ")}`);
}

function classifySql(text) {
  const sql = text.trimStart();
  if (sql.startsWith("SELECT") && sql.includes("AS expected_next_ordinal") &&
    sql.includes("FROM banuchat.conversations c")) return "conversation_context_db_ms";
  if (sql.startsWith("SELECT") && sql.includes("FROM banuchat.dataset_releases dr") &&
    sql.includes("JOIN banuchat.embedding_configs ec")) return "rag_embedding_config_db_ms";
  if (sql.startsWith("SELECT EXISTS") && sql.includes("FROM banuchat.dataset_releases dr"))
    return "rag_release_availability_db_ms";
  if (sql.startsWith("SELECT") && sql.includes("dc.embedding <=> $2::vector") &&
    sql.includes("FROM banuchat.document_chunks dc")) return "vector_retrieval_db_ms";
  if (sql.startsWith("WITH locked_conversation AS MATERIALIZED") &&
    sql.includes("inserted_citations AS")) return "persistence_db_ms";
  throw new Error("Consulta SQL inesperada durante POST /messages; perfil abortado.");
}

function safeDependencyError(error, backend) {
  if (error instanceof backend.QueryEmbeddingClientError) {
    return ["embedding_runtime_mismatch", "embedding_unavailable",
      "invalid_embedding_response"].includes(error.reason) ? error.reason : "unknown";
  }
  if (error instanceof backend.GeneratorClientError) {
    return ["generator_runtime_mismatch", "generator_unavailable",
      "invalid_generator_response", "generator_response_incomplete"]
      .includes(error.reason) ? error.reason : "unknown";
  }
  if (error instanceof backend.DatabaseDependencyError) return "DatabaseDependencyError";
  return "unknown";
}

function recorder(backend, retainLast = false, recordTimings = true) {
  let active = null;
  let last = null;
  return {
    get active() { return active; },
    get last() { return last; },
    begin() {
      assert(active === null, "Mediciones solapadas.");
      if (retainLast) last = null;
      active = { timings: {}, counts: {}, routes: [], rag_calls: 0,
        embedding_calls: 0, generation_calls: 0, generator_ollama_total_duration_ms: null,
        active_stage: null, last_stage_started: null, last_stage_completed: null,
        dependency_error: null };
      return active;
    },
    end() { if (retainLast) last = active; active = null; },
    async time(name, operation) {
      const measurement = active;
      if (measurement) {
        measurement.active_stage = name;
        measurement.last_stage_started = name;
        measurement.counts[name] = (measurement.counts[name] ?? 0) + 1;
      }
      const start = recordTimings ? performance.now() : null;
      try {
        const result = await operation();
        if (measurement) {
          if (recordTimings) {
            measurement.timings[name] = (measurement.timings[name] ?? 0) +
              finiteMs(performance.now() - start, name);
          }
          measurement.last_stage_completed = name;
        }
        return result;
      } catch (error) {
        if (measurement) measurement.dependency_error = safeDependencyError(error, backend);
        throw error;
      }
      finally {
        if (measurement?.active_stage === name) measurement.active_stage = null;
      }
    },
  };
}

function diagnosticNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function diagnosticOllamaResponse(response, body) {
  const message = body?.message;
  const content = typeof message?.content === "string" ? message.content : null;
  const thinking = message?.thinking;
  return {
    ollama_http_status: response.status,
    ollama_done: typeof body?.done === "boolean" ? body.done : null,
    ollama_done_reason: typeof body?.done_reason === "string" &&
      /^[a-z_]{1,32}$/u.test(body.done_reason) ? body.done_reason : null,
    ollama_prompt_eval_count: diagnosticNumber(body?.prompt_eval_count),
    ollama_eval_count: diagnosticNumber(body?.eval_count),
    ollama_total_duration_ns: diagnosticNumber(body?.total_duration),
    ollama_load_duration_ns: diagnosticNumber(body?.load_duration),
    ollama_prompt_eval_duration_ns: diagnosticNumber(body?.prompt_eval_duration),
    ollama_eval_duration_ns: diagnosticNumber(body?.eval_duration),
    ollama_content_present: message && typeof message === "object"
      ? content !== null : null,
    ollama_content_length_chars: content === null ? null : [...content].length,
    ollama_thinking_present: message && typeof message === "object"
      ? (typeof thinking === "string" ? thinking.length > 0
        : thinking === undefined ? false : null) : null,
  };
}

function diagnosticGeneratorFetch(observation) {
  return async (input, init) => {
    const response = await fetch(input, init);
    if (init?.method === "POST" && new URL(input).pathname === "/api/chat") {
      let body = null;
      try { body = await response.clone().json(); }
      catch { /* El status sigue disponible aunque el JSON no lo esté. */ }
      observation.raw_chat = diagnosticOllamaResponse(response, body);
    }
    return response;
  };
}

function diagnosticOutput(item, measurement, observation, result) {
  const generatorResult = measurement?.generation_calls
    ? measurement.dependency_error ?? "success" : "not_called";
  const details = observation.raw_chat ?? diagnosticOllamaResponse(
    { status: null }, null);
  return [
    `L1 DIAGNOSTIC ${item.id}`,
    `route=${measurement?.routes.join(",") || "unknown"}`,
    `rag_calls=${measurement?.rag_calls ?? 0}`,
    `embedding_calls=${measurement?.embedding_calls ?? 0}`,
    `generation_calls=${measurement?.generation_calls ?? 0}`,
    `active_or_last_stage=${measurement?.active_stage ??
      measurement?.last_stage_started ?? measurement?.last_stage_completed ?? "unknown"}`,
    `generator_client_result=${generatorResult}`,
    ...Object.entries(details).map(([key, value]) => `${key}=${value ?? "unknown"}`),
    ...(details.ollama_done_reason === "length"
      ? ["Interpretación: done_reason=length describe solo esta respuesta de Ollama; no implica una decisión de optimización."]
      : []),
    `official_l1_result=false`,
    `case_outcome=${result}`,
  ].join("\n");
}

async function request(base, path, { method = "GET", body, timeout = REQUEST_TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, { method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), redirect: "error",
      signal: AbortSignal.timeout(timeout) });
  } catch (error) {
    const suffix = method === "POST" && path.endsWith("/messages")
      ? "; resultado incierto, no reenviar" : "";
    throw new Error(`${method} ${path} falló (${error?.name ?? "red"})${suffix}`);
  }
  return response;
}

async function expectedJson(response, status, label) {
  assert(response.status === status, `${label}: HTTP ${response.status}, esperado ${status}.`);
  try { return await response.json(); }
  catch { throw new Error(`${label}: respuesta JSON inválida.`); }
}

async function unexpectedHttpError(response) {
  let body;
  try { body = await response.json(); }
  catch { body = null; }
  const error = body?.error;
  return {
    http_status: response.status,
    error_code: HTTP_ERROR_CODES.has(error?.code) ? error.code : null,
    request_id: typeof error?.request_id === "string" &&
      UUID_PATTERN.test(error.request_id) ? error.request_id : null,
  };
}

function abortDiagnostic(item, current, httpError, httpStatus, cleanupSuccess) {
  const timings = Object.fromEntries(STAGES.filter((stage) =>
    current?.timings[stage] !== undefined).map((stage) => [stage, current.timings[stage]]));
  const counts = Object.fromEntries(STAGES.filter((stage) =>
    current?.counts[stage] !== undefined).map((stage) => [stage, current.counts[stage]]));
  return new SafeRunnerError([
    `L1 case ${item.id} aborted:`,
    `http_status=${httpError?.http_status ?? httpStatus ?? "unknown"}`,
    `error_code=${httpError?.error_code ?? "unknown"}`,
    `request_id=${httpError?.request_id ?? "unknown"}`,
    `route=${current?.routes.join(",") || "unknown"}`,
    `rag_calls=${current?.rag_calls ?? 0}`,
    `embedding_calls=${current?.embedding_calls ?? 0}`,
    `generation_calls=${current?.generation_calls ?? 0}`,
    `timings_completed=${JSON.stringify(timings)}`,
    `counts=${JSON.stringify(counts)}`,
    `active_or_last_stage=${current?.active_stage ?? current?.last_stage_started ??
      current?.last_stage_completed ?? "unknown"}`,
    `dependency_error=${current?.dependency_error ?? "unknown"}`,
    ...(current?.validation_failure ? [`validation_failure=${current.validation_failure}`] : []),
    `cleanup_success=${cleanupSuccess}`,
  ].join("\n"));
}

async function ollamaJson(base, path, body) {
  const response = await request(base, path, { method: body === undefined ? "GET" : "POST",
    body, timeout: PREFLIGHT_TIMEOUT_MS });
  return expectedJson(response, 200, `Ollama ${path}`);
}

function normalizedDigest(value) {
  return typeof value === "string" && /^(?:sha256:)?[0-9a-f]{64}$/iu.test(value)
    ? value.replace(/^sha256:/iu, "").toLowerCase() : null;
}

async function preflight(sql, runtime) {
  const db = await sql.query(`SELECT d.current_release_id AS release_id,
    ec.model AS embedding_model, ec.model_revision AS embedding_revision,
    ec.dimension AS embedding_dimension, ec.distance_metric AS embedding_distance,
    ec.parameters AS embedding_parameters
    FROM banuchat.datasets d
    JOIN banuchat.dataset_releases dr ON dr.id = d.current_release_id
      AND dr.dataset_id = d.id AND dr.status = 'ready'
    JOIN banuchat.embedding_configs ec ON ec.id = dr.embedding_config_id
    WHERE d.id = $1`, [1]);
  assert(db.rows.length === 1 && nonempty(db.rows[0].release_id),
    "No hay una única release sintética actual lista.");
  const release = db.rows[0];
  assert(release.embedding_model === "qwen3-embedding:0.6b" &&
    release.embedding_dimension === 1024 && release.embedding_distance === "cosine" &&
    normalizedDigest(release.embedding_revision) !== null,
  "Configuración de embedding de release inválida.");
  const pg = await sql.query(`SELECT current_setting('server_version') AS server_version,
    (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version`);
  assert(pg.rows.length === 1 && nonempty(pg.rows[0].server_version) &&
    nonempty(pg.rows[0].pgvector_version), "PostgreSQL/pgvector no disponible.");
  const base = runtime.base_url;
  const version = await ollamaJson(base, "/api/version");
  const tags = await ollamaJson(base, "/api/tags");
  assert(nonempty(version.version) && Array.isArray(tags.models) &&
    version.version === runtime.generator.runtime_version &&
    release.embedding_parameters?.runtime_version === version.version,
  "Runtime de Ollama no coincide con la configuración del generador.");
  const findModel = (name) => tags.models.find((item) =>
    item?.name === name || item?.model === name);
  const generatorDigest = normalizedDigest(findModel(runtime.generator.model)?.digest);
  const embeddingDigest = normalizedDigest(findModel(release.embedding_model)?.digest);
  assert(generatorDigest === normalizedDigest(runtime.generator.model_revision) &&
    embeddingDigest === normalizedDigest(release.embedding_revision),
  "Digest de generador o embedding no coincide con la configuración.");
  const generatorShow = await ollamaJson(base, "/api/show", { model: runtime.generator.model });
  const embeddingShow = await ollamaJson(base, "/api/show", { model: release.embedding_model });
  assert(generatorShow?.capabilities?.includes("completion") &&
    embeddingShow?.capabilities?.includes("embedding"),
  "Capabilities de modelos Ollama inválidas.");
  return {
    release_id: release.release_id,
    postgres_server_version: pg.rows[0].server_version,
    pgvector_version: pg.rows[0].pgvector_version,
    ollama_runtime_version: version.version,
    embedding_model: release.embedding_model,
    embedding_model_revision: embeddingDigest,
    embedding_dimension: release.embedding_dimension,
    embedding_distance_metric: release.embedding_distance,
    embedding_parameters: release.embedding_parameters,
    generator_model: runtime.generator.model,
    generator_digest: generatorDigest,
    generator_recipe: runtime.generator.recipe,
  };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
  const address = server.address();
  assert(address && typeof address === "object" && address.address === "127.0.0.1",
    "El servidor no abrió en loopback.");
  return `http://127.0.0.1:${address.port}/api/v1`;
}

async function closeServer(server) {
  if (server?.listening) await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
}

async function createConversation(base) {
  const created = await expectedJson(await request(base, "/conversations", {
    method: "POST", body: { profile_key: PROFILE_KEY } }), 201, "Crear conversación");
  assert(nonempty(created?.conversation_id), "Conversación creada sin ID.");
  if (created.profile_key !== PROFILE_KEY) {
    await cleanup(base, created.conversation_id);
    throw new Error("Conversación creada con perfil inesperado.");
  }
  return created.conversation_id;
}

async function cleanup(base, id) {
  const path = `/conversations/${encodeURIComponent(id)}`;
  const deleted = await request(base, path, { method: "DELETE", timeout: 15_000 });
  assert(deleted.status === 204, `Limpieza no confirmada: DELETE HTTP ${deleted.status}.`);
  const after = await request(base, path, { timeout: 15_000 });
  assert(after.status === 404, `Limpieza no confirmada: GET HTTP ${after.status}.`);
}

async function runCase(base, item, instrumentation, { functionalOnly = false } = {}) {
  const conversationId = await createConversation(base);
  let failure;
  let run;
  let cleaned = false;
  let current;
  let response;
  let httpError;
  try {
    current = instrumentation.begin();
    const start = functionalOnly ? null : performance.now();
    let data;
    try {
      response = await request(base,
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
        { method: "POST", body: { content: item.question } });
      if (response.status !== 201) {
        httpError = await unexpectedHttpError(response);
        throw new Error("POST /messages devolvió un status inesperado.");
      }
      data = await expectedJson(response, 201, "POST /messages");
    } finally { instrumentation.end(); }
    const wall = functionalOnly ? null : finiteMs(performance.now() - start, "wall_ms");
    assert(current.routes.length === 1 && current.routes[0] === "agent_fallback" &&
      current.rag_calls === 1 && current.embedding_calls === 1 &&
      current.generation_calls === 1,
    "La ruta no ejecutó exactamente una vez Document RAG, embedding y generación.");
    let other;
    if (!functionalOnly) {
      for (const stage of STAGES) {
        assert(current.counts[stage] === 1 && current.timings[stage] !== undefined,
          `Etapa ausente o repetida: ${stage}`);
        finiteMs(current.timings[stage], stage);
      }
      assert(Object.keys(current.counts).every((stage) => STAGES.includes(stage)),
        "Etapa de medición inesperada.");
      const observed = STAGES.reduce((sum, stage) => sum + current.timings[stage], 0);
      other = wall - observed;
      assert(other >= 0, "Las etapas exceden el wall clock; revisar solapamiento.");
    }
    assert(data?.conversation_id === conversationId &&
      data?.user_message?.content === item.question &&
      nonempty(data?.assistant_message?.content) &&
      typeof data?.assistant_message?.insufficient_evidence === "boolean" &&
      Array.isArray(data?.assistant_message?.citations),
    "Respuesta de Document RAG inválida.");
    const citations = data.assistant_message.citations;
    if (functionalOnly) {
      current.validation_failure = data.assistant_message.insufficient_evidence
        ? "insufficient_evidence"
        : citations.length === 0 ? "zero_citations"
        : citations.some((citation) => citation?.source_kind !== "document")
          ? "non_document_citation" : null;
      assert(current.validation_failure === null,
        "El caso L1 no obtuvo evidencia suficiente y citas documentales.");
    }
    assert(citations.every((citation) => citation?.source_kind === "document"),
      "La respuesta contiene citas no documentales.");
    run = functionalOnly
      ? { id: item.id, http_status: response.status, route: current.routes[0],
        rag_calls: current.rag_calls, embedding_calls: current.embedding_calls,
        generation_calls: current.generation_calls,
        insufficient_evidence: false, citation_count: citations.length,
        cleanup_success: false }
      : { id: item.id, question: item.question, http_status: response.status,
        wall_ms: wall, insufficient_evidence: data.assistant_message.insufficient_evidence,
        citation_count: citations.length, all_document: citations.length > 0,
        ...current.timings,
        generator_ollama_total_duration_ms: finiteMs(
          current.generator_ollama_total_duration_ms, "generator_ollama_total_duration_ms"),
        other_orchestration_ms: other, cleanup_success: false };
  } catch (error) { failure = error; }
  try { await cleanup(base, conversationId); cleaned = true; }
  catch { cleaned = false; }
  if (failure || !cleaned) {
    throw abortDiagnostic(item, current, httpError, response?.status, cleaned);
  }
  run.cleanup_success = cleaned;
  return run;
}

function stats(values) {
  assert(values.length === 10, "Los agregados requieren exactamente diez corridas.");
  values.forEach((value) => finiteMs(value, "agregado"));
  const ordered = [...values].sort((a, b) => a - b);
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: (ordered[4] + ordered[5]) / 2, min: ordered[0], max: ordered[9],
    p95: ordered[Math.ceil(0.95 * values.length) - 1] };
}

function aggregate(runs) {
  assert(runs.length === 10 && runs.every((run) => run.cleanup_success),
    "Faltan corridas medidas o limpiezas confirmadas.");
  const wall = runs.map((run) => run.wall_ms);
  const stages = Object.fromEntries([...STAGES, "generator_ollama_total_duration_ms",
    "other_orchestration_ms"].map((stage) =>
    [stage, stats(runs.map((run) => run[stage]))]));
  return { wall_ms: { count: 10, ...stats(wall),
    under_5000_ms_count: wall.filter((ms) => ms < 5000).length,
    at_or_over_5000_ms_count: wall.filter((ms) => ms >= 5000).length }, stages };
}

async function assertAbsent(path) {
  try { await access(path); }
  catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new SafeRunnerError("Ya existe un resultado L1 para esta fecha.");
}

function markdown(report) {
  const f = (number) => number.toFixed(2);
  const rows = report.warm_runs.map((run) =>
    `| ${run.id} | ${run.http_status} | ${f(run.wall_ms)} | ${f(run.query_embedding_ms)} | ${f(run.vector_retrieval_db_ms)} | ${f(run.generation_ms)} | ${run.citation_count} | ${run.insufficient_evidence} | ${run.cleanup_success} |`).join("\n");
  const stageRows = Object.entries(report.warm_aggregates.stages).map(([name, s]) =>
    `| ${name} | ${f(s.mean)} | ${f(s.median)} | ${f(s.min)} | ${f(s.max)} | ${f(s.p95)} |`).join("\n");
  const wall = report.warm_aggregates.wall_ms;
  return `# L1 — Perfil de latencia RAG end-to-end de BanuChat

## Entorno y método

- Generado: \`${report.metadata.generated_at}\`.
- Commit: \`${report.metadata.implementation_revision}\`.
- Archivos L1 sin commit al ejecutar: \`${report.metadata.implementation_changed_paths.join(", ") || "ninguno"}\`.
- SHA-256 del runner: \`${report.metadata.runner_sha256}\`.
- SHA-256 del workload L1: \`${report.metadata.l1_cases_sha256}\`.
- Release: \`${report.metadata.release_id}\`.
- PostgreSQL: \`${report.metadata.postgres_server_version}\`; pgvector: \`${report.metadata.pgvector_version}\`.
- Ollama: \`${report.metadata.ollama_runtime_version}\`.
- Embedding: \`${report.metadata.embedding_model}\`, digest \`${report.metadata.embedding_model_revision}\`, ${report.metadata.embedding_dimension} dimensiones, ${report.metadata.embedding_distance_metric}.
- Generador: \`${report.metadata.generator_model}\`, digest \`${report.metadata.generator_digest}\`.
- Receta generador: \`${JSON.stringify(report.metadata.generator_recipe)}\`.
- Receta embedding de release: \`${JSON.stringify(report.metadata.embedding_parameters)}\`.
- Diez POST /messages secuenciales con conversación nueva, retrieval y modelos reales. El warmup se excluyó de los agregados.

## Warmup excluido

HTTP ${report.warmup.http_status}; wall ${f(report.warmup.wall_ms)} ms; limpieza confirmada: ${report.warmup.cleanup_success}.

## Diez corridas warm

| ID | HTTP | wall ms | embedding ms | vector DB ms | generación ms | citas | evidencia insuficiente | cleanup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${rows}

Las preguntas exactas, todas las etapas por corrida y las banderas \`all_document\` están en el JSON complementario.

## Agregados de las diez corridas

- Wall clock: n=${wall.count}; media ${f(wall.mean)} ms; mediana ${f(wall.median)} ms; mínimo ${f(wall.min)} ms; máximo ${f(wall.max)} ms; p95 ${f(wall.p95)} ms.
- Por debajo de 5000 ms: ${wall.under_5000_ms_count}; en o por encima: ${wall.at_or_over_5000_ms_count}.

| Etapa | media ms | mediana ms | mínimo ms | máximo ms | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
${stageRows}

El p95 usa nearest rank: ordenar las diez observaciones y tomar la posición \`ceil(0.95 × 10) = 10\` (el máximo). Con n=10 es una descripción muy inestable, cercana al extremo superior; no es una estimación poblacional robusta.

\`generator_ollama_total_duration_ms\` es una métrica interna de Ollama incluida dentro de \`generation_ms\`; no se suma al residual. \`rag_release_availability_db_ms\` mide la comprobación de release separada de la consulta pgvector. \`other_orchestration_ms\` es wall menos las siete etapas secuenciales observadas; incluye router, serialización, transporte HTTP local y trabajo no separado. No atribuye ese residual a un componente individual.

## Interpretación

${wall.mean >= 5000 ? "En el entorno local observado, la muestra L1 no alcanzó la referencia histórica de 5000 ms para las solicitudes RAG medidas." : "La media observada de la muestra L1 quedó por debajo de la referencia histórica de 5000 ms para estas solicitudes RAG."} L1 no decide el cumplimiento de OE6. G0, G2 y J1 son antecedentes separados y no se combinaron estadísticamente con L1.
`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.length === 1 && args[0] === "--dry-run";
  const functionalValidation = args.length === 1 && args[0] === "--validate-l1-cases";
  const diagnosticId = args.length === 2 && args[0] === "--diagnose-case" &&
    /^G0-(?:0[1-9]|10)$/u.test(args[1]) ? args[1] : null;
  assert(args.length === 0 || dryRun || functionalValidation || diagnosticId !== null,
  "Uso: node eval/generation/run-rag-latency-profile.mjs [--dry-run | --validate-l1-cases | --diagnose-case G0-01..G0-10]");
  const state = gitState();
  const caseBytes = await readFile(diagnosticId === null ? L1_CASES_PATH : G0_PROMPTS_PATH);
  const cases = diagnosticId === null
    ? validateL1Cases(JSON.parse(caseBytes.toString("utf8")))
    : validateG0Cases(JSON.parse(caseBytes.toString("utf8")));
  const backend = await import(new URL("../../backend/api/dist/index.js", import.meta.url));
  const router = await backend.loadDefaultIntentRouter();
  verifyRoutes(router, cases);
  if (dryRun) {
    console.log(`L1 dry-run: ${cases.map((item) => item.id).join(", ")} -> agent_fallback; sin DB, Ollama ni POST.`);
    return;
  }

  const runDate = bogotaDate(new Date());
  const basename = `l1-rag-latency-${runDate}`;
  const jsonPath = join(RESULTS, `${basename}.json`);
  const mdPath = join(RESULTS, `${basename}.md`);
  if (diagnosticId === null && !functionalValidation) {
    await assertAbsent(jsonPath);
    await assertAbsent(mdPath);
  }

  const runtimeConfig = backend.loadRuntimeConfig();
  const generatorRuntime = backend.loadGeneratorRuntimeConfig();
  const { Pool } = createRequire(join(API_DIR, "package.json"))("pg");
  const pool = new Pool({ ...runtimeConfig.postgres });
  let server;
  try {
    const realSql = new backend.PgSqlClient(pool);
    const environment = await preflight(realSql, generatorRuntime);
    const instrument = recorder(backend, diagnosticId !== null, !functionalValidation);
    const sql = { query: (text, values) => {
      if (!instrument.active) return realSql.query(text, values);
      return instrument.time(classifySql(text), () => realSql.query(text, values));
    } };
    const embedding = new backend.OllamaQueryEmbeddingClient(generatorRuntime.base_url);
    const diagnosticObservation = diagnosticId === null ? null : { raw_chat: null };
    const generator = diagnosticObservation === null
      ? new backend.OllamaGeneratorClient(generatorRuntime.base_url)
      : new backend.OllamaGeneratorClient(generatorRuntime.base_url, undefined,
        diagnosticGeneratorFetch(diagnosticObservation));
    const measuredEmbedding = { embedQuery: (text, config) => {
      instrument.active.embedding_calls += 1;
      return instrument.time("query_embedding_ms", () => embedding.embedQuery(text, config));
    } };
    const measuredGenerator = { generate: (input, config) => {
      instrument.active.generation_calls += 1;
      return instrument.time("generation_ms", async () => {
        const result = await generator.generate(input, config);
        if (!functionalValidation) {
          instrument.active.generator_ollama_total_duration_ms = result.total_duration_ms;
        }
        return result;
      });
    } };
    const documentRag = (input) => {
      instrument.active.rag_calls += 1;
      assert(input.release_id === environment.release_id, "Release de Document RAG inesperada.");
      return backend.generateDocumentRagAnswer({ sql,
        query_embedding_client: measuredEmbedding,
        generator_client: measuredGenerator,
        generator_config: generatorRuntime.generator }, input);
    };
    const measuredRouter = { catalog_valid: router.catalog_valid,
      catalog_version: router.catalog_version,
      route(input) {
        const decision = router.route(input);
        if (instrument.active) instrument.active.routes.push(decision.route);
        return decision;
      } };
    server = await backend.createRuntimeApiServer(sql, documentRag,
      async () => measuredRouter);
    const base = await listen(server);
    if (diagnosticId !== null) {
      const item = cases.find((entry) => entry.id === diagnosticId);
      assert(item !== undefined, "ID diagnóstico inválido.");
      try {
        const run = await runCase(base, item, instrument);
        console.log(diagnosticOutput(item, instrument.last, diagnosticObservation, "completed"));
        console.log(`http_status=${run.http_status}\ncleanup_success=${run.cleanup_success}`);
      } catch (error) {
        if (!(error instanceof SafeRunnerError)) throw error;
        console.error(diagnosticOutput(item, instrument.last, diagnosticObservation, "aborted"));
        console.error(error.message);
        process.exitCode = 1;
      }
      return;
    }
    if (functionalValidation) {
      for (const item of cases) {
        const run = await runCase(base, item, instrument, { functionalOnly: true });
        console.log(`${item.id}: PASS route=${run.route} rag_calls=${run.rag_calls} ` +
          `embedding_calls=${run.embedding_calls} generation_calls=${run.generation_calls} ` +
          `http_status=${run.http_status} insufficient_evidence=${run.insufficient_evidence} ` +
          `citation_count=${run.citation_count} cleanup_success=${run.cleanup_success}`);
      }
      console.log("Validación funcional L1 completa; no se generaron resultados oficiales.");
      return;
    }
    const warmup = await runCase(base, { id: "warmup", question: cases[0].question },
      instrument);
    const warmRuns = [];
    for (const item of cases) {
      warmRuns.push(await runCase(base, item, instrument));
      console.log(`${item.id}: ${warmRuns.at(-1).wall_ms.toFixed(2)} ms`);
    }
    const generatedAt = new Date();
    const report = { schema_version: "1", benchmark_id: "banuchat-rag-latency-l1",
      metadata: { ...state, ...environment, generated_at: generatedAt.toISOString(),
        runner_sha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        l1_cases_sha256: sha256(caseBytes), measured_run_count: 10,
        warmup_excluded: true, profile_key: PROFILE_KEY },
      warmup, warm_runs: warmRuns, warm_aggregates: aggregate(warmRuns),
      timing_method: { p95: "nearest_rank_ceil_0.95_n", other_orchestration:
        "wall_ms minus the seven sequential measured stages; Ollama total is nested in generation" } };
    await mkdir(RESULTS, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    await writeFile(mdPath, markdown(report), { flag: "wx" });
    console.log(`L1 completo: ${jsonPath}\nReporte: ${mdPath}`);
  } finally {
    await closeServer(server);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`L1 abortado: ${error instanceof SafeRunnerError
    ? error.message : "error no clasificado de preflight o dependencia"}`);
  process.exitCode = 1;
});
