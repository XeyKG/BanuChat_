import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { assertGitIgnored, isRecord, sha256 } from "./oe1-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const privateRoot = join(root, "data/ccd/local/oe1-evaluation");
const artifactRoot = join(root, "data/ccd/local/product-knowledge-v2");
const releaseId = "10af4ffd-effb-41fc-bbfe-4dc48cb3398f";
const manifestSha = "fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852";
const hex = /^[0-9a-f]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const sourceSpecs = [
  ["main", "candidate-bank-ccd-1.4.0-v1.json", "review-ledger-ccd-1.4.0-v1.jsonl", "0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf", 29, "oe1-ccd-1.4.0-candidate-v1", "oe1-ccd-1.4-review-ledger-v1", "historical_remap"],
  ["d5-4b", "supplement-ccd-1.4.0-d5-4b-v1.json", "review-ledger-supplement-ccd-1.4.0-d5-4b-v1.jsonl", "96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7", 4, "oe1-ccd-1.4.0-supplement-d5-4b-v1", "banuchat-oe1-supplement-review-v1", "historical_remap"],
  ["d5-4c", "supplement-ccd-1.4.0-d5-4c-v1.json", "review-ledger-supplement-ccd-1.4.0-d5-4c-v1.jsonl", "093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e", 4, "oe1-ccd-1.4.0-supplement-d5-4c-v1", "banuchat-oe1-supplement-review-v1", "historical_remap"],
  ["d5-4d", "supplement-ccd-1.4.0-d5-4d-v1.json", "review-ledger-supplement-ccd-1.4.0-d5-4d-v1.jsonl", "dff70bef2c687d6b5665ad00f944f628f43014e329a581ef1e75687f9037319e", 3, "oe1-ccd-1.4.0-ambiguity-assessment-d5-4d-v1", "banuchat-oe1-supplement-review-v1", "historical_remap"],
  ["d5-4e", "supplement-ccd-1.4.0-d5-4e-v1.json", "review-ledger-supplement-ccd-1.4.0-d5-4e-v1.jsonl", "40a3bc7d623209b6a83d90919022af4295d232ef25ef46287363d8767b0f03ab", 1, "oe1-ccd-1.4.0-ambiguity-assessment-d5-4e-v1", "banuchat-oe1-supplement-review-v1", "historical_remap"],
  ["d5-4g", "supplement-new-coverage-ccd-1.4.0-d5-4g-v1.json", "review-ledger-supplement-new-coverage-ccd-1.4.0-d5-4g-v1.jsonl", "34058c7e2d5ac8951b8f5fb23c142940a3d4ab5c314d8dc7a38768554f031096", 4, "oe1-ccd-1.4.0-new-coverage-d5-4g-v1", "banuchat-oe1-supplement-review-v1", "new_coverage_case"],
].map(([id, bank_name, ledger_name, expected_sha256, expected_count, bank_schema, ledger_schema, origin]) => ({ id, bank_name, ledger_name, expected_sha256, expected_count, bank_schema, ledger_schema, origin }));
const specs = sourceSpecs;

function reject(message) { throw new Error(message); }
function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { reject(`${label}: JSON inválido.`); }
}
function pathInside(base, target) {
  const relative = target.slice(base.length);
  return target.startsWith(`${base}${sep}`) && relative.length > 1;
}
function checkContext(context) {
  if (!isRecord(context) || !uuid.test(context.document_version_id ?? "") || !uuid.test(context.chunk_id ?? "") ||
      !Number.isSafeInteger(context.ordinal) || context.ordinal < 0 || !context.document_key?.trim() ||
      !context.locator?.trim() || !hex.test(context.source_sha256 ?? "") || context.artifact_sha256 !== context.source_sha256 ||
      typeof context.source_path !== "string" || !context.source_path.startsWith("documents/artifacts/")) reject("Contexto gold incompleto.");
}

