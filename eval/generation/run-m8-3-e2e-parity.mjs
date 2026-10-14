import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const API_DIR = join(ROOT, "backend", "api");
const CASES_PATH = join(HERE, "m8-3-paraphrase-diagnostic-cases.json");
const BASELINE_PATH = join(
  HERE,
  "results",
  "m8-3-paraphrase-diagnostic-2026-10-13.json",
);
const CATALOG_PATH = join(API_DIR, "intent-routing.catalog.json");
const DIST_PATH = join(API_DIR, "dist", "index.js");
const RESULTS_DIR = join(HERE, "results");
const EXPECTED_FIXTURE_SHA256 =
  "8121279aa2968ee6f2c76b06d0142193fb15d9792e4ec7fff8a478f29a5c765e";
const PROFILE_KEY = "profile-001";
const TOP_K = 5;
const REPETITIONS = 3;
const REQUEST_TIMEOUT_MS = 180_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^[0-9a-f]{64}$/iu;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/iu;
const ALLOWED_CHANGED_PATHS = new Set([
  "eval/generation/README.md",
  "eval/generation/run-m8-3-e2e-parity.mjs",
]);
const QUESTIONS = Object.freeze({
  "M8.3-A1": "¿Qué información debo incluir al reportar una incidencia?",
  "M8.3-A2":
    "¿Qué información debería incluir al reportar una incidencia de la práctica?",
});
const RELEVANT_SIGNALS = Object.freeze([
  "qué se intentaba hacer",
  "qué ocurrió",
  "qué se esperaba",
]);

class SafeRunnerError extends Error {}

function assert(condition, message) {
  if (!condition) throw new SafeRunnerError(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value) {
  return typeof value === "string" && /\S/u.test(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonical(value[key])]),
  );
}

function equalJson(first, second) {
  return JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trimEnd();
}

function gitState() {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  const revision = git("rev-parse", "HEAD");
  const originRevision = git("rev-parse", "origin/main");
  const status = git("status", "--porcelain=v1");
  const changedPaths = status.length === 0
    ? []
    : status.split(/\r?\n/u).map((line) => line.slice(3).replace(/\\/gu, "/"));
  assert(branch === "main", "M8.3-B exige la rama main.");
  assert(revision === originRevision, "HEAD no coincide con origin/main.");
  assert(
    changedPaths.every((path) => ALLOWED_CHANGED_PATHS.has(path)),
    "Hay cambios Git fuera de los archivos autorizados para M8.3-B.",
  );
  return {
    implementation_revision: revision,
    origin_main_revision: originRevision,
    implementation_changed_paths: changedPaths,
  };
}

function bogotaDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validateCases(value) {
  assert(
    isRecord(value) &&
      value.schema_version === "1" &&
      value.diagnostic_id === "banuchat-m8-3-paraphrase-sensitivity" &&
      value.expected_relevant_document === "doc-008" &&
      Array.isArray(value.cases) &&
      value.cases.length === 2,
    "Fixture M8.3-A inválido.",
  );
  return value.cases.map((item, index) => {
    const id = index === 0 ? "M8.3-A1" : "M8.3-A2";
    assert(
      isRecord(item) &&
        Object.keys(item).sort().join(",") === "id,question" &&
        item.id === id &&
        item.question === QUESTIONS[id],
      `Caso congelado inválido: ${id}.`,
    );
    return { id, question: item.question };
  });
}

function validateBaseline(value) {
  assert(
    isRecord(value) &&
      value.schema_version === "1" &&
      value.diagnostic_id === "banuchat-m8-3-paraphrase-sensitivity" &&
      isRecord(value.metadata) &&
      value.metadata.fixture_sha256 === EXPECTED_FIXTURE_SHA256 &&
      GIT_COMMIT_PATTERN.test(value.metadata.implementation_revision ?? "") &&
      isRecord(value.preflight) &&
      UUID_PATTERN.test(value.preflight.release_id ?? "") &&
      UUID_PATTERN.test(value.preflight.embedding_config_id ?? "") &&
      isRecord(value.preflight.embedding) &&
      isRecord(value.preflight.generator) &&
      value.preflight.top_k === TOP_K,
    "Baseline M8.3-A inválido.",
  );
  for (const id of Object.keys(QUESTIONS)) {
    const runs = value.cases?.[id]?.runs;
    assert(
      value.cases?.[id]?.question === QUESTIONS[id] &&
        Array.isArray(runs) &&
        runs.length === REPETITIONS &&
        runs.every(
          (run, index) =>
            run?.repetition === index + 1 &&
            run?.document_rag?.insufficient_evidence === false,
        ),
      `Baseline M8.3-A incompleto para ${id}.`,
    );
  }
  return value;
}

