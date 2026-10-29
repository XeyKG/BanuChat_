import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { sha256 } from "./oe1-core.mjs";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const privateRoot = join(root, "data/ccd/local/oe1-evaluation");
const cli = join(root, "eval/rag-quality/review-ccd-1.4.mjs");

test("revisión CCD 1.4.0 con fixtures enteramente sintéticos", async () => {
  const temp = await mkdtemp(join(privateRoot, ".review-test-"));
  assert.ok(temp.startsWith(`${privateRoot}${sep}`));
  try {
    const artifactRoot = join(temp, "artifacts");
    const artifactPath = join(artifactRoot, "documents/artifacts/synthetic.md");
    await mkdir(join(artifactRoot, "documents/artifacts"), { recursive: true });
    const artifact = Buffer.from("# Fuente sintética\n\nContenido de prueba sin datos CCD.\n");
    await writeFile(artifactPath, artifact);
    const digest = sha256(artifact);
    const cases = Array.from({ length: 29 }, (_, index) => ({
      id: `OE1-CCD-14-C-${String(index + 1).padStart(3, "0")}`,
      status: "draft_pending_author_review",
      question: `Pregunta sintética ${index + 1}`,
      reference_answer: `Respuesta sintética ${index + 1}`,
      period: ["periodo ficticio"],
      restrictions: ["Solo fixture"],
      relevant_contexts: [{ document_key: "synthetic", ordinal: 0, locator: "fixture:1", source_path: "documents/artifacts/synthetic.md", source_sha256: digest, artifact_sha256: digest }],
    }));
    const bank = { schema_version: "oe1-ccd-1.4.0-candidate-v1", dataset: "banuchat-ccd-local", dataset_schema_version: "ccd-1.4.0", status: "draft_pending_author_review", cases };
    const bankPath = join(temp, "synthetic-bank.json");
    const ledgerPath = join(temp, "synthetic-ledger.jsonl");
    const bytes = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
    await writeFile(bankPath, bytes);
    const common = ["--bank", bankPath, "--ledger", ledgerPath, "--expected-bank-sha256", sha256(bytes)];
    const run = (...args) => spawnSync(process.execPath, [cli, ...args, ...common], { cwd: root, encoding: "utf8" });

    const shown = run("show", "--case", cases[0].id, "--artifact-root", artifactRoot);
    assert.equal(shown.status, 0, shown.stderr);
    const view = JSON.parse(shown.stdout);
    assert.equal(view.question, cases[0].question);
    assert.equal(view.relevant_contexts[0].hash_verified, true);

    const approved = run("decide", "--case", cases[0].id, "--decision", "approved", "--reviewer", "Autor ficticio", "--reason", "Cotejo sintético de prueba");
    assert.equal(approved.status, 0, approved.stderr);
    const rejected = run("decide", "--case", cases[1].id, "--decision", "rejected", "--reviewer", "Autor ficticio", "--reason", "La fuente sintética no basta");
    assert.equal(rejected.status, 0, rejected.stderr);
    assert.notEqual(run("decide", "--case", "ID-DESCONOCIDO", "--decision", "approved", "--reviewer", "Autor ficticio", "--reason", "Motivo sintético completo").status, 0);
    assert.notEqual(run("decide", "--case", cases[2].id, "--decision", "approved", "--reviewer", "Autor ficticio").status, 0);

    const second = run("decide", "--case", cases[0].id, "--decision", "rejected", "--reviewer", "Autor ficticio", "--reason", "Segunda decisión sintética");
    assert.equal(second.status, 0, second.stderr);
    const lines = (await readFile(ledgerPath, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(lines.length, 4);
    assert.deepEqual(lines.slice(1).filter(event => event.case_id === cases[0].id).map(event => event.decision), ["approved", "rejected"]);
    const current = run("summary");
    assert.equal(current.status, 0, current.stderr);
    assert.deepEqual(JSON.parse(current.stdout), { total: 29, pending: 27, approved: 0, corrected: 0, rejected: 2, correction_requested: 0, recorded_events: 3 });

    const proposalPath = join(temp, "proposal.json");
    await writeFile(proposalPath, JSON.stringify({ question: "Pregunta sintética revisada" }));
    const requested = run("request-correction", "--case", cases[2].id, "--reviewer", "Autor ficticio", "--reason", "Ajustar la pregunta sintética", "--proposal", proposalPath);
    assert.equal(requested.status, 0, requested.stderr);
    const after = JSON.parse(run("summary").stdout);
    assert.equal(after.correction_requested, 1);
    assert.equal(after.corrected, 0);
    assert.equal(after.pending, 27);
    const afterLines = (await readFile(ledgerPath, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(sha256(await readFile(afterLines.at(-1).proposal.path)), afterLines.at(-1).proposal.sha256);
    assert.equal((await readFile(bankPath)).toString(), bytes.toString());

    await writeFile(bankPath, `${bytes.toString().trimEnd()} \n`);
    const changed = run("summary");
    assert.notEqual(changed.status, 0);
    assert.match(changed.stderr, /hash del banco candidato/i);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
