import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const TOP_K = 5;

export function fail(message) {
  throw new Error(message);
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function readJson(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
    return { value: JSON.parse(text), bytes: Buffer.from(text, "utf8") };
  } catch (error) {
    fail(`${path}: ${error instanceof Error ? error.message : "JSON inválido"}`);
  }
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseArguments(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) fail(`Argumento inesperado: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const next = tokens[index + 1];
    if (next === undefined || next.startsWith("--")) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}

export function requireOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim() === "") fail(`Falta --${key.replaceAll("_", "-")}.`);
  return value;
}

export async function assertGitIgnored(path, repositoryRoot) {
  try {
    await execFileAsync("git", ["check-ignore", "--quiet", resolve(path)], {
      cwd: repositoryRoot,
      windowsHide: true,
    });
  } catch {
    fail(`${path} no está excluido por Git; se rechaza contenido CCD privado.`);
  }
}

export function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenJaccard(left, right) {
  const a = new Set(normalizeText(left).split(" ").filter((token) => token.length > 2));
  const b = new Set(normalizeText(right).split(" ").filter((token) => token.length > 2));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function validateApprovedBenchmark(value) {
  const errors = [];
  const shaPattern = /^[0-9a-f]{64}$/;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!isRecord(value)) return { valid: false, errors: ["el benchmark debe ser un objeto"] };
  if (value.schema_version !== "1.0.0") errors.push("schema_version debe ser 1.0.0");
  if (value.benchmark_id !== "banuchat-oe1-ccd-approved-v1") errors.push("benchmark_id inválido");
  if (value.visibility !== "private_local_ignored") errors.push("visibility inválida");
  if (value.status !== "approved") errors.push("status debe ser approved");
  if (value.top_k !== TOP_K) errors.push("top_k debe ser 5");
  if (!shaPattern.test(value.source_candidate_sha256 ?? "")) errors.push("source_candidate_sha256 inválido");
  if (!isRecord(value.corpus)) errors.push("corpus ausente");
  else {
    if (value.corpus.dataset_key !== "banuchat-ccd-local") errors.push("corpus.dataset_key inválido");
    if (!uuidPattern.test(value.corpus.release_id ?? "")) errors.push("corpus.release_id inválido");
    if (value.corpus.release_status !== "ready") errors.push("corpus.release_status debe ser ready");
    if (value.corpus.schema_version !== "ccd-1.2.0") errors.push("corpus.schema_version inválido");
    if (!shaPattern.test(value.corpus.manifest_sha256 ?? "")) errors.push("corpus.manifest_sha256 inválido");
    if (value.corpus.document_count !== 12 || value.corpus.chunk_count !== 12) errors.push("conteos de corpus inválidos");
  }
  if (!Array.isArray(value.cases) || value.cases.length !== 50) errors.push("debe haber exactamente 50 casos aprobados");
  else {
    const ids = new Set();
    for (const [index, testCase] of value.cases.entries()) {
      const label = `cases[${index}]`;
      if (!isRecord(testCase)) { errors.push(`${label} debe ser objeto`); continue; }
      if (typeof testCase.id !== "string" || !/^OE1-CCD-C-[0-9]{3}$/.test(testCase.id) || ids.has(testCase.id)) errors.push(`${label}.id inválido o duplicado`);
      ids.add(testCase.id);
      for (const field of ["question", "reference_answer"]) {
        if (typeof testCase[field] !== "string" || testCase[field].trim() === "") errors.push(`${label}.${field} vacío`);
      }
      if (!Array.isArray(testCase.relevant_contexts) || testCase.relevant_contexts.length === 0) errors.push(`${label}.relevant_contexts vacío`);
      else for (const [contextIndex, context] of testCase.relevant_contexts.entries()) {
        if (!isRecord(context) || typeof context.document_key !== "string" || !Number.isSafeInteger(context.ordinal) || context.ordinal < 0 || typeof context.locator !== "string" || !shaPattern.test(context.source_sha256 ?? "")) errors.push(`${label}.relevant_contexts[${contextIndex}] inválido`);
      }
      if (!isRecord(testCase.review) || !["approved", "corrected"].includes(testCase.review.decision) || typeof testCase.review.reviewer !== "string" || !testCase.review.reviewer.trim() || typeof testCase.review.reason !== "string" || !testCase.review.reason.trim() || Number.isNaN(Date.parse(testCase.review.reviewed_at))) errors.push(`${label}.review no aprobado o incompleto`);
    }
  }
  return { valid: errors.length === 0, errors };
}