function catalogMetadata(catalog) {
  assert(
    isRecord(catalog) && Array.isArray(catalog.intents),
    "Catálogo del Intent Router inválido.",
  );
  return new Map(
    catalog.intents.map((intent) => [
      intent.id,
      {
        route_type: intent.route_type,
        requires_profile: intent.requires_profile,
      },
    ]),
  );
}

function decisionSnapshot(decision, routeMetadata) {
  assert(
    isRecord(decision) &&
      nonempty(decision.route) &&
      isRecord(decision.parameters) &&
      (decision.response_variant === null || nonempty(decision.response_variant)),
    "Decisión del Intent Router inválida.",
  );
  const metadata = routeMetadata.get(decision.route);
  return {
    route: decision.route,
    route_type: metadata?.route_type ?? null,
    requires_profile: metadata?.requires_profile ?? null,
    response_variant: decision.response_variant,
    parameters: canonical(decision.parameters),
  };
}

async function validateStaticInputs() {
  const [fixtureBytes, baselineBytes, catalogBytes] = await Promise.all([
    readFile(CASES_PATH),
    readFile(BASELINE_PATH),
    readFile(CATALOG_PATH),
  ]);
  assert(
    sha256(fixtureBytes) === EXPECTED_FIXTURE_SHA256,
    "El SHA-256 del fixture M8.3-A cambió.",
  );
  await access(DIST_PATH);
  const cases = validateCases(JSON.parse(fixtureBytes.toString("utf8")));
  const baseline = validateBaseline(JSON.parse(baselineBytes.toString("utf8")));
  const routeMetadata = catalogMetadata(JSON.parse(catalogBytes.toString("utf8")));
  const backend = await import(new URL("../../backend/api/dist/index.js", import.meta.url));
  for (const name of [
    "createRuntimeApiServer",
    "generateDocumentRagAnswer",
    "loadDefaultIntentRouter",
    "loadRuntimeConfig",
    "loadGeneratorRuntimeConfig",
    "PgSqlClient",
    "OllamaQueryEmbeddingClient",
    "OllamaGeneratorClient",
  ]) {
    assert(typeof backend[name] === "function", `Falta export productivo: ${name}.`);
  }
  const router = await backend.loadDefaultIntentRouter();
  assert(router.catalog_valid === true, "El catálogo del Intent Router no es válido.");
  const routePreflight = Object.fromEntries(
    cases.map((item) => [
      item.id,
      decisionSnapshot(
        router.route({
          content: item.question,
          context: { profile_selected: true, now: "2026-10-13T12:00:00.000Z" },
        }),
        routeMetadata,
      ),
    ]),
  );
  return {
    backend,
    router,
    routeMetadata,
    cases,
    baseline,
    fixtureBytes,
    baselineBytes,
    routePreflight,
  };
}

function normalizedDigest(value) {
  return typeof value === "string" && /^(?:sha256:)?[0-9a-f]{64}$/iu.test(value)
    ? value.replace(/^sha256:/iu, "").toLowerCase()
    : null;
}

async function request(
  base,
  path,
  { method = "GET", body, timeout = REQUEST_TIMEOUT_MS } = {},
) {
  try {
    return await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    throw new SafeRunnerError(`${method} ${path} falló (${error?.name ?? "red"}).`);
  }
}

async function expectedJson(response, status, label) {
  assert(response.status === status, `${label}: HTTP ${response.status}, esperado ${status}.`);
  try {
    return await response.json();
  } catch {
    throw new SafeRunnerError(`${label}: respuesta JSON inválida.`);
  }
}

async function ollamaJson(base, path, body) {
  return expectedJson(
    await request(base, path, {
      method: body === undefined ? "GET" : "POST",
      body,
      timeout: 15_000,
    }),
    200,
    `Ollama ${path}`,
  );
}