export function assembleFromBytes(sources, assembledAt) {
  if (!Array.isArray(sources) || sources.length !== 6 || Number.isNaN(Date.parse(assembledAt))) reject("Se requieren seis fuentes y fecha real de ensamblaje.");
  const seen = new Set();
  const cases = [];
  const provenance = [];
  for (const source of sources) {
    const { spec, bankBytes, ledgerBytes } = source;
    const bankSha = sha256(bankBytes);
    if (!spec || bankSha !== spec.expected_sha256) reject("Hash del banco origen incompatible.");
    const bank = parseJson(bankBytes, "Banco origen");
    if (!isRecord(bank) || bank.schema_version !== spec.bank_schema || !Array.isArray(bank.cases) || bank.cases.length !== spec.expected_count ||
        (bank.release_id && bank.release_id !== releaseId) || (bank.manifest_sha256 && bank.manifest_sha256 !== manifestSha)) reject("Esquema o identidad del banco origen incompatible.");
    if (!ledgerBytes.toString("utf8").endsWith("\n")) reject("Ledger incompleto.");
    const rawLines = ledgerBytes.toString("utf8").trimEnd().split("\n");
    const ledger = rawLines.map(line => parseJson(Buffer.from(line), "Ledger"));
    const header = ledger[0];
    const headerField = spec.id === "main" ? "bank_sha256" : "supplement_sha256";
    const timeField = spec.id === "main" ? "reviewed_at" : "recorded_at_utc";
    if (!isRecord(header) || header.schema_version !== spec.ledger_schema || header[headerField] !== bankSha || ledger.length !== spec.expected_count + 1) reject("Cabecera o longitud de ledger incompatible.");
    const events = ledger.slice(1);
    const eventById = new Map();
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (!isRecord(event) || event.decision !== "approved" || !event.case_id?.trim() || eventById.has(event.case_id) ||
          !event.reviewer?.trim() || !event.reason?.trim() || typeof event[timeField] !== "string" || Number.isNaN(Date.parse(event[timeField]))) reject("Decisión ausente, duplicada o inválida.");
      eventById.set(event.case_id, { event, line: index + 2, sha: sha256(Buffer.from(rawLines[index + 1], "utf8")) });
    }
    for (const [index, item] of bank.cases.entries()) {
      if (!isRecord(item) || !item.id?.trim() || seen.has(item.id) || !item.question?.trim() || !item.reference_answer?.trim() ||
          !Array.isArray(item.relevant_contexts) || !item.relevant_contexts.length || item.status !== "draft_pending_author_review") reject("Caso origen incompleto o duplicado.");
      if (spec.origin === "historical_remap" && !/^OE1-CCD-C-\d{3}$/.test(item.historical_id ?? "")) reject("ID histórico ausente.");
      if (spec.origin === "new_coverage_case" && (item.origin !== "new_coverage_case" || item.historical_id !== undefined)) reject("Origen nuevo inválido.");
      item.relevant_contexts.forEach(checkContext);
      const approval = eventById.get(item.id);
      if (!approval) reject("Caso sin aprobación humana vinculada.");
      seen.add(item.id);
      const { author_review: _draftReview, ...preserved } = item;
      cases.push({
        ...preserved,
        status: "approved_by_author_pending_gold_audit",
        source_candidate_status: item.status,
        origin: spec.origin,
        approval: {
          decision: approval.event.decision,
          reviewer: approval.event.reviewer,
          reason: approval.event.reason,
          recorded_at: approval.event[timeField],
          source_timestamp_field: timeField,
          source_id: spec.id,
          bank_sha256: bankSha,
          ledger_sha256: sha256(ledgerBytes),
          ledger_line: approval.line,
          event_sha256: approval.sha,
          source_case_index: index,
          source_case_sha256: sha256(Buffer.from(JSON.stringify(item), "utf8")),
        },
      });
    }
    if (eventById.size !== bank.cases.length) reject("Ledger contiene ID ajeno al banco.");
    provenance.push({ id: spec.id, origin: spec.origin, bank_file: spec.bank_name, bank_schema: spec.bank_schema,
      bank_sha256: bankSha, ledger_file: spec.ledger_name, ledger_schema: spec.ledger_schema,
      ledger_sha256: sha256(ledgerBytes), approved_count: bank.cases.length });
  }
  const historicalCount = cases.filter(item => item.origin === "historical_remap").length;
  const newCount = cases.filter(item => item.origin === "new_coverage_case").length;
  if (cases.length !== 45 || seen.size !== 45 || historicalCount !== 41 || newCount !== 4) reject("Conteos globales incompatibles.");
  return {
    schema_version: "oe1-ccd-1.4.0-assembled-v1",
    benchmark_id: "banuchat-oe1-ccd-1.4.0-assembled-v1",
    status: "assembled_pending_gold_audit",
    visibility: "private_local_ignored",
    dataset: "banuchat-ccd-local",
    dataset_schema_version: "ccd-1.4.0",
    release_id: releaseId,
    manifest_sha256: manifestSha,
    assembled_at: assembledAt,
    top_k: 5,
    total_cases: cases.length,
    origin_counts: { historical_remap: historicalCount, new_coverage_case: newCount },
    sources: provenance,
    cases,
  };
}

