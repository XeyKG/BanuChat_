#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const API_DIR = join(ROOT, "backend/api");
const DIST_INDEX = join(API_DIR, "dist/index.js");
const CASES_PATH = join(HERE, "m8-3-paraphrase-diagnostic-cases.json");
const RESULTS_DIR = join(HERE, "results");
const DOCUMENT_RAG_SOURCE = join(
  ROOT,
  "backend/api/src/chat/document-rag.ts",
);
const DOC_008_PATH = join(
  ROOT,
  "data/synthetic/documents/artifacts/doc-008.md",
);
const TOP_K = 5;
const REPETITIONS = 3;
const EMBEDDING_MODEL = "qwen3-embedding:0.6b";
const GENERATOR_MODEL = "qwen3:4b-instruct";
const INSUFFICIENT_MARKER = "EVIDENCIA_INSUFICIENTE";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DIGEST_PATTERN = /^(?:sha256:)?[0-9a-f]{64}$/iu;
const ALLOWED_CHANGED_PATHS = new Set([
  "eval/generation/m8-3-paraphrase-diagnostic-cases.json",
  "eval/generation/run-m8-3-paraphrase-diagnostic.mjs",
  "eval/generation/README.md",
]);
const EXPECTED_CASES = [
  {
    id: "M8.3-A1",
    question: "¿Qué información debo incluir al reportar una incidencia?",
  },
  {
    id: "M8.3-A2",
    question:
      "¿Qué información debería incluir al reportar una incidencia de la práctica?",
  },
];
const REQUIRED_DOC_008_SIGNALS = [
  "qué se intentaba hacer",
  "qué ocurrió",
  "qué se esperaba",
  "no es necesario incluir información personal",
];

class SafeDiagnosticError extends Error {}