async function preflight(sql, generatorRuntime, baseline) {
  const result = await sql.query(
    `SELECT
      dr.id AS release_id,
      dr.embedding_config_id,
      ec.model AS embedding_model,
      ec.model_revision AS embedding_revision,
      ec.dimension AS embedding_dimension,
      ec.distance_metric AS embedding_distance,
      ec.parameters AS embedding_parameters
    FROM banuchat.datasets d
    JOIN banuchat.dataset_releases dr
      ON dr.id = d.current_release_id
     AND dr.dataset_id = d.id
     AND dr.status = 'ready'
    JOIN banuchat.embedding_configs ec ON ec.id = dr.embedding_config_id
    WHERE d.id = $1`,
    [1],
  );
  assert(result.rows.length === 1, "No hay una única release actual ready.");
  const row = result.rows[0];
  const pg = await sql.query(
    `SELECT current_setting('server_version') AS server_version,
      (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version`,
  );
  assert(
    pg.rows.length === 1 &&
      nonempty(pg.rows[0].server_version) &&
      nonempty(pg.rows[0].pgvector_version),
    "PostgreSQL/pgvector no disponible.",
  );

  const version = await ollamaJson(generatorRuntime.base_url, "/api/version");
  const tags = await ollamaJson(generatorRuntime.base_url, "/api/tags");
  assert(nonempty(version.version) && Array.isArray(tags.models), "Runtime Ollama inválido.");
  const findModel = (name) =>
    tags.models.find((item) => item?.name === name || item?.model === name);
  const embeddingDigest = normalizedDigest(findModel(row.embedding_model)?.digest);
  const generatorDigest = normalizedDigest(
    findModel(generatorRuntime.generator.model)?.digest,
  );
  const embeddingShow = await ollamaJson(generatorRuntime.base_url, "/api/show", {
    model: row.embedding_model,
  });
  const generatorShow = await ollamaJson(generatorRuntime.base_url, "/api/show", {
    model: generatorRuntime.generator.model,
  });
  assert(
    embeddingShow?.capabilities?.includes("embedding") &&
      generatorShow?.capabilities?.includes("completion"),
    "Capabilities de Ollama inválidas.",
  );

  const observed = {
    release_id: row.release_id,
    embedding_config_id: row.embedding_config_id,
    postgres_server_version: pg.rows[0].server_version,
    pgvector_version: pg.rows[0].pgvector_version,
    embedding: {
      model: row.embedding_model,
      model_revision: embeddingDigest,
      runtime_version: version.version,
      dimension: row.embedding_dimension,
      distance_metric: row.embedding_distance,
      query_recipe: row.embedding_parameters?.query,
    },
    generator: {
      model: generatorRuntime.generator.model,
      model_revision: generatorDigest,
      runtime_version: version.version,
      recipe: generatorRuntime.generator.recipe,
    },
    top_k: TOP_K,
  };
  const expected = {
    release_id: baseline.preflight.release_id,
    embedding_config_id: baseline.preflight.embedding_config_id,
    embedding: {
      model: baseline.preflight.embedding.model,
      model_revision: baseline.preflight.embedding.model_revision,
      runtime_version: baseline.preflight.embedding.runtime_version,
      dimension: baseline.preflight.embedding.dimension,
      distance_metric: baseline.preflight.embedding.distance_metric,
      query_recipe: baseline.preflight.embedding.query_recipe,
    },
    generator: baseline.preflight.generator,
    top_k: baseline.preflight.top_k,
  };
  assert(
    equalJson(
      {
        release_id: observed.release_id,
        embedding_config_id: observed.embedding_config_id,
        embedding: observed.embedding,
        generator: observed.generator,
        top_k: observed.top_k,
      },
      expected,
    ),
    "El entorno formal no es comparable con el baseline M8.3-A.",
  );
  return observed;
}

function safeDependencyReason(error, backend) {
  if (error instanceof backend.QueryEmbeddingClientError) return error.reason;
  if (error instanceof backend.GeneratorClientError) return error.reason;
  if (error instanceof backend.DatabaseDependencyError) return "database_unavailable";
  return "unknown";
}

function containsMarker(content) {
  return /(?:^|[^\p{L}\p{N}_])EVIDENCIA_INSUFICIENTE(?:$|[^\p{L}\p{N}_])/u.test(
    content,
  );
}

