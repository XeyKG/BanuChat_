import { appendFile, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { assertGitIgnored, fail, isRecord, parseArguments, requireOption, sha256 } from "./oe1-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const privateRoot = join(root, "data/ccd/local");
const defaultBank = join(privateRoot, "oe1-evaluation/candidate-bank-ccd-1.4.0-v1.json");
const defaultLedger = join(privateRoot, "oe1-evaluation/review-ledger-ccd-1.4.0-v1.jsonl");
const defaultArtifacts = join(privateRoot, "product-knowledge-v2");
const expectedDefaultSha = "0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf";
const shaPattern = /^[0-9a-f]{64}$/;

function within(base, target) {
  const rel = relative(base, target);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function privatePath(value) {
  const target = resolve(value);
  if (!within(privateRoot, target)) fail("La ruta debe estar dentro de data/ccd/local.");
  await assertGitIgnored(target, root);
  return target;
}

function validatedBank(value) {
  if (!isRecord(value) || value.schema_version !== "oe1-ccd-1.4.0-candidate-v1" ||
      value.dataset !== "banuchat-ccd-local" || value.dataset_schema_version !== "ccd-1.4.0" ||
      value.status !== "draft_pending_author_review" || !Array.isArray(value.cases) || value.cases.length !== 29) fail("Banco candidato CCD 1.4.0 inválido.");
  const ids = new Set();
  for (const item of value.cases) {
    if (!isRecord(item) || !/^OE1-CCD-14-C-\d{3}$/.test(item.id ?? "") || ids.has(item.id) ||
        item.status !== "draft_pending_author_review" || !item.question?.trim() || !item.reference_answer?.trim() ||
        !Array.isArray(item.relevant_contexts) || item.relevant_contexts.length === 0) fail("Caso candidato incompleto o duplicado.");
    ids.add(item.id);
    for (const context of item.relevant_contexts) {
      if (!isRecord(context) || typeof context.document_key !== "string" ||
          !Number.isSafeInteger(context.ordinal) || typeof context.locator !== "string" ||
          typeof context.source_path !== "string" || !shaPattern.test(context.source_sha256 ?? "") ||
          context.artifact_sha256 !== context.source_sha256) fail("Contexto candidato inválido.");
    }
  }
  return value;
}

async function loadBank(options) {
  const bankPath = await privatePath(options.bank || defaultBank);
  if (options.bank && !options.ledger) fail("--bank requiere --ledger separado.");
  const bytes = await readFile(bankPath);
  const digest = sha256(bytes);
  const expected = options.bank ? requireOption(options, "expected_bank_sha256") : expectedDefaultSha;
  if (!shaPattern.test(expected) || digest !== expected) fail("El hash del banco candidato cambió o no coincide con el esperado.");
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); }
  catch { fail("Banco candidato JSON inválido."); }
  return { bank: validatedBank(value), digest };
}