function assert(condition, message) {
  if (!condition) throw new SafeDiagnosticError(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedDigest(value) {
  return typeof value === "string" && DIGEST_PATTERN.test(value)
    ? value.replace(/^sha256:/iu, "").toLowerCase()
    : null;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function gitState() {
  const branch = git("branch", "--show-current");
  const revision = git("rev-parse", "HEAD");
  const originRevision = git("rev-parse", "origin/main");
  const changedPaths = [
    ...new Set(
      [
        ...git("diff", "--name-only", "HEAD").split(/\r?\n/u),
        ...git("ls-files", "--others", "--exclude-standard").split(/\r?\n/u),
      ].filter(Boolean),
    ),
  ].sort();

  assert(branch === "main", "El diagnóstico exige la rama main.");
  assert(
    revision === originRevision,
    "HEAD no coincide con origin/main; diagnóstico abortado.",
  );
  assert(
    changedPaths.every((path) => ALLOWED_CHANGED_PATHS.has(path)),
    "Hay cambios Git fuera de los archivos propios de M8.3-A.",
  );
  return {
    implementation_revision: revision,
    origin_main_revision: originRevision,
    implementation_changed_paths: changedPaths,
  };
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return (
    isPlainRecord(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}

function validateCases(value) {
  assert(
    exactKeys(value, [
      "schema_version",
      "diagnostic_id",
      "purpose",
      "expected_relevant_document",
      "cases",
    ]) &&
      value.schema_version === "1" &&
      value.diagnostic_id === "banuchat-m8-3-paraphrase-sensitivity" &&
      typeof value.purpose === "string" &&
      value.purpose.trim().length > 0 &&
      value.expected_relevant_document === "doc-008" &&
      Array.isArray(value.cases) &&
      value.cases.length === EXPECTED_CASES.length,
    "Fixture M8.3-A inválido.",
  );

  return value.cases.map((item, index) => {
    const expected = EXPECTED_CASES[index];
    assert(
      exactKeys(item, ["id", "question"]) &&
        item.id === expected.id &&
        item.question === expected.question,
      `Caso primario alterado: ${expected.id}.`,
    );
    return { id: item.id, question: item.question };
  });
}

function validateQueryRecipe(value) {
  return (
    exactKeys(value, [
      "dimensions",
      "input_prefix",
      "normalization",
      "options",
      "truncate",
    ]) &&
    value.dimensions === 1024 &&
    value.input_prefix === null &&
    value.normalization === "none" &&
    value.truncate === false &&
    exactKeys(value.options, ["num_ctx"]) &&
    Number.isSafeInteger(value.options.num_ctx) &&
    value.options.num_ctx > 0
  );
}

function validateGeneratorRecipe(value) {
  return (
    exactKeys(value, ["keep_alive", "options", "stream", "think"]) &&
    value.think === false &&
    value.stream === false &&
    value.keep_alive === "5m" &&
    exactKeys(value.options, ["temperature", "num_predict"]) &&
    value.options.temperature === 0 &&
    value.options.num_predict === 256
  );
}

function loopbackUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeDiagnosticError("URL de Ollama inválida.");
  }
  assert(
    url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      url.port.length > 0 &&
      url.pathname === "/" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0 &&
      url.hash.length === 0,
    "Ollama debe usar una URL HTTP loopback sin credenciales.",
  );
  return url;
}

async function ollamaJson(baseUrl, path, body) {
  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
    });
  } catch {
    throw new SafeDiagnosticError(`Ollama ${path} no disponible.`);
  }
  assert(response.ok, `Ollama ${path}: HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new SafeDiagnosticError(`Ollama ${path}: JSON inválido.`);
  }
}

function assertReadOnlySql(text) {
  assert(
    typeof text === "string" && /^\s*SELECT\b/iu.test(text),
    "El instrumento bloqueó una sentencia SQL que no es SELECT.",
  );
  assert(
    !/\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|CREATE|DROP)\b/iu.test(
      text,
    ),
    "El instrumento bloqueó una sentencia SQL de escritura.",
  );
}

function readOnlyClient(sql) {
  return {
    async query(text, values) {
      assertReadOnlySql(text);
      return sql.query(text, values);
    },
  };
}

async function preflight(sql, backend, generatorRuntime) {
  const result = await sql.query(
    `SELECT
      dr.id AS release_id,
      dr.embedding_config_id,
      ec.provider,
      ec.model,
      ec.model_revision,
      ec.dimension,
      ec.distance_metric,
      ec.parameters
    FROM banuchat.datasets d
    JOIN banuchat.dataset_releases dr
      ON dr.id = d.current_release_id
     AND dr.dataset_id = d.id
     AND dr.status = 'ready'
    JOIN banuchat.embedding_configs ec
      ON ec.id = dr.embedding_config_id
    WHERE d.id = $1`,
    [1],
  );
  assert(result.rows.length === 1, "No hay una única release actual ready.");
  const row = result.rows[0];
  assert(
    UUID_PATTERN.test(row.release_id ?? "") &&
      UUID_PATTERN.test(row.embedding_config_id ?? "") &&
      row.provider === "ollama" &&
      row.model === EMBEDDING_MODEL &&
      normalizedDigest(row.model_revision) !== null &&
      row.dimension === 1024 &&
      row.distance_metric === "cosine" &&
      isPlainRecord(row.parameters) &&
      typeof row.parameters.runtime_version === "string" &&
      validateQueryRecipe(row.parameters.query),
    "Configuración de embedding de la release inválida.",
  );
  assert(
    generatorRuntime.generator.model === GENERATOR_MODEL &&
      normalizedDigest(generatorRuntime.generator.model_revision) !== null &&
      validateGeneratorRecipe(generatorRuntime.generator.recipe),
    "Configuración productiva del generador inválida.",
  );

  const postgres = await sql.query(
    `SELECT
      current_setting('server_version') AS server_version,
      (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version`,
  );
  assert(
    postgres.rows.length === 1 &&
      typeof postgres.rows[0].server_version === "string" &&
      typeof postgres.rows[0].pgvector_version === "string",
    "PostgreSQL o pgvector no está disponible.",
  );

  const baseUrl = loopbackUrl(generatorRuntime.base_url);
  const version = await ollamaJson(baseUrl, "/api/version");
  const tags = await ollamaJson(baseUrl, "/api/tags");
  assert(
    typeof version.version === "string" && Array.isArray(tags.models),
    "Preflight de runtime Ollama inválido.",
  );
  const findModel = (name) =>
    tags.models.find((item) => item?.name === name || item?.model === name);
  const embeddingDigest = normalizedDigest(findModel(EMBEDDING_MODEL)?.digest);
  const generatorDigest = normalizedDigest(findModel(GENERATOR_MODEL)?.digest);
  assert(
    version.version === row.parameters.runtime_version &&
      version.version === generatorRuntime.generator.runtime_version &&
      embeddingDigest === normalizedDigest(row.model_revision) &&
      generatorDigest ===
        normalizedDigest(generatorRuntime.generator.model_revision),
    "Runtime o digest de Ollama no coincide con la configuración productiva.",
  );

  const embeddingShow = await ollamaJson(baseUrl, "/api/show", {
    model: EMBEDDING_MODEL,
  });
  const generatorShow = await ollamaJson(baseUrl, "/api/show", {
    model: GENERATOR_MODEL,
  });
  const architecture = embeddingShow?.model_info?.["general.architecture"];
  assert(
    Array.isArray(embeddingShow?.capabilities) &&
      embeddingShow.capabilities.includes("embedding") &&
      typeof architecture === "string" &&
      architecture.length > 0 &&
      embeddingShow.model_info[`${architecture}.embedding_length`] === 1024 &&
      Number.isSafeInteger(
        embeddingShow.model_info[`${architecture}.context_length`],
      ) &&
      embeddingShow.model_info[`${architecture}.context_length`] >=
        row.parameters.query.options.num_ctx &&
      Array.isArray(generatorShow?.capabilities) &&
      generatorShow.capabilities.includes("completion"),
    "Capabilities o dimensiones de los modelos Ollama inválidas.",
  );

  const embeddingConfig = {
    provider: "ollama",
    model: EMBEDDING_MODEL,
    model_revision: row.model_revision,
    dimension: 1024,
    distance_metric: "cosine",
    runtime_version: row.parameters.runtime_version,
    query: row.parameters.query,
  };

  return {
    release_id: row.release_id,
    embedding_config_id: row.embedding_config_id,
    postgres_server_version: postgres.rows[0].server_version,
    pgvector_version: postgres.rows[0].pgvector_version,
    embedding: {
      model: EMBEDDING_MODEL,
      model_revision: embeddingDigest,
      runtime_version: version.version,
      dimension: 1024,
      distance_metric: "cosine",
      query_recipe: row.parameters.query,
      native_context_length:
        embeddingShow.model_info[`${architecture}.context_length`],
    },
    generator: {
      model: GENERATOR_MODEL,
      model_revision: generatorDigest,
      runtime_version: version.version,
      recipe: generatorRuntime.generator.recipe,
    },
    effective_embedding_config: embeddingConfig,
    effective_generator_config: generatorRuntime.generator,
    top_k: TOP_K,
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJson(value[key])]),
  );
}

function sameJson(first, second) {
  return JSON.stringify(canonicalJson(first)) === JSON.stringify(canonicalJson(second));
}

function vectorMetrics(vector) {
  assert(
    Array.isArray(vector) &&
      vector.length === 1024 &&
      vector.every(
        (component) =>
          typeof component === "number" &&
          Number.isFinite(component) &&
          Number.isFinite(Math.fround(component)),
      ) &&
      vector.some((component) => component !== 0),
    "Vector de query inválido.",
  );
  return {
    dimension: vector.length,
    norm: Math.sqrt(
      vector.reduce((sum, component) => sum + component * component, 0),
    ),
  };
}

function containsRelevantIncidentEvidence(content) {
  const normalized = content.toLocaleLowerCase("es");
  return REQUIRED_DOC_008_SIGNALS.every((signal) =>
    normalized.includes(signal),
  );
}

function normalizeRetrievedRows(rows) {
  assert(
    Array.isArray(rows) && rows.length === TOP_K,
    "Retrieval productivo no devolvió exactamente top-5.",
  );
  const seen = new Set();
  return rows.map((row, index) => {
    assert(
      isPlainRecord(row) &&
        UUID_PATTERN.test(row.document_version_id ?? "") &&
        UUID_PATTERN.test(row.chunk_id ?? "") &&
        typeof row.document_key === "string" &&
        typeof row.title === "string" &&
        Number.isInteger(row.ordinal) &&
        row.ordinal >= 0 &&
        typeof row.chunk_locator === "string" &&
        typeof row.content === "string" &&
        row.content.trim().length > 0 &&
        typeof row.cosine_distance === "number" &&
        Number.isFinite(row.cosine_distance),
      `Fila de retrieval inválida en rank ${index + 1}.`,
    );
    assert(!seen.has(row.chunk_id), "Retrieval top-5 contiene chunks duplicados.");
    seen.add(row.chunk_id);
    return {
      rank: index + 1,
      document_key: row.document_key,
      document_version_id: row.document_version_id,
      chunk_id: row.chunk_id,
      ordinal: row.ordinal,
      title: row.title,
      locator: row.chunk_locator,
      cosine_distance: row.cosine_distance,
      cosine_similarity: 1 - row.cosine_distance,
      content: row.content,
      content_length: Array.from(row.content).length,
      contains_required_incident_evidence:
        row.document_key === "doc-008" &&
        containsRelevantIncidentEvidence(row.content),
    };
  });
}

function containsInsufficientMarker(content) {
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}_])${INSUFFICIENT_MARKER}(?:$|[^\\p{L}\\p{N}_])`,
    "u",
  ).test(content);
}

function expectedUserPrompt(chunks, query) {
  const evidence = chunks
    .map(
      (chunk, index) => `[${index + 1}]
Título: ${chunk.title}
Localizador: ${chunk.locator}
Contenido:
${chunk.content}`,
    )
    .join("\n\n");
  return `EVIDENCIA:

${evidence}

PREGUNTA:
${query}`;
}

async function runCase({
  backend,
  sql,
  embeddingClient,
  generatorClient,
  environment,
  item,
  repetition,
}) {
  const observation = {
    embedding_calls: 0,
    retrieval_calls: 0,
    generator_calls: 0,
    vector: null,
    retrieval: null,
    generator_input: null,
    generated: null,
  };
  const instrumentedSql = {
    async query(text, values) {
      assertReadOnlySql(text);
      const result = await sql.query(text, values);
      if (/FROM banuchat\.document_chunks dc/iu.test(text)) {
        observation.retrieval_calls += 1;
        assert(
          Array.isArray(values) &&
            values[0] === environment.release_id &&
            typeof values[1] === "string" &&
            values[2] === TOP_K,
          "El retrieval no utilizó release y top_k productivos.",
        );
        observation.retrieval = normalizeRetrievedRows(result.rows);
      }
      return result;
    },
  };
  const instrumentedEmbedding = {
    async embedQuery(text, config) {
      observation.embedding_calls += 1;
      assert(
        text === item.question &&
          sameJson(config, environment.effective_embedding_config),
        "La llamada de embedding no coincide con query/config productiva.",
      );
      const vector = await embeddingClient.embedQuery(text, config);
      vectorMetrics(vector);
      observation.vector = vector;
      return vector;
    },
  };
  const instrumentedGenerator = {
    async generate(input, config) {
      observation.generator_calls += 1;
      assert(
        sameJson(config, environment.effective_generator_config),
        "La llamada de generación no coincide con la configuración productiva.",
      );
      observation.generator_input = input;
      const result = await generatorClient.generate(input, config);
      observation.generated = result;
      return result;
    },
  };

  const answer = await backend.generateDocumentRagAnswer(
    {
      sql: instrumentedSql,
      query_embedding_client: instrumentedEmbedding,
      generator_client: instrumentedGenerator,
      generator_config: environment.effective_generator_config,
    },
    { release_id: environment.release_id, query: item.question },
  );

  assert(
    answer.release_id === environment.release_id &&
      observation.embedding_calls === 1 &&
      observation.retrieval_calls === 1 &&
      observation.generator_calls === 1 &&
      observation.vector !== null &&
      observation.retrieval !== null &&
      isPlainRecord(observation.generator_input) &&
      isPlainRecord(observation.generated),
    `${item.id} repetición ${repetition}: pipeline incompleto.`,
  );
  assert(
    observation.generator_input.user_prompt ===
      expectedUserPrompt(observation.retrieval, item.question),
    `${item.id} repetición ${repetition}: contexto distinto al retrieval observado.`,
  );
  const generatedHasMarker = containsInsufficientMarker(
    observation.generated.content,
  );
  assert(
    answer.insufficient_evidence === generatedHasMarker,
    `${item.id} repetición ${repetition}: decisión final distinta al marcador productivo.`,
  );

  return {
    internal_vector: observation.vector,
    report: {
      repetition,
      role: repetition === 1 ? "principal" : "stability_repeat",
      embedding: vectorMetrics(observation.vector),
      retrieval: observation.retrieval,
      context: {
        chunks: observation.retrieval.map((chunk) => ({
          rank: chunk.rank,
          title: chunk.title,
          locator: chunk.locator,
          content_length: chunk.content_length,
        })),
        total_evidence_length: observation.retrieval.reduce(
          (sum, chunk) => sum + chunk.content_length,
          0,
        ),
        system_prompt_sha256: sha256(
          observation.generator_input.system_prompt,
        ),
        user_prompt_sha256: sha256(observation.generator_input.user_prompt),
        user_prompt_length: Array.from(
          observation.generator_input.user_prompt,
        ).length,
      },
      generator: {
        generated_content: observation.generated.content,
        contains_insufficient_evidence_marker: generatedHasMarker,
        done_reason: observation.generated.done_reason,
        prompt_eval_count: observation.generated.prompt_eval_count,
        eval_count: observation.generated.eval_count,
        total_duration_ms: observation.generated.total_duration_ms,
      },
      document_rag: {
        insufficient_evidence: answer.insufficient_evidence,
        final_content: answer.content,
        citation_count: answer.citations.length,
      },
    },
  };
}

function cosineComparison(first, second) {
  assert(first.length === second.length, "Dimensiones de embeddings distintas.");
  let firstNormSquared = 0;
  let secondNormSquared = 0;
  let dot = 0;
  let maxAbsoluteDifference = 0;
  for (let index = 0; index < first.length; index += 1) {
    firstNormSquared += first[index] * first[index];
    secondNormSquared += second[index] * second[index];
    dot += first[index] * second[index];
    maxAbsoluteDifference = Math.max(
      maxAbsoluteDifference,
      Math.abs(first[index] - second[index]),
    );
  }
  assert(
    firstNormSquared > 0 && secondNormSquared > 0,
    "Norma de embedding inválida.",
  );
  return {
    vector_dimension: first.length,
    cosine_similarity:
      dot / (Math.sqrt(firstNormSquared) * Math.sqrt(secondNormSquared)),
    max_absolute_component_difference: maxAbsoluteDifference,
    norm_a: Math.sqrt(firstNormSquared),
    norm_b: Math.sqrt(secondNormSquared),
  };
}

function retrievalIdentity(item) {
  return item.chunk_id;
}

function retrievalComparison(first, second) {
  const firstIds = first.map(retrievalIdentity);
  const secondIds = second.map(retrievalIdentity);
  const secondSet = new Set(secondIds);
  const intersection = firstIds.filter((id) => secondSet.has(id)).length;
  const documentSummary = (items) => {
    const doc008 = items.filter((item) => item.document_key === "doc-008");
    const relevant = doc008.filter(
      (item) => item.contains_required_incident_evidence,
    );
    return {
      ranks: doc008.map((item) => item.rank),
      best_rank: doc008.length === 0 ? null : Math.min(...doc008.map((x) => x.rank)),
      best_similarity:
        doc008.length === 0
          ? null
          : Math.max(...doc008.map((x) => x.cosine_similarity)),
      relevant_chunk_ranks: relevant.map((item) => item.rank),
      best_relevant_rank:
        relevant.length === 0
          ? null
          : Math.min(...relevant.map((item) => item.rank)),
    };
  };
  return {
    top1_equal: firstIds[0] === secondIds[0],
    same_top5_set: intersection === TOP_K,
    same_top5_order: firstIds.every((id, index) => id === secondIds[index]),
    intersection_count: intersection,
    jaccard_top5: intersection / (TOP_K * 2 - intersection),
    doc_008_a: documentSummary(first),
    doc_008_b: documentSummary(second),
  };
}

function summarizeStability(caseRuns) {
  const firstOrder = caseRuns[0].retrieval.map(retrievalIdentity);
  const firstSet = [...firstOrder].sort().join(",");
  const firstSystemHash = caseRuns[0].context.system_prompt_sha256;
  return {
    insufficient_evidence_count: caseRuns.filter(
      (run) => run.document_rag.insufficient_evidence,
    ).length,
    answered_count: caseRuns.filter(
      (run) => !run.document_rag.insufficient_evidence,
    ).length,
    retrieval_same_order_all_runs: caseRuns.every((run) =>
      run.retrieval
        .map(retrievalIdentity)
        .every((id, index) => id === firstOrder[index]),
    ),
    retrieval_same_set_all_runs: caseRuns.every(
      (run) =>
        [...run.retrieval.map(retrievalIdentity)].sort().join(",") === firstSet,
    ),
    system_prompt_same_all_runs: caseRuns.every(
      (run) => run.context.system_prompt_sha256 === firstSystemHash,
    ),
    generated_content_same_all_runs: caseRuns.every(
      (run) =>
        run.generator.generated_content === caseRuns[0].generator.generated_content,
    ),
  };
}

function classifyCause(retrieval, stability) {
  const aStableFailure = stability["M8.3-A1"].insufficient_evidence_count === 3;
  const bStableAnswer = stability["M8.3-A2"].answered_count === 3;
  if (!aStableFailure || !bStableAnswer) {
    return {
      category: "INCONCLUSIVE",
      rationale:
        "El patrón observado no fue A insuficiente 3/3 y B respondida 3/3; no se fuerza atribución.",
    };
  }

  const aRelevant = retrieval.doc_008_a.best_relevant_rank !== null;
  const bRelevant = retrieval.doc_008_b.best_relevant_rank !== null;
  if (!aRelevant && bRelevant) {
    return {
      category: "RETRIEVAL_DOMINANT",
      rationale:
        "B recuperó el chunk de doc-008 con los campos necesarios y A no lo incluyó en top-5.",
    };
  }
  if (retrieval.same_top5_order && aRelevant && bRelevant) {
    return {
      category: "GENERATION_DOMINANT",
      rationale:
        "A y B entregaron el mismo top-5 en el mismo orden, incluida la evidencia relevante de doc-008, pero el generador decidió suficiencia de forma distinta.",
    };
  }
  return {
    category: "MIXED",
    rationale:
      "El retrieval/contexto cambió entre las paráfrasis y ambas decisiones del generador también divergieron; la evidencia no permite atribuirlo a una sola capa.",
  };
}

function bogotaDate(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function assertAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new SafeDiagnosticError(
    "Ya existe un resultado M8.3-A para la fecha local.",
  );
}

function tableValue(value) {
  return String(value).replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

function retrievalTable(items) {
  return `| Rank | Documento | Ordinal | Locator | Similitud | Evidencia requerida |
|---:|---|---:|---|---:|---|
${items
  .map(
    (item) =>
      `| ${item.rank} | ${tableValue(item.document_key)} | ${item.ordinal} | ${tableValue(item.locator)} | ${item.cosine_similarity} | ${item.contains_required_incident_evidence} |`,
  )
  .join("\n")}`;
}

function markdown(report) {
  const principalA = report.cases["M8.3-A1"].runs[0];
  const principalB = report.cases["M8.3-A2"].runs[0];
  const embedding = report.comparison.embedding;
  const retrieval = report.comparison.retrieval;
  const stabilityA = report.stability["M8.3-A1"];
  const stabilityB = report.stability["M8.3-A2"];
  const relevantChunks = [...principalA.retrieval, ...principalB.retrieval]
    .filter((item) => item.contains_required_incident_evidence)
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.chunk_id === item.chunk_id) ===
        index,
    );

  return `# M8.3-A — diagnóstico de sensibilidad por paráfrasis

Diagnóstico del Document RAG productivo con dos preguntas sintéticas. No es RAGAS, no cambia producción y sus dos casos no constituyen una muestra estadística.

## A. Configuración observada

- Revisión: \`${report.metadata.implementation_revision}\`.
- Release ready: \`${report.preflight.release_id}\`; embedding config: \`${report.preflight.embedding_config_id}\`.
- Embedding: \`${report.preflight.embedding.model}\`, digest \`${report.preflight.embedding.model_revision}\`, runtime \`${report.preflight.embedding.runtime_version}\`, dimensión 1024, coseno, query recipe \`${JSON.stringify(report.preflight.embedding.query_recipe)}\`.
- Generador: \`${report.preflight.generator.model}\`, digest \`${report.preflight.generator.model_revision}\`, runtime \`${report.preflight.generator.runtime_version}\`, receta \`${JSON.stringify(report.preflight.generator.recipe)}\`.
- Retrieval productivo: top_k=${report.preflight.top_k}.

## B. Comparación de embeddings

- Cosine similarity A↔B: ${embedding.cosine_similarity}.
- Máxima diferencia absoluta por componente: ${embedding.max_absolute_component_difference}.
- Dimensión: ${embedding.vector_dimension}; normas A/B: ${embedding.norm_a} / ${embedding.norm_b}.

## C. Comparación de retrieval

- Top-1 igual: ${retrieval.top1_equal}; mismo conjunto top-5: ${retrieval.same_top5_set}; mismo orden: ${retrieval.same_top5_order}.
- Intersección: ${retrieval.intersection_count}/5; Jaccard: ${retrieval.jaccard_top5}.
- Mejor rank relevante de doc-008 A/B: ${retrieval.doc_008_a.best_relevant_rank ?? "ausente"} / ${retrieval.doc_008_b.best_relevant_rank ?? "ausente"}.

### Top-5 A

${retrievalTable(principalA.retrieval)}

### Top-5 B

${retrievalTable(principalB.retrieval)}

### Contenido pertinente de doc-008 recuperado

${relevantChunks.length === 0 ? "No apareció en el top-5 ningún chunk que contuviera conjuntamente intento, resultado observado, resultado esperado y exclusión de datos privados." : relevantChunks.map((item) => `**Rank observado ${item.rank}; ${item.locator}**\n\n\`\`\`\`text\n${item.content}\n\`\`\`\``).join("\n\n")}