function relevantContent(content) {
  const normalized = content.toLocaleLowerCase("es");
  return RELEVANT_SIGNALS.every((signal) => normalized.includes(signal));
}

function retrievalSnapshot(rows) {
  assert(Array.isArray(rows) && rows.length === TOP_K, "Retrieval no devolvió top-5.");
  return rows.map((row, index) => ({
    rank: index + 1,
    document_key: row.document_key,
    document_version_id: row.document_version_id,
    chunk_id: row.chunk_id,
    ordinal: row.ordinal,
    locator: row.chunk_locator,
    cosine_distance: row.cosine_distance,
    cosine_similarity: 1 - row.cosine_distance,
    relevant_doc_008_chunk:
      row.document_key === "doc-008" && relevantContent(row.content),
  }));
}

function citationSnapshot(citations) {
  assert(Array.isArray(citations), "Citas inválidas.");
  return {
    count: citations.length,
    document_version_ids: citations.map((item) => item.document_version_id),
    locators: citations.map((item) => item.locator),
    artifact_urls: citations.map((item) => item.artifact_url),
  };
}

function ragSnapshot(input, output) {
  return {
    input: {
      release_id: input.release_id,
      query_sha256: sha256(input.query),
      query: input.query,
    },
    output: {
      release_id: output.release_id,
      insufficient_evidence: output.insufficient_evidence,
      content_sha256: sha256(output.content),
      content: output.content,
      citation_count: output.citations.length,
      document_version_ids: output.citations.map((item) => item.document_version_id),
      chunk_ids: output.citation_records.map((item) => item.chunk_id),
      locators: output.citations.map((item) => item.locator),
      artifact_urls: output.citations.map((item) => item.artifact_url),
    },
  };
}

function newObservation() {
  return {
    route_decisions: [],
    rag_calls: [],
    rag_call_count: 0,
    embedding_call_count: 0,
    generator_calls: [],
    generator_call_count: 0,
    retrieval: null,
    dependency_error: null,
  };
}

function buildInstrumentation({ backend, realSql, router, routeMetadata, environment, generatorRuntime }) {
  let active = null;
  const embedding = new backend.OllamaQueryEmbeddingClient(generatorRuntime.base_url);
  const generator = new backend.OllamaGeneratorClient(generatorRuntime.base_url);
  const sql = {
    async query(text, values) {
      const result = await realSql.query(text, values);
      if (active && /FROM banuchat\.document_chunks dc/iu.test(text)) {
        active.retrieval = retrievalSnapshot(result.rows);
      }
      return result;
    },
  };
  const measuredEmbedding = {
    async embedQuery(text, config) {
      assert(active !== null, "Embedding fuera de una repetición activa.");
      active.embedding_call_count += 1;
      try {
        return await embedding.embedQuery(text, config);
      } catch (error) {
        active.dependency_error = safeDependencyReason(error, backend);
        throw error;
      }
    },
  };
  const measuredGenerator = {
    async generate(input, config) {
      assert(active !== null, "Generación fuera de una repetición activa.");
      active.generator_call_count += 1;
      try {
        const result = await generator.generate(input, config);
        active.generator_calls.push({
          generated_content: result.content,
          generated_content_sha256: sha256(result.content),
          contains_insufficient_evidence: containsMarker(result.content),
          done_reason: result.done_reason,
          prompt_eval_count: result.prompt_eval_count,
          eval_count: result.eval_count,
          total_duration_ms: result.total_duration_ms,
        });
        return result;
      } catch (error) {
        active.dependency_error = safeDependencyReason(error, backend);
        throw error;
      }
    },
  };
  const documentRag = async (input) => {
    assert(active !== null, "Document RAG fuera de una repetición activa.");
    active.rag_call_count += 1;
    assert(
      input.release_id === environment.release_id,
      "Document RAG recibió una release inesperada.",
    );
    const output = await backend.generateDocumentRagAnswer(
      {
        sql,
        query_embedding_client: measuredEmbedding,
        generator_client: measuredGenerator,
        generator_config: generatorRuntime.generator,
      },
      input,
    );
    active.rag_calls.push(ragSnapshot(input, output));
    return output;
  };
  const measuredRouter = {
    catalog_valid: router.catalog_valid,
    catalog_version: router.catalog_version,
    route(input) {
      const decision = router.route(input);
      if (active) active.route_decisions.push(decisionSnapshot(decision, routeMetadata));
      return decision;
    },
  };
  return {
    sql,
    documentRag,
    measuredRouter,
    begin() {
      assert(active === null, "Repeticiones solapadas.");
      active = newObservation();
      return active;
    },
    end() {
      active = null;
    },
  };
}

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolvePromise();
    });
  });
  const address = server.address();
  assert(
    address && typeof address === "object" && address.address === "127.0.0.1",
    "El servidor runtime no abrió en loopback.",
  );
  return `http://127.0.0.1:${address.port}/api/v1`;
}

