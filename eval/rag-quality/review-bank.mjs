import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertGitIgnored,
  fail,
  isRecord,
  normalizeText,
  parseArguments,
  readJson,
  requireOption,
  sha256,
  tokenJaccard,
} from "./oe1-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const privateRoot = join(root, "data/ccd/local");
const defaultBank = join(privateRoot, "oe1-evaluation/benchmark-candidates-v0.1.json");
const defaultLedger = join(privateRoot, "oe1-evaluation/review-ledger-v1.json");
const defaultOutput = join(privateRoot, "oe1-evaluation/approved-benchmark-v1.json");
const schemaPath = join(here, "ccd-benchmark-candidates.schema.json");
const requireFromRag = createRequire(join(root, "backend/rag/package.json"));

function validateCorrection(value) {
  if (!isRecord(value)) fail("La corrección debe ser un objeto JSON.");
  const allowed = new Set(["question", "reference_answer", "relevant_contexts", "restrictions", "review_notes"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`Campo de corrección no permitido: ${key}`);
  if (Object.keys(value).length === 0) fail("La corrección no puede estar vacía.");
  return value;
}

export function duplicateHints(cases, threshold = 0.68) {
  const hints = [];
  for (let left = 0; left < cases.length; left += 1) {
    for (let right = left + 1; right < cases.length; right += 1) {
      const exact = normalizeText(cases[left].question) === normalizeText(cases[right].question);
      const similarity = tokenJaccard(cases[left].question, cases[right].question);
      if (exact || similarity >= threshold) hints.push({ left: cases[left].id, right: cases[right].id, exact, similarity });
    }
  }
  return hints.sort((a, b) => b.similarity - a.similarity);
}

function counts(values) {
  return Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())].sort());
}

export function reviewSummary(bank, ledger) {
  const latest = new Map(ledger.decisions.map((entry) => [entry.case_id, entry]));
  const decisions = bank.cases.map((testCase) => latest.get(testCase.id)?.decision ?? "pending");
  return {
    answerable_total: bank.cases.length,
    non_answerable_total: bank.non_answerable_cases.length,
    decisions: counts(decisions),
    non_answerable_decisions: counts(bank.non_answerable_cases.map((testCase) => latest.get(testCase.id)?.decision ?? "pending")),
    by_document: counts(bank.cases.flatMap((testCase) => testCase.relevant_contexts.map((context) => context.document_key))),
    by_query_type: counts(bank.cases.map((testCase) => testCase.query_type)),
    by_question_type: counts(bank.cases.map((testCase) => testCase.question_type)),
    by_proposed_split: counts(bank.cases.map((testCase) => testCase.proposed_split)),
    duplicate_hints: duplicateHints(bank.cases),
  };
}

async function loadBankAndLedger(bankPath, ledgerPath) {
  await Promise.all([assertGitIgnored(bankPath, root), assertGitIgnored(ledgerPath, root)]);
  const [{ value: bank, bytes }, { value: schema }] = await Promise.all([readJson(bankPath), readJson(schemaPath)]);
  const Ajv2020 = requireFromRag("ajv/dist/2020").default;
  const addFormats = requireFromRag("ajv-formats").default;
  // El schema D2 usa maxItems/minItems en subschemas condicionales sin repetir
  // type=array; AJV debe validarlo, no convertir ese aviso estilístico en fallo.
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(bank)) fail(`Banco inválido: ${ajv.errorsText(validate.errors, { separator: "\n" })}`);
  let ledger;
  try { ledger = (await readJson(ledgerPath)).value; }
  catch (error) {
    if (!String(error).includes("ENOENT")) throw error;
    ledger = { schema_version: "1.0.0", bank_sha256: sha256(bytes), decisions: [] };
  }
  if (!isRecord(ledger) || ledger.schema_version !== "1.0.0" || ledger.bank_sha256 !== sha256(bytes) || !Array.isArray(ledger.decisions)) {
    fail("Ledger inválido o vinculado a otra versión del banco.");
  }
  return { bank, ledger, bankSha256: sha256(bytes) };
}