## D. Comparación de contextos

- A: evidencia total ${principalA.context.total_evidence_length} caracteres; system SHA-256 \`${principalA.context.system_prompt_sha256}\`; user prompt SHA-256 \`${principalA.context.user_prompt_sha256}\`.
- B: evidencia total ${principalB.context.total_evidence_length} caracteres; system SHA-256 \`${principalB.context.system_prompt_sha256}\`; user prompt SHA-256 \`${principalB.context.user_prompt_sha256}\`.
- El orden, títulos, locators y longitudes por chunk están en el JSON.

## E. Outputs del generador

${Object.entries(report.cases)
  .flatMap(([id, item]) =>
    item.runs.map(
      (run) => `### ${id}, repetición ${run.repetition}

- Marker: ${run.generator.contains_insufficient_evidence_marker}; done_reason: \`${run.generator.done_reason}\`; prompt_eval_count: ${run.generator.prompt_eval_count}; eval_count: ${run.generator.eval_count}; total_duration_ms: ${run.generator.total_duration_ms}.

\`\`\`\`text
${run.generator.generated_content}
\`\`\`\``,
    ),
  )
  .join("\n\n")}

## F. Estabilidad de tres corridas

- A: insuficiente ${stabilityA.insufficient_evidence_count}/3; respondida ${stabilityA.answered_count}/3; retrieval mismo orden=${stabilityA.retrieval_same_order_all_runs}; output idéntico=${stabilityA.generated_content_same_all_runs}.
- B: insuficiente ${stabilityB.insufficient_evidence_count}/3; respondida ${stabilityB.answered_count}/3; retrieval mismo orden=${stabilityB.retrieval_same_order_all_runs}; output idéntico=${stabilityB.generated_content_same_all_runs}.