async function closeServer(server) {
  if (server?.listening) {
    await new Promise((resolvePromise, reject) =>
      server.close((error) => (error ? reject(error) : resolvePromise())),
    );
  }
}

async function createConversation(base) {
  const created = await expectedJson(
    await request(base, "/conversations", {
      method: "POST",
      body: { profile_key: PROFILE_KEY },
    }),
    201,
    "Crear conversación",
  );
  assert(
    UUID_PATTERN.test(created?.conversation_id ?? "") &&
      created.profile_key === PROFILE_KEY,
    "Conversación sintética inválida.",
  );
  return created.conversation_id;
}

async function cleanup(base, conversationId) {
  const path = `/conversations/${encodeURIComponent(conversationId)}`;
  const deleted = await request(base, path, { method: "DELETE", timeout: 15_000 });
  assert(deleted.status === 204, `Cleanup DELETE devolvió HTTP ${deleted.status}.`);
  const after = await request(base, path, { timeout: 15_000 });
  assert(after.status === 404, `Cleanup GET devolvió HTTP ${after.status}.`);
  return { delete_status: 204, confirmation_get_status: 404, confirmed: true };
}

function messageSnapshot(message) {
  assert(
    isRecord(message) &&
      UUID_PATTERN.test(message.message_id ?? "") &&
      message.role === "assistant" &&
      nonempty(message.content) &&
      typeof message.insufficient_evidence === "boolean",
    "Mensaje assistant inválido.",
  );
  return {
    message_id: message.message_id,
    insufficient_evidence: message.insufficient_evidence,
    content: message.content,
    content_sha256: sha256(message.content),
    citations: citationSnapshot(message.citations),
  };
}

function compareRagHttp(rag, http) {
  if (rag === null) {
    return {
      applicable: false,
      insufficient_flag_equal: false,
      content_exact_equal: false,
      content_sha_equal: false,
      citation_count_equal: false,
      document_ids_equal: false,
      locators_equal: false,
      all_equal: false,
    };
  }
  const output = rag.output;
  const comparison = {
    applicable: true,
    insufficient_flag_equal:
      output.insufficient_evidence === http.insufficient_evidence,
    content_exact_equal: output.content === http.content,
    content_sha_equal: output.content_sha256 === http.content_sha256,
    citation_count_equal: output.citation_count === http.citations.count,
    document_ids_equal: equalJson(
      output.document_version_ids,
      http.citations.document_version_ids,
    ),
    locators_equal: equalJson(output.locators, http.citations.locators),
  };
  return { ...comparison, all_equal: Object.values(comparison).every(Boolean) };
}

function compareHttpGet(http, persisted) {
  const comparison = {
    content_exact_equal: http.content === persisted.content,
    content_sha_equal: http.content_sha256 === persisted.content_sha256,
    insufficient_flag_equal:
      http.insufficient_evidence === persisted.insufficient_evidence,
    citation_count_equal: http.citations.count === persisted.citations.count,
    document_ids_equal: equalJson(
      http.citations.document_version_ids,
      persisted.citations.document_version_ids,
    ),
    locators_equal: equalJson(http.citations.locators, persisted.citations.locators),
    artifact_urls_equal: equalJson(
      http.citations.artifact_urls,
      persisted.citations.artifact_urls,
    ),
  };
  return { ...comparison, all_equal: Object.values(comparison).every(Boolean) };
}

async function safeHttpError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // El status sigue siendo evidencia suficiente para un aborto seguro.
  }
  return {
    status: response.status,
    code: typeof body?.error?.code === "string" ? body.error.code : null,
  };
}