async function readLedger(ledgerPath, digest, bank) {
  let text;
  try { text = await readFile(ledgerPath, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  if (!text.endsWith("\n")) fail("Ledger incompleto; revisión manual requerida.");
  let lines;
  try { lines = text.trimEnd().split("\n").map(line => JSON.parse(line)); }
  catch { fail("Ledger JSON inválido; revisión manual requerida."); }
  const header = lines.shift();
  if (!isRecord(header) || header.schema_version !== "oe1-ccd-1.4-review-ledger-v1" || header.bank_sha256 !== digest) fail("Ledger vinculado a otro banco o inválido.");
  const known = new Set(bank.cases.map(item => item.id));
  for (const event of lines) {
    if (!isRecord(event) || !known.has(event.case_id) ||
        !["approved", "rejected", "correction_requested"].includes(event.decision) ||
        typeof event.reviewer !== "string" || !event.reviewer.trim() ||
        typeof event.reason !== "string" || !event.reason.trim() ||
        typeof event.reviewed_at !== "string" || Number.isNaN(Date.parse(event.reviewed_at))) fail("Evento de revisión inválido.");
  }
  return lines;
}

function summary(bank, events) {
  const latest = new Map(events.map(event => [event.case_id, event]));
  const counts = { pending: 0, approved: 0, corrected: 0, rejected: 0, correction_requested: 0 };
  for (const item of bank.cases) {
    const decision = latest.get(item.id)?.decision;
    if (decision === "approved" || decision === "rejected") counts[decision]++;
    else { counts.pending++; if (decision === "correction_requested") counts.correction_requested++; }
  }
  return { total: bank.cases.length, ...counts, recorded_events: events.length };
}

async function showCase(bank, caseId, artifactRoot) {
  const item = bank.cases.find(candidate => candidate.id === caseId);
  if (!item) fail("ID de candidata desconocido.");
  const contexts = [];
  for (const context of item.relevant_contexts) {
    const file = resolve(artifactRoot, context.source_path);
    if (!within(artifactRoot, file)) fail("Ruta de artefacto inválida.");
    const digest = sha256(await readFile(file));
    if (digest !== context.source_sha256 || digest !== context.artifact_sha256) fail("Hash de artefacto incompatible.");
    contexts.push({ ...context, artifact_path: file, hash_verified: true });
  }
  console.log(JSON.stringify({ ...item, relevant_contexts: contexts }, null, 2));
}

async function appendDecision(options, bank, digest, ledgerPath) {
  const caseId = requireOption(options, "case");
  const decision = options.command === "request-correction" ? "correction_requested" : requireOption(options, "decision");
  if (!bank.cases.some(item => item.id === caseId)) fail("ID de candidata desconocido.");
  if (!["approved", "rejected", "correction_requested"].includes(decision)) fail("Decisión inválida.");
  if (options.command === "decide" && decision === "correction_requested") fail("Use request-correction para solicitar cambios.");
  const reviewer = requireOption(options, "reviewer").trim();
  const reason = requireOption(options, "reason").trim();
  if (reason.length < 12) fail("El motivo debe ser específico (mínimo 12 caracteres).");
  if (options.proposal && decision !== "correction_requested") fail("--proposal solo corresponde a request-correction.");
  let proposal;
  if (options.proposal) {
    const proposalPath = await privatePath(options.proposal);
    const bytes = await readFile(proposalPath);
    let value;
    try { value = JSON.parse(bytes.toString("utf8")); }
    catch { fail("Propuesta JSON inválida."); }
    const allowed = new Set(["question", "reference_answer", "relevant_contexts", "restrictions"]);
    if (!isRecord(value) || !Object.keys(value).length || Object.keys(value).some(key => !allowed.has(key))) fail("Propuesta de corrección inválida.");
    proposal = { bytes, sha256: sha256(bytes) };
  }
  await mkdir(dirname(ledgerPath), { recursive: true });
  const lockPath = `${ledgerPath}.lock`;
  let lock;
  try { lock = await open(lockPath, "wx"); }
  catch { fail("Ledger ocupado; reintente después de revisar el bloqueo."); }
  try {
    await readLedger(ledgerPath, digest, bank);
    try { await writeFile(ledgerPath, `${JSON.stringify({ schema_version: "oe1-ccd-1.4-review-ledger-v1", bank_sha256: digest })}\n`, { flag: "wx" }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    const reviewedAt = new Date().toISOString();
    let proposalRef;
    if (proposal) {
      const dir = join(dirname(ledgerPath), "review-proposals-ccd-1.4.0");
      await privatePath(join(dir, "placeholder.json"));
      await mkdir(dir, { recursive: true });
      const snapshot = join(dir, `${caseId}-${reviewedAt.replaceAll(/[:.]/g, "-")}-${proposal.sha256.slice(0, 12)}.json`);
      await writeFile(snapshot, proposal.bytes, { flag: "wx" });
      proposalRef = { path: snapshot, sha256: proposal.sha256 };
    }
    const event = { case_id: caseId, decision, reviewer, reason, reviewed_at: reviewedAt, ...(proposalRef ? { proposal: proposalRef } : {}) };
    await appendFile(ledgerPath, `${JSON.stringify(event)}\n`);
    console.log(`${caseId}: ${decision} registrado.`);
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (!["summary", "show", "decide", "request-correction"].includes(command)) fail("Uso: summary | show --case ID | decide --case ID --decision approved|rejected --reviewer NOMBRE --reason MOTIVO | request-correction --case ID --reviewer NOMBRE --reason MOTIVO [--proposal JSON].");
  options.command = command;
  const { bank, digest } = await loadBank(options);
  const ledgerPath = await privatePath(options.ledger || defaultLedger);
  if (command === "show") {
    const artifactRoot = resolve(options.artifact_root || defaultArtifacts);
    if (!within(privateRoot, artifactRoot)) fail("La raíz de artefactos debe ser privada.");
    await showCase(bank, requireOption(options, "case"), artifactRoot);
    return;
  }
  if (command === "summary") console.log(JSON.stringify(summary(bank, await readLedger(ledgerPath, digest, bank)), null, 2));
  else await appendDecision(options, bank, digest, ledgerPath);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