## G. Clasificación de causa

**${report.cause_classification.category}** — ${report.cause_classification.rationale}

La categoría describe únicamente estas seis ejecuciones sobre la configuración registrada. No demuestra calidad global del RAG.
`;
}

async function validateStaticInputs() {
  await Promise.all([
    access(DIST_INDEX),
    access(DOCUMENT_RAG_SOURCE),
    access(DOC_008_PATH),
    access(CASES_PATH),
  ]);
  const [caseBytes, ragSource, doc008] = await Promise.all([
    readFile(CASES_PATH),
    readFile(DOCUMENT_RAG_SOURCE),
    readFile(DOC_008_PATH, "utf8"),
  ]);
  const cases = validateCases(JSON.parse(caseBytes.toString("utf8")));
  assert(
    /const DOCUMENT_RETRIEVAL_TOP_K = 5;/u.test(ragSource.toString("utf8")) &&
      ragSource.includes(INSUFFICIENT_MARKER) &&
      ragSource.includes("buildUserPrompt"),
    "El source productivo de Document RAG no coincide con las invariantes del diagnóstico.",
  );
  assert(
    REQUIRED_DOC_008_SIGNALS.every((signal) =>
      doc008.toLocaleLowerCase("es").includes(signal),
    ),
    "doc-008 no contiene la evidencia esperada para la auditoría.",
  );
  const backend = await import(new URL("../../backend/api/dist/index.js", import.meta.url));
  for (const exportName of [
    "generateDocumentRagAnswer",
    "loadRuntimeConfig",
    "loadGeneratorRuntimeConfig",
    "PgSqlClient",
    "OllamaQueryEmbeddingClient",
    "OllamaGeneratorClient",
  ]) {
    assert(
      typeof backend[exportName] === "function",
      `Falta export productivo en dist: ${exportName}.`,
    );
  }
  return { backend, cases, caseBytes, ragSource };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.length === 1 && args[0] === "--dry-run";
  assert(
    args.length === 0 || dryRun,
    "Uso: node eval/generation/run-m8-3-paraphrase-diagnostic.mjs [--dry-run]",
  );
  const state = gitState();
  const staticInputs = await validateStaticInputs();
  if (dryRun) {
    console.log(
      `M8.3-A dry-run: ${staticInputs.cases.map((item) => item.id).join(", ")}; ` +
        "fixture, preguntas, paths, dist, doc-008 y top_k válidos; sin PostgreSQL, Ollama ni resultados.",
    );
    return;
  }

  const date = bogotaDate(new Date());
  const jsonPath = join(
    RESULTS_DIR,
    `m8-3-paraphrase-diagnostic-${date}.json`,
  );
  const markdownPath = join(
    RESULTS_DIR,
    `m8-3-paraphrase-diagnostic-${date}.md`,
  );
  await assertAbsent(jsonPath);
  await assertAbsent(markdownPath);

  const backend = staticInputs.backend;
  const runtime = backend.loadRuntimeConfig();
  const generatorRuntime = backend.loadGeneratorRuntimeConfig();
  const { Pool } = createRequire(join(API_DIR, "package.json"))("pg");
  const pool = new Pool({ ...runtime.postgres });
  try {
    const realSql = new backend.PgSqlClient(pool);
    const sql = readOnlyClient(realSql);
    const environment = await preflight(sql, backend, generatorRuntime);
    const embeddingClient = new backend.OllamaQueryEmbeddingClient(
      generatorRuntime.base_url,
    );
    const generatorClient = new backend.OllamaGeneratorClient(
      generatorRuntime.base_url,
    );
    const runsByCase = Object.fromEntries(
      staticInputs.cases.map((item) => [item.id, []]),
    );
    const principalVectors = new Map();

    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      for (const item of staticInputs.cases) {
        const run = await runCase({
          backend,
          sql,
          embeddingClient,
          generatorClient,
          environment,
          item,
          repetition,
        });
        runsByCase[item.id].push(run.report);
        if (repetition === 1) principalVectors.set(item.id, run.internal_vector);
        console.log(
          `${item.id} repetición ${repetition}: ` +
            `insufficient_evidence=${run.report.document_rag.insufficient_evidence}; ` +
            `doc-008 ranks=${run.report.retrieval
              .filter((chunk) => chunk.document_key === "doc-008")
              .map((chunk) => chunk.rank)
              .join(",") || "none"}`,
        );
      }
    }

    const releaseCheck = await sql.query(
      `SELECT dr.id AS release_id, dr.embedding_config_id
      FROM banuchat.datasets d
      JOIN banuchat.dataset_releases dr
        ON dr.id = d.current_release_id
       AND dr.dataset_id = d.id
       AND dr.status = 'ready'
      WHERE d.id = $1`,
      [1],
    );
    assert(
      releaseCheck.rows.length === 1 &&
        releaseCheck.rows[0].release_id === environment.release_id &&
        releaseCheck.rows[0].embedding_config_id ===
          environment.embedding_config_id,
      "La release o embedding config cambió durante el diagnóstico.",
    );

    const principalA = runsByCase["M8.3-A1"][0];
    const principalB = runsByCase["M8.3-A2"][0];
    const retrieval = retrievalComparison(
      principalA.retrieval,
      principalB.retrieval,
    );
    const stability = {
      "M8.3-A1": summarizeStability(runsByCase["M8.3-A1"]),
      "M8.3-A2": summarizeStability(runsByCase["M8.3-A2"]),
    };
    const report = {
      schema_version: "1",
      diagnostic_id: "banuchat-m8-3-paraphrase-sensitivity",
      purpose:
        "Ubicar la divergencia entre dos paráfrasis en embedding, retrieval, contexto o decisión de suficiencia del generador.",
      metadata: {
        ...state,
        generated_at: new Date().toISOString(),
        timezone: "America/Bogota",
        fixture_sha256: sha256(staticInputs.caseBytes),
        runner_sha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        document_rag_source_sha256: sha256(staticInputs.ragSource),
        execution_order: "A1,B1,A2,B2,A3,B3",
        repetitions_per_case: REPETITIONS,
        writes_conversations_or_messages: false,
      },
      preflight: {
        release_id: environment.release_id,
        embedding_config_id: environment.embedding_config_id,
        postgres_server_version: environment.postgres_server_version,
        pgvector_version: environment.pgvector_version,
        embedding: environment.embedding,
        generator: environment.generator,
        top_k: environment.top_k,
      },
      cases: Object.fromEntries(
        staticInputs.cases.map((item) => [
          item.id,
          { question: item.question, expected_relevant_document: "doc-008", runs: runsByCase[item.id] },
        ]),
      ),
      comparison: {
        embedding: cosineComparison(
          principalVectors.get("M8.3-A1"),
          principalVectors.get("M8.3-A2"),
        ),
        retrieval,
      },
      stability,
      cause_classification: classifyCause(retrieval, stability),
      limitations: [
        "Dos casos no constituyen una muestra estadística.",
        "El diagnóstico no es RAGAS ni demuestra calidad global del RAG.",
        "La clasificación se limita a la release, modelos, recetas y seis ejecuciones registradas.",
      ],
    };
    await mkdir(RESULTS_DIR, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, {
      flag: "wx",
    });
    await writeFile(markdownPath, markdown(report), { flag: "wx" });
    console.log(`M8.3-A completo: ${jsonPath}\nReporte: ${markdownPath}`);
  } finally {
    await pool.end();
  }
}

function safeFailureSummary(error) {
  if (error instanceof SafeDiagnosticError) return error.message;
  const name =
    error instanceof Error && typeof error.name === "string" ? error.name : "Error";
  const code =
    typeof error?.code === "string"
      ? error.code
      : typeof error?.cause?.code === "string"
        ? error.cause.code
        : null;
  const reason =
    typeof error?.reason === "string" && /^[a-z_]+$/u.test(error.reason)
      ? error.reason
      : null;
  if (reason !== null) return `${name} (${reason})`;
  return code === null
    ? `fallo de dependencia o archivo (${name})`
    : `fallo de dependencia o archivo (${name}, código ${code})`;
}

main().catch((error) => {
  console.error(
    `M8.3-A abortado: ${safeFailureSummary(error)}`,
  );
  process.exitCode = 1;
});