async function runCase(base, item, repetition, instrumentation) {
  const conversationId = await createConversation(base);
  const observation = instrumentation.begin();
  let cleanupResult = null;
  let failure = null;
  let run = null;
  try {
    const response = await request(
      base,
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: "POST", body: { content: item.question } },
    );
    if (response.status !== 201) {
      const error = await safeHttpError(response);
      throw new SafeRunnerError(
        `${item.id} repetición ${repetition}: POST HTTP ${error.status}, code=${error.code ?? "unknown"}.`,
      );
    }
    const post = await expectedJson(response, 201, "POST /messages");
    assert(
      post.conversation_id === conversationId &&
        post.user_message?.content === item.question,
      "POST /messages no corresponde a la conversación o pregunta.",
    );
    const httpAssistant = messageSnapshot(post.assistant_message);

    const detail = await expectedJson(
      await request(base, `/conversations/${encodeURIComponent(conversationId)}`),
      200,
      "GET conversation",
    );
    assert(
      detail.conversation_id === conversationId && Array.isArray(detail.messages),
      "GET conversation inválido.",
    );
    const persistedMatches = detail.messages.filter(
      (message) => message?.message_id === httpAssistant.message_id,
    );
    assert(
      persistedMatches.length === 1,
      "GET conversation no reconstruyó exactamente el assistant recién creado.",
    );
    const persistedAssistant = messageSnapshot(persistedMatches[0]);
    const internalRag = observation.rag_calls.length === 1
      ? observation.rag_calls[0]
      : null;
    const route = observation.route_decisions[0] ?? null;
    assert(observation.route_decisions.length === 1, "Conteo de decisiones router inválido.");
    assert(
      observation.rag_calls.length <= 1 &&
        observation.rag_call_count <= 1 &&
        observation.embedding_call_count <= 1 &&
        observation.generator_calls.length <= 1 &&
        observation.generator_call_count <= 1,
      "Una capa del pipeline fue llamada más de una vez.",
    );
    const retrieval = observation.retrieval ?? [];
    run = {
      case_id: item.id,
      repetition,
      question: item.question,
      route,
      rag_call_count: observation.rag_call_count,
      embedding_call_count: observation.embedding_call_count,
      generator_call_count: observation.generator_call_count,
      retrieval,
      doc_008_ranks: retrieval
        .filter((chunk) => chunk.document_key === "doc-008")
        .map((chunk) => chunk.rank),
      relevant_doc_008_rank:
        retrieval.find((chunk) => chunk.relevant_doc_008_chunk)?.rank ?? null,
      generator: observation.generator_calls[0] ?? null,
      internal_rag: internalRag,
      http: { status: 201, assistant_message: httpAssistant },
      get: { status: 200, assistant_message: persistedAssistant },
      parity: {
        rag_to_http: compareRagHttp(internalRag, httpAssistant),
        http_to_get: compareHttpGet(httpAssistant, persistedAssistant),
      },
      cleanup: null,
    };
  } catch (error) {
    failure = error;
  } finally {
    instrumentation.end();
  }

  try {
    cleanupResult = await cleanup(base, conversationId);
  } catch (error) {
    if (failure === null) failure = error;
  }
  if (failure !== null || cleanupResult === null) {
    throw new SafeRunnerError(
      [
        `${item.id} repetición ${repetition} abortada.`,
        `dependency_error=${observation.dependency_error ?? "unknown"}`,
        `route=${observation.route_decisions[0]?.route ?? "unknown"}`,
        `rag_calls=${observation.rag_call_count}`,
        `embedding_calls=${observation.embedding_call_count}`,
        `generator_calls=${observation.generator_call_count}`,
        `cleanup_confirmed=${cleanupResult?.confirmed ?? false}`,
        `reason=${failure instanceof SafeRunnerError ? failure.message : "dependency_or_invariant"}`,
      ].join("\n"),
    );
  }
  run.cleanup = cleanupResult;
  return run;
}

