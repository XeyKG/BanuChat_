#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const API_DIR = join(ROOT, "backend/api");
const CASES = join(HERE, "l1-rag-latency-cases.json");
const BASELINE = join(HERE, "results/l1-rag-latency-2026-10-03.json");
const RESULTS = join(HERE, "results");
const MODEL = "qwen3-embedding:0.6b";
const CONTEXTS = [32768, 4096];
const TOP_K = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DIGEST = /^(?:sha256:)?[0-9a-f]{64}$/iu;
const ALLOWED = new Set([
  "eval/generation/compare-query-context-retrieval.mjs",
  "eval/generation/README.md",
]);

class SafeError extends Error {}
function assert(ok, message) { if (!ok) throw new SafeError(message); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function digest(value) {
  return typeof value === "string" && DIGEST.test(value)
    ? value.replace(/^sha256:/iu, "").toLowerCase() : null;
}
function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"] }).trim();
}
function gitState() {
  const paths = [...new Set([
    ...git("diff", "--name-only", "HEAD").split(/\r?\n/u),
    ...git("ls-files", "--others", "--exclude-standard").split(/\r?\n/u),
  ].filter(Boolean))];
  assert(paths.every((path) => ALLOWED.has(path)), "Cambios Git fuera del alcance OPT-1C.");
  return { implementation_revision: git("rev-parse", "HEAD"),
    implementation_changed_paths: paths };
}
function validateCases(value) {
  assert(value?.schema_version === "1" &&
    value.workload_id === "banuchat-rag-latency-l1" &&
    Array.isArray(value.cases) && value.cases.length === 10,
  "Workload L1 inválido.");
  return value.cases.map((item, index) => {
    const id = `L1-${String(index + 1).padStart(2, "0")}`;
    assert(item?.id === id && typeof item.question === "string" &&
      item.question.trim().length > 0 && [...item.question].length <= 4000 &&
      typeof item.rationale === "string" && item.rationale.trim().length > 0 &&
      Object.keys(item).sort().join(",") === "id,question,rationale",
    `Caso inválido: ${id}.`);
    return { id, question: item.question };
  });
}
function validateBaseline(value, caseHash) {
  const meta = value?.metadata;
  assert(value?.benchmark_id === "banuchat-rag-latency-l1" &&
    meta?.l1_cases_sha256 === caseHash && UUID.test(meta.release_id ?? "") &&
    meta.embedding_model === MODEL && digest(meta.embedding_model_revision) &&
    meta.embedding_dimension === 1024 && meta.embedding_distance_metric === "cosine" &&
    meta.embedding_parameters?.document?.options?.num_ctx === 32768 &&
    meta.embedding_parameters?.query?.options?.num_ctx === 32768,
  "Baseline L1 incompatible con OPT-1C.");
  return meta;
}
function loopback(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new SafeError("URL Ollama inválida."); }
  assert(url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    url.port.length > 0 && url.pathname === "/" && !url.username &&
    !url.password && !url.search && !url.hash, "Ollama debe usar loopback HTTP.");
  return url;
}
async function ollama(base, path, body) {
  let response;
  try {
    response = await fetch(new URL(path, base), { method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), redirect: "error",
      signal: AbortSignal.timeout(180_000) });
  } catch { throw new SafeError(`Ollama ${path} no disponible.`); }
  assert(response.ok, `Ollama ${path}: HTTP ${response.status}.`);
  try { return await response.json(); }
  catch { throw new SafeError(`Ollama ${path}: JSON inválido.`); }
}
function recipe(value, context) {
  return value && Object.keys(value).sort().join(",") ===
    "dimensions,input_prefix,normalization,options,truncate" &&
    value.dimensions === 1024 && value.input_prefix === null &&
    value.normalization === "none" && value.truncate === false &&
    value.options && Object.keys(value.options).join(",") === "num_ctx" &&
    value.options.num_ctx === context;
}
async function preflight(sql, base, baseline) {
  const result = await sql.query(`SELECT dr.id AS release_id, ec.provider, ec.model,
    ec.model_revision, ec.dimension, ec.distance_metric, ec.parameters
    FROM banuchat.datasets d
    JOIN banuchat.dataset_releases dr ON dr.id = d.current_release_id
      AND dr.dataset_id = d.id AND dr.status = 'ready'
    JOIN banuchat.embedding_configs ec ON ec.id = dr.embedding_config_id
    WHERE d.id = $1`, [1]);
  assert(result.rows.length === 1, "No hay una única release actual lista.");
  const row = result.rows[0];
  assert(row.release_id === baseline.release_id && row.provider === "ollama" &&
    row.model === MODEL && digest(row.model_revision) ===
      digest(baseline.embedding_model_revision) && row.dimension === 1024 &&
    row.distance_metric === "cosine" &&
    recipe(row.parameters?.document, 32768) &&
    recipe(row.parameters?.query, 32768) &&
    row.parameters?.runtime_version === baseline.ollama_runtime_version,
  "Release/configuración actual difiere del baseline L1.");
  const version = await ollama(base, "/api/version");
  const tags = await ollama(base, "/api/tags");
  const model = tags?.models?.find((item) => item?.name === MODEL || item?.model === MODEL);
  assert(version?.version === row.parameters.runtime_version &&
    digest(model?.digest) === digest(row.model_revision),
  "Runtime/modelo/digest Ollama no coincide con la release.");
  const show = await ollama(base, "/api/show", { model: MODEL });
  const architecture = show?.model_info?.["general.architecture"];
  assert(Array.isArray(show?.capabilities) &&
    show.capabilities.includes("embedding") &&
    typeof architecture === "string" && architecture.length > 0 &&
    show.model_info[`${architecture}.embedding_length`] === 1024 &&
    Number.isInteger(show.model_info[`${architecture}.context_length`]) &&
    show.model_info[`${architecture}.context_length`] >= 32768,
  "Capability/dimensión/contexto nativo de embedding inválido.");
  return { release_id: row.release_id, model: MODEL,
    model_digest: digest(row.model_revision), runtime_version: version.version,
    native_context_length: show.model_info[`${architecture}.context_length`] };
}
function vector(value) {
  assert(Array.isArray(value) && value.length === 1024 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n) &&
      Number.isFinite(Math.fround(n))) && value.some((n) => n !== 0),
  "Vector de embedding inválido.");
  return value;
}
async function embed(base, question, context) {
  const response = await ollama(base, "/api/embed", { model: MODEL, input: [question],
    dimensions: 1024, truncate: false, options: { num_ctx: context } });
  assert(!("error" in response) && response.truncated !== true &&
    (response.model === undefined || response.model === MODEL) &&
    Array.isArray(response.embeddings) && response.embeddings.length === 1,
  "Respuesta /api/embed inválida.");
  return vector(response.embeddings[0]);
}
function similarity(a, b) {
  let aa = 0, bb = 0, ab = 0, maximum = 0;
  for (let i = 0; i < a.length; i++) {
    aa += a[i] * a[i]; bb += b[i] * b[i]; ab += a[i] * b[i];
    maximum = Math.max(maximum, Math.abs(a[i] - b[i]));
  }
  assert(aa > 0 && bb > 0, "Norma vectorial inválida.");
  return { cosine_similarity: ab / (Math.sqrt(aa) * Math.sqrt(bb)),
    max_abs_difference: maximum };
}
function identity(chunk) { return `${chunk.document_version_id}:${chunk.ordinal}`; }
function compact(chunk) {
  return { id: identity(chunk), document_key: chunk.document_key,
    locator: chunk.chunk_locator, cosine_distance: chunk.cosine_distance,
    cosine_similarity: chunk.cosine_similarity };
}
function compare(item, first, second) {
  const a = first.chunks.map(compact), b = second.chunks.map(compact);
  assert(a.length === TOP_K && b.length === TOP_K &&
    new Set(a.map((x) => x.id)).size === TOP_K &&
    new Set(b.map((x) => x.id)).size === TOP_K,
  `Top-5 incompleto o duplicado: ${item.id}.`);
  const ranksA = new Map(a.map((x, index) => [x.id, index + 1]));
  const ranksB = new Map(b.map((x, index) => [x.id, index + 1]));
  const shared = a.filter((x) => ranksB.has(x.id));
  const count = shared.length;
  return { id: item.id, ...similarity(first.vector, second.vector),
    top1_same: a[0].id === b[0].id,
    top5_same_set: count === TOP_K,
    top5_same_order: a.every((x, index) => x.id === b[index].id),
    top5_intersection_count: count, top5_jaccard: count / (10 - count),
    top5_32768: a, top5_4096: b,
    rank_changes: shared.map((x) => ({ id: x.id,
      rank_32768: ranksA.get(x.id), rank_4096: ranksB.get(x.id),
      delta_4096_minus_32768: ranksB.get(x.id) - ranksA.get(x.id) })) };
}
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], mean: values.reduce((sum, n) => sum + n, 0) / values.length,
    median: (sorted[4] + sorted[5]) / 2 };
}
function aggregate(cases) {
  return { cosine_similarity: stats(cases.map((x) => x.cosine_similarity)),
    max_abs_difference: Math.max(...cases.map((x) => x.max_abs_difference)),
    top1_same_count: cases.filter((x) => x.top1_same).length,
    top5_same_set_count: cases.filter((x) => x.top5_same_set).length,
    top5_same_order_count: cases.filter((x) => x.top5_same_order).length,
    top5_intersection_count: { mean: stats(cases.map((x) => x.top5_intersection_count)).mean,
      min: Math.min(...cases.map((x) => x.top5_intersection_count)) },
    top5_jaccard: { mean: stats(cases.map((x) => x.top5_jaccard)).mean,
      min: Math.min(...cases.map((x) => x.top5_jaccard)) } };
}
function markdown(report) {
  const s = report.summary;
  const kind = (x) => x.top5_same_order ? "top-5 idéntico" :
    x.top5_same_set ? "mismo conjunto; orden distinto" : "entran/salen chunks";
  return `# OPT-1C: contexto de query y estabilidad de retrieval\n\n` +
    `Exploración sobre L1-01..L1-10. Misma release documental; los embeddings de documentos no se regeneraron. No se midió latencia ni se cambió producción.\n\n` +
    `- Revision: \`${report.metadata.implementation_revision}\`; runner SHA-256: \`${report.metadata.runner_sha256}\`; workload SHA-256: \`${report.metadata.l1_cases_sha256}\`.\n` +
    `- Release: \`${report.metadata.release_id}\`; modelo: \`${report.metadata.model}\`; digest: \`${report.metadata.model_digest}\`; runtime: \`${report.metadata.runtime_version}\`.\n` +
    `- Query: 32768 frente a 4096; top_k=5; distancia coseno. Primero se ejecutaron los diez casos 32768 y después los diez 4096.\n\n` +
    `## Resumen descriptivo\n\n` +
    `- Coseno min/media/mediana: ${s.cosine_similarity.min} / ${s.cosine_similarity.mean} / ${s.cosine_similarity.median}. Máxima diferencia absoluta: ${s.max_abs_difference}.\n` +
    `- Top-1 igual: ${s.top1_same_count}/10; top-5 mismo conjunto: ${s.top5_same_set_count}/10; mismo orden: ${s.top5_same_order_count}/10.\n` +
    `- Intersección top-5 media/mínima: ${s.top5_intersection_count.mean} / ${s.top5_intersection_count.min}; Jaccard medio/mínimo: ${s.top5_jaccard.mean} / ${s.top5_jaccard.min}.\n\n` +
    `## Casos\n\n| Caso | Top-1 | Conjunto | Orden | Intersección | Jaccard | Interpretación |\n|---|---|---|---|---:|---:|---|\n` +
    report.cases.map((x) => `| ${x.id} | ${x.top1_same} | ${x.top5_same_set} | ${x.top5_same_order} | ${x.top5_intersection_count} | ${x.top5_jaccard} | ${kind(x)} |`).join("\n") +
    `\n\nLos IDs, locators, distancias y cambios de rank por caso están en el JSON. La similitud de vectores por sí sola no establece equivalencia del retrieval ni una decisión de cambio productivo.\n`;
}
function bogotaDate(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
async function absent(path) {
  try { await access(path); } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new SafeError("Ya existe un resultado OPT-1C para la fecha local.");
}
async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 1 && args[0] === "--dry-run"),
    "Uso: node eval/generation/compare-query-context-retrieval.mjs [--dry-run]");
  const state = gitState();
  const caseBytes = await readFile(CASES);
  const caseHash = sha256(caseBytes);
  const cases = validateCases(JSON.parse(caseBytes.toString("utf8")));
  const baseline = validateBaseline(JSON.parse(await readFile(BASELINE, "utf8")), caseHash);
  const base = loopback(process.env.BANUCHAT_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
  if (args[0] === "--dry-run") {
    console.log(`OPT-1C dry-run: ${cases.map((x) => x.id).join(", ")}; baseline y URL válidos; sin DB/Ollama.`);
    return;
  }
  const date = bogotaDate(new Date());
  const jsonPath = join(RESULTS, `opt1c-query-context-retrieval-${date}.json`);
  const mdPath = join(RESULTS, `opt1c-query-context-retrieval-${date}.md`);
  await absent(jsonPath); await absent(mdPath);
  const backend = await import(new URL("../../backend/api/dist/index.js", import.meta.url));
  const runtime = backend.loadRuntimeConfig();
  const { Pool } = createRequire(join(API_DIR, "package.json"))("pg");
  const pool = new Pool({ ...runtime.postgres });
  try {
    const sql = new backend.PgSqlClient(pool);
    const environment = await preflight(sql, base, baseline);
    const results = new Map();
    for (const context of CONTEXTS) {
      for (const item of cases) {
        const queryVector = await embed(base, item.question, context);
        const chunks = await backend.retrieveDocumentChunks(sql, {
          release_id: environment.release_id, query_embedding: queryVector, top_k: TOP_K });
        results.set(`${item.id}:${context}`, { vector: queryVector, chunks });
      }
    }
    const compared = cases.map((item) => compare(item,
      results.get(`${item.id}:32768`), results.get(`${item.id}:4096`)));
    const releaseCheck = await sql.query(`SELECT dr.id AS release_id
      FROM banuchat.datasets d
      JOIN banuchat.dataset_releases dr ON dr.id = d.current_release_id
        AND dr.dataset_id = d.id AND dr.status = 'ready'
      WHERE d.id = $1`, [1]);
    assert(releaseCheck.rows.length === 1 &&
      releaseCheck.rows[0].release_id === environment.release_id,
    "La release actual cambió durante la comparación.");
    const report = { schema_version: "1", evaluation_id: "banuchat-opt1c-query-context-retrieval",
      metadata: { ...state, ...environment, generated_at: new Date().toISOString(),
        runner_sha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        l1_cases_sha256: caseHash, query_contexts: CONTEXTS, top_k: TOP_K,
        document_embeddings_regenerated: false,
        same_document_release_for_both_contexts: true,
        execution_order: "all_32768_then_all_4096" },
      summary: aggregate(compared), cases: compared };
    await mkdir(RESULTS, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    await writeFile(mdPath, markdown(report), { flag: "wx" });
    console.log(`OPT-1C completo: ${jsonPath}\nReporte: ${mdPath}`);
  } finally { await pool.end(); }
}
main().catch((error) => {
  console.error(`OPT-1C abortado: ${error instanceof SafeError
    ? error.message : "error no clasificado de dependencia o archivo"}`);
  process.exitCode = 1;
});