async function showCase(bank, caseId, corpusRoot) {
  const testCase = [...bank.cases, ...bank.non_answerable_cases].find(({ id }) => id === caseId);
  if (!testCase) fail(`No existe ${caseId}.`);
  const view = { ...testCase };
  if ("relevant_contexts" in testCase) {
    if (!corpusRoot) fail("--corpus-root es obligatorio para inspeccionar evidencia respondible.");
    const corpus = (await readJson(join(corpusRoot, "corpus.json"))).value;
    const units = new Map(corpus.units.map((unit) => [unit.id, unit]));
    view.evidence = [];
    for (const context of testCase.relevant_contexts) {
      const artifactPath = join(corpusRoot, "documents/artifacts", `${context.document_key}.md`);
      const bytes = await readFile(artifactPath);
      if (sha256(bytes) !== context.source_sha256) fail(`${context.document_key}: hash del artefacto no coincide.`);
      const unit = units.get(context.document_key);
      if (!unit) fail(`${context.document_key}: no existe en corpus.json.`);
      view.evidence.push({
        document_key: context.document_key,
        artifact: artifactPath,
        sha256_verified: true,
        period: unit.period,
        applicability_status: unit.applicability_status,
        limits: unit.limits,
        content: bytes.toString("utf8"),
      });
    }
  }
  console.log(JSON.stringify(view, null, 2));
}

async function decide(bank, ledger, ledgerPath, options) {
  const caseId = requireOption(options, "case");
  const decision = requireOption(options, "decision");
  const reviewer = requireOption(options, "reviewer");
  const reason = requireOption(options, "reason");
  if (!["approved", "corrected", "rejected"].includes(decision)) fail("--decision debe ser approved, corrected o rejected.");
  if (![...bank.cases, ...bank.non_answerable_cases].some(({ id }) => id === caseId)) fail(`No existe ${caseId}.`);
  let correction;
  if (decision === "corrected") {
    const correctionPath = resolve(requireOption(options, "correction"));
    await assertGitIgnored(correctionPath, root);
    correction = validateCorrection((await readJson(correctionPath)).value);
  }
  else if (options.correction) fail("--correction solo es válido con decision=corrected.");
  const entry = {
    case_id: caseId,
    decision,
    reviewer,
    reviewed_at: new Date().toISOString(),
    reason,
    ...(correction ? { correction } : {}),
  };
  ledger.decisions = ledger.decisions.filter((item) => item.case_id !== caseId);
  ledger.decisions.push(entry);
  ledger.decisions.sort((a, b) => a.case_id.localeCompare(b.case_id));
  await mkdir(dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  console.log(`${caseId}: ${decision} registrado por ${reviewer}.`);
}

export function materialize(bank, ledger, bankSha256) {
  const latest = new Map(ledger.decisions.map((entry) => [entry.case_id, entry]));
  const accepted = bank.cases.flatMap((testCase) => {
    const review = latest.get(testCase.id);
    if (!review || !["approved", "corrected"].includes(review.decision)) return [];
    const corrected = review.correction ? { ...testCase, ...review.correction } : testCase;
    const { review_status: _discard, ...gold } = corrected;
    return [{ ...gold, review }];
  });
  const gap = 50 - accepted.length;
  return {
    schema_version: "1.0.0",
    benchmark_id: "banuchat-oe1-ccd-approved-v1",
    status: gap === 0 ? "approved" : "incomplete",
    visibility: "private_local_ignored",
    source_candidate_sha256: bankSha256,
    generated_at: new Date().toISOString(),
    corpus: bank.corpus,
    top_k: bank.top_k,
    review_summary: { approved_or_corrected: accepted.length, required: 50, gap },
    reserve: { valid_hidden_holdout_exists: false, reason: "Las reserve_candidate fueron visibles durante preparación y revisión." },
    cases: accepted,
  };
}

async function main() {
  const { command = "help", options } = parseArguments(process.argv.slice(2));
  const bankPath = resolve(options.bank || defaultBank);
  const ledgerPath = resolve(options.ledger || defaultLedger);
  const { bank, ledger, bankSha256 } = await loadBankAndLedger(bankPath, ledgerPath);
  if (command === "summary") console.log(JSON.stringify(reviewSummary(bank, ledger), null, 2));
  else if (command === "show") await showCase(bank, requireOption(options, "case"), options.corpus_root ? resolve(options.corpus_root) : undefined);
  else if (command === "decide") await decide(bank, ledger, ledgerPath, options);
  else if (command === "export") {
    const output = resolve(options.output || defaultOutput);
    await assertGitIgnored(output, root);
    const benchmark = materialize(bank, ledger, bankSha256);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(benchmark, null, 2)}\n`, "utf8");
    console.log(`${basename(output)}: ${benchmark.status}; brecha=${benchmark.review_summary.gap}.`);
    if (benchmark.status !== "approved") process.exitCode = 2;
  } else {
    console.log("Uso: node review-bank.mjs summary|show|decide|export [opciones]. Consulte README.md.");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