function classify(runs) {
  if (
    runs.some(
      (run) => run.route.route !== "agent_fallback" || run.rag_call_count !== 1,
    )
  ) {
    return "ROUTING_DIVERGENCE";
  }
  if (runs.some((run) => !run.parity.rag_to_http.all_equal)) {
    return "HTTP_DIVERGENCE";
  }
  if (runs.some((run) => !run.parity.http_to_get.all_equal)) {
    return "PERSISTENCE_DIVERGENCE";
  }
  if (runs.every((run) => run.cleanup.confirmed)) return "FULL_PARITY";
  return "INCONCLUSIVE";
}

function summarizeCase(runs, id) {
  const selected = runs.filter((run) => run.case_id === id);
  const summaryFor = (selector) => {
    const values = selected.map(selector);
    return {
      answered: values.filter((value) => value === false).length,
      insufficient: values.filter((value) => value === true).length,
      unavailable: values.filter((value) => value === null).length,
    };
  };
  return {
    internal_rag: summaryFor(
      (run) => run.internal_rag?.output.insufficient_evidence ?? null,
    ),
    http: summaryFor(
      (run) => run.http.assistant_message.insufficient_evidence,
    ),
    get: summaryFor((run) => run.get.assistant_message.insufficient_evidence),
    routes: [...new Set(selected.map((run) => run.route.route))],
    retrieval_stable:
      new Set(selected.map((run) => JSON.stringify(run.retrieval))).size === 1,
    generator_outputs_stable:
      new Set(
        selected.map((run) => run.generator?.generated_content_sha256 ?? null),
      ).size === 1,
  };
}

