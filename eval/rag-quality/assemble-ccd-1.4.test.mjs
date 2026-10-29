import assert from "node:assert/strict";
import test from "node:test";

import { assembleFromBytes, sourceSpecs } from "./assemble-ccd-1.4.mjs";
import { sha256 } from "./oe1-core.mjs";

const date = "2026-10-29T12:00:00.000Z";
const digest = "a".repeat(64);
const versionId = "11111111-1111-4111-8111-111111111111";
const chunkId = "22222222-2222-4222-8222-222222222222";

function fixtureSources() {
  let next = 1;
  return sourceSpecs.map(source => {
    const spec = { ...source };
    const cases = Array.from({ length: spec.expected_count }, () => {
      const suffix = String(next++).padStart(3, "0");
      return {
        id: spec.origin === "new_coverage_case" ? `OE1-CCD-14-N-${suffix}` : `OE1-CCD-14-C-${suffix}`,
        ...(spec.origin === "new_coverage_case" ? { origin: "new_coverage_case" } : { historical_id: `OE1-CCD-C-${suffix}` }),
        status: "draft_pending_author_review",
        question: `Pregunta totalmente sintética ${suffix}`,
        reference_answer: `Respuesta totalmente sintética ${suffix}`,
        relevant_contexts: [{ document_key: `synthetic-${suffix}`, document_version_id: versionId,
          chunk_id: chunkId, ordinal: 0, locator: `fixture:${suffix}`, source_path: `documents/artifacts/synthetic-${suffix}.md`,
          source_sha256: digest, artifact_sha256: digest }],
        period: ["periodo ficticio"], population: ["población ficticia"], restrictions: ["fixture"],
        author_review: { decision: null, reason: null, reviewer: null, reviewed_at: null },
      };
    });
    const bank = { schema_version: spec.bank_schema, release_id: "10af4ffd-effb-41fc-bbfe-4dc48cb3398f",
      manifest_sha256: "fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852", cases };
    const bankBytes = Buffer.from(`${JSON.stringify(bank)}\n`);
    spec.expected_sha256 = sha256(bankBytes);
    const header = { schema_version: spec.ledger_schema,
      [spec.id === "main" ? "bank_sha256" : "supplement_sha256"]: spec.expected_sha256 };
    const eventLines = cases.map(item => JSON.stringify({ case_id: item.id, decision: "approved",
      reviewer: "Revisor sintético", reason: "Cotejo sintético individual", [spec.id === "main" ? "reviewed_at" : "recorded_at_utc"]: date }));
    const ledgerBytes = Buffer.from(`${[JSON.stringify(header), ...eventLines].join("\n")}\n`);
    return { spec, bankBytes, ledgerBytes };
  });
}

test("ensambla 45 casos sintéticos y conserva seis procedencias", () => {
  const result = assembleFromBytes(fixtureSources(), date);
  assert.equal(result.total_cases, 45);
  assert.deepEqual(result.origin_counts, { historical_remap: 41, new_coverage_case: 4 });
  assert.equal(result.sources.length, 6);
  assert.equal(new Set(result.cases.map(item => item.id)).size, 45);
  assert.equal(result.cases[0].approval.ledger_line, 2);
  assert.equal(result.cases[0].approval.source_timestamp_field, "reviewed_at");
  assert.equal(result.cases[0].status, "approved_by_author_pending_gold_audit");
  assert.equal(result.cases[0].source_candidate_status, "draft_pending_author_review");
  assert.equal(result.cases.at(-1).approval.source_timestamp_field, "recorded_at_utc");
  assert.equal(result.cases.at(-1).origin, "new_coverage_case");
});

test("rechaza hash alterado, aprobación ausente, ID repetido y contexto incompleto", () => {
  const altered = fixtureSources();
  altered[0].spec.expected_sha256 = "b".repeat(64);
  assert.throws(() => assembleFromBytes(altered, date), /Hash del banco/);

  const missing = fixtureSources();
  const lines = missing[1].ledgerBytes.toString().trimEnd().split("\n");
  lines.pop();
  missing[1].ledgerBytes = Buffer.from(`${lines.join("\n")}\n`);
  assert.throws(() => assembleFromBytes(missing, date), /ledger|Decisión/i);

  const duplicate = fixtureSources();
  const bank = JSON.parse(duplicate[1].bankBytes);
  bank.cases[1].id = bank.cases[0].id;
  duplicate[1].bankBytes = Buffer.from(`${JSON.stringify(bank)}\n`);
  duplicate[1].spec.expected_sha256 = sha256(duplicate[1].bankBytes);
  assert.throws(() => assembleFromBytes(duplicate, date), /ledger|duplicado|Decisión/i);

  const incomplete = fixtureSources();
  const sourceBank = JSON.parse(incomplete[0].bankBytes);
  delete sourceBank.cases[0].relevant_contexts[0].chunk_id;
  incomplete[0].bankBytes = Buffer.from(`${JSON.stringify(sourceBank)}\n`);
  incomplete[0].spec.expected_sha256 = sha256(incomplete[0].bankBytes);
  const sourceLines = incomplete[0].ledgerBytes.toString().trimEnd().split("\n");
  sourceLines[0] = JSON.stringify({ schema_version: incomplete[0].spec.ledger_schema, bank_sha256: incomplete[0].spec.expected_sha256 });
  incomplete[0].ledgerBytes = Buffer.from(`${sourceLines.join("\n")}\n`);
  assert.throws(() => assembleFromBytes(incomplete, date), /Contexto gold incompleto/);
});