async function validatePublishedContexts(benchmark) {
  const inspect = JSON.parse(execFileSync("docker", ["inspect", "banuchat-unified-postgres"], { encoding: "utf8", windowsHide: true }))[0];
  if (inspect?.State?.Status !== "running" || !inspect.Mounts?.some(mount => mount.Name === "banuchat-unified-data")) reject("Identidad PostgreSQL inesperada.");
  const env = Object.fromEntries(inspect.Config.Env.map(entry => entry.split(/=(.*)/s).slice(0, 2)));
  const { Client } = createRequire(join(root, "backend/api/package.json"))("pg");
  const db = new Client({ host: "127.0.0.1", port: 55463, database: env.POSTGRES_DB, user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD, options: "-c default_transaction_read_only=on -c statement_timeout=15000" });
  await db.connect();
  let rows;
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const release = (await db.query(`SELECT r.id,r.dataset_schema_version,r.manifest_sha256,r.status,d.current_release_id,
      (SELECT count(*)::integer FROM banuchat.document_versions v WHERE v.dataset_release_id=r.id) AS document_count,
      (SELECT count(*)::integer FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS chunk_count,
      (SELECT count(*)::integer FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id AND c.embedding IS NOT NULL) AS embedding_count
      FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id WHERE r.id=$1`, [releaseId])).rows[0];
    if (!release || release.current_release_id !== releaseId || release.status !== "ready" || release.dataset_schema_version !== "ccd-1.4.0" ||
        release.manifest_sha256 !== manifestSha || release.document_count !== 107 || release.chunk_count !== 107 || release.embedding_count !== 107) reject("Publicación CCD 1.4.0 incompatible.");
    const keys = [...new Set(benchmark.cases.flatMap(item => item.relevant_contexts.map(context => context.document_key)))];
    rows = (await db.query(`SELECT d.document_key,v.id AS document_version_id,c.id AS chunk_id,c.ordinal,c.locator,
      v.source_path,v.source_sha256,v.processing_status,c.content,c.embedding IS NOT NULL AS has_embedding
      FROM banuchat.documents d JOIN banuchat.document_versions v ON v.document_id=d.id
      JOIN banuchat.document_chunks c ON c.document_version_id=v.id
      WHERE v.dataset_release_id=$1 AND d.document_key=ANY($2)`, [releaseId, keys])).rows;
    await db.query("ROLLBACK");
  } catch (error) { await db.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await db.end(); }
  const byKey = new Map(rows.map(row => [row.document_key, row]));
  if (byKey.size !== rows.length) reject("Documentos publicados no únicos.");
  const artifactCache = new Map();
  for (const item of benchmark.cases) for (const context of item.relevant_contexts) {
    const row = byKey.get(context.document_key);
    if (!row || row.document_version_id !== context.document_version_id || row.chunk_id !== context.chunk_id ||
        row.ordinal !== context.ordinal || row.locator !== context.locator || row.source_path !== context.source_path ||
        row.source_sha256 !== context.source_sha256 || row.processing_status !== "ready" || !row.has_embedding) reject("Gold no resoluble por identidad exacta.");
    const artifactPath = resolve(artifactRoot, context.source_path);
    if (!pathInside(artifactRoot, artifactPath)) reject("Ruta de artefacto fuera del corpus privado.");
    if (!artifactCache.has(artifactPath)) artifactCache.set(artifactPath, await readFile(artifactPath));
    const bytes = artifactCache.get(artifactPath);
    if (sha256(bytes) !== context.source_sha256 || bytes.toString("utf8") !== row.content) reject("Hash o contenido publicado incompatible.");
  }
  return { document_count: 107, chunk_count: 107, embedding_count: 107,
    gold_references: benchmark.cases.reduce((sum, item) => sum + item.relevant_contexts.length, 0), distinct_gold_units: byKey.size };
}

async function main() {
  const output = join(privateRoot, "approved-benchmark-ccd-1.4.0-v1.json");
  await assertGitIgnored(output, root);
  const sources = [];
  for (const spec of specs) {
    const bankPath = join(privateRoot, spec.bank_name), ledgerPath = join(privateRoot, spec.ledger_name);
    await Promise.all([assertGitIgnored(bankPath, root), assertGitIgnored(ledgerPath, root)]);
    sources.push({ spec, bankBytes: await readFile(bankPath), ledgerBytes: await readFile(ledgerPath) });
  }
  const benchmark = assembleFromBytes(sources, new Date().toISOString());
  const verified = await validatePublishedContexts(benchmark);
  await writeFile(output, `${JSON.stringify(benchmark, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ status: benchmark.status, cases: benchmark.total_cases, origins: benchmark.origin_counts,
    published: verified, sha256: sha256(await readFile(output)) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