function tableText(value) {
  return String(value).replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

function markdown(report) {
  const rows = report.runs
    .map(
      (run) =>
        `| ${run.case_id} | ${run.repetition} | ${tableText(run.route.route)} | ` +
        `${run.internal_rag?.output.insufficient_evidence ?? "not_called"} | ` +
        `${run.http.assistant_message.insufficient_evidence} | ` +
        `${run.get.assistant_message.insufficient_evidence} | ` +
        `${run.parity.rag_to_http.all_equal} | ` +
        `${run.parity.http_to_get.all_equal} | ${run.cleanup.confirmed} |`,
    )
    .join("\n");
  const summary = (id) => {
    const item = report.summary[id];
    return `- **${id}:** RAG ${item.internal_rag.answered}/3 answered, ` +
      `HTTP ${item.http.answered}/3 answered, GET ${item.get.answered}/3 answered; ` +
      `routes=${item.routes.join(", ")}; retrieval_stable=${item.retrieval_stable}; ` +
      `generator_outputs_stable=${item.generator_outputs_stable}.`;
  };
  return `# M8.3-B — Paridad Document RAG → REST → persistencia

- Generado: ${report.metadata.generated_at}
- Revisión: \`${report.metadata.implementation_revision}\`
- Baseline M8.3-A: \`${report.metadata.baseline_implementation_revision}\`
- Release: \`${report.preflight.release_id}\`
- Clasificación: **${report.classification}**

| Case | Rep | Route | RAG insufficient | HTTP insufficient | GET insufficient | RAG↔HTTP | HTTP↔GET | cleanup |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Resumen

${summary("M8.3-A1")}
${summary("M8.3-A2")}

- RAG calls: ${report.runs.reduce((sum, run) => sum + run.rag_call_count, 0)}.
- Generator calls: ${report.runs.reduce((sum, run) => sum + run.generator_call_count, 0)}.
- Cleanup confirmado: ${report.runs.filter((run) => run.cleanup.confirmed).length}/6.
- Paridad de citas RAG↔HTTP: ${report.runs.filter((run) =>
    run.parity.rag_to_http.citation_count_equal &&
    run.parity.rag_to_http.document_ids_equal &&
    run.parity.rag_to_http.locators_equal).length}/6.
- Ranks relevantes de doc-008: ${report.runs.map((run) =>
    `${run.case_id}/${run.repetition}=${run.relevant_doc_008_rank ?? "none"}`).join(", ")}.

## Interpretación y límites

Este diagnóstico compara el Document RAG interno, el payload REST y la reconstrucción
persistida en seis conversaciones sintéticas temporales. Cada conversación fue eliminada
y confirmada ausente mediante GET 404. No es RAGAS, no demuestra calidad global ni
estabilidad general del RAG y no modifica producción.
`;
}

async function assertAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new SafeRunnerError("Ya existe un resultado M8.3-B para la fecha local.");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.length === 1 && args[0] === "--dry-run";
  assert(
    args.length === 0 || dryRun,
    "Uso: node eval/generation/run-m8-3-e2e-parity.mjs [--dry-run]",
  );
  const state = gitState();
  const inputs = await validateStaticInputs();
  if (dryRun) {
    console.log(
      `M8.3-B dry-run: fixture_sha256=${EXPECTED_FIXTURE_SHA256}; ` +
        `routes=${Object.entries(inputs.routePreflight)
          .map(([id, decision]) => `${id}:${decision.route}`)
          .join(",")}; baseline, dist e invariantes válidos; sin DB, Ollama, HTTP ni resultados.`,
    );
    return;
  }

  const date = bogotaDate(new Date());
  const jsonPath = join(RESULTS_DIR, `m8-3-e2e-parity-${date}.json`);
  const mdPath = join(RESULTS_DIR, `m8-3-e2e-parity-${date}.md`);
  await assertAbsent(jsonPath);
  await assertAbsent(mdPath);

  const runtimeConfig = inputs.backend.loadRuntimeConfig();
  const generatorRuntime = inputs.backend.loadGeneratorRuntimeConfig();
  const { Pool } = createRequire(join(API_DIR, "package.json"))("pg");
  const pool = new Pool({ ...runtimeConfig.postgres });
  let server;
  try {
    const realSql = new inputs.backend.PgSqlClient(pool);
    const environment = await preflight(realSql, generatorRuntime, inputs.baseline);
    const instrumentation = buildInstrumentation({
      backend: inputs.backend,
      realSql,
      router: inputs.router,
      routeMetadata: inputs.routeMetadata,
      environment,
      generatorRuntime,
    });
    server = await inputs.backend.createRuntimeApiServer(
      instrumentation.sql,
      instrumentation.documentRag,
      async () => instrumentation.measuredRouter,
    );
    const base = await listen(server);
    const runs = [];
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      for (const item of inputs.cases) {
        const run = await runCase(base, item, repetition, instrumentation);
        runs.push(run);
        console.log(
          `${item.id} repetición ${repetition}: route=${run.route.route}; ` +
            `RAG/HTTP/GET insufficient=${run.internal_rag?.output.insufficient_evidence ?? "not_called"}/` +
            `${run.http.assistant_message.insufficient_evidence}/` +
            `${run.get.assistant_message.insufficient_evidence}; cleanup=true`,
        );
      }
    }
    assert(runs.length === 6, "No se completaron las seis repeticiones.");
    assert(runs.every((run) => run.cleanup.confirmed), "No se confirmaron seis cleanups.");
    const report = {
      schema_version: "1",
      diagnostic_id: "banuchat-m8-3-e2e-parity",
      metadata: {
        ...state,
        generated_at: new Date().toISOString(),
        timezone: "America/Bogota",
        baseline_implementation_revision:
          inputs.baseline.metadata.implementation_revision,
        baseline_fixture_sha256: EXPECTED_FIXTURE_SHA256,
        baseline_result_sha256: sha256(inputs.baselineBytes),
        runner_sha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        execution_order: "A1,B1,A2,B2,A3,B3",
        repetitions_per_case: REPETITIONS,
        profile_key: PROFILE_KEY,
      },
      route_preflight: inputs.routePreflight,
      preflight: environment,
      runs,
      summary: {
        "M8.3-A1": summarizeCase(runs, "M8.3-A1"),
        "M8.3-A2": summarizeCase(runs, "M8.3-A2"),
      },
      classification: classify(runs),
      limitations: [
        "Dos preguntas con tres repeticiones no constituyen una muestra estadística.",
        "El diagnóstico no es RAGAS ni demuestra calidad global del RAG.",
        "La conclusión se limita a la revisión, release, modelos y recetas registrados.",
      ],
    };
    await mkdir(RESULTS_DIR, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    await writeFile(mdPath, markdown(report), { flag: "wx" });
    console.log(`M8.3-B completo: ${jsonPath}\nReporte: ${mdPath}`);
  } finally {
    await closeServer(server);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `M8.3-B abortado: ${
      error instanceof SafeRunnerError ? error.message : "error no clasificado"
    }`,
  );
  process.exitCode = 1;
});
