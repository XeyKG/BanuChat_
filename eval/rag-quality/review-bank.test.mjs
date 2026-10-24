import assert from "node:assert/strict";
import test from "node:test";

import { duplicateHints, materialize, reviewSummary } from "./review-bank.mjs";

const context = { document_key: "ccd-demo", ordinal: 0, locator: "unit:DEMO", source_sha256: "a".repeat(64) };
const sample = (id, question, split = "development") => ({
  id, proposed_split: split, question, query_type: "factual", question_type: "single_context",
  reference_answer: "Respuesta", relevant_contexts: [context], evidence_class: "documented",
  evidence_sufficient: true, review_status: "draft", restrictions: ["Límite"], review_notes: "Revisar",
});

test("detecta duplicados exactos y aproximados solo como señales", () => {
  const hints = duplicateHints([
    sample("A", "¿Cuándo abre la sala de lectura?"),
    sample("B", "Cuando abre la sala de lectura"),
    sample("C", "¿Qué materiales admite el taller?"),
  ]);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].left, "A");
  assert.equal(hints[0].right, "B");
});

test("no materializa estado approved si la revisión humana deja brecha", () => {
  const bank = { corpus: {}, top_k: 5, cases: [sample("A", "Pregunta A"), sample("B", "Pregunta B")], non_answerable_cases: [] };
  const ledger = { decisions: [{ case_id: "A", decision: "approved", reviewer: "R", reviewed_at: "2026-01-01T00:00:00Z", reason: "Cotejado" }] };
  const output = materialize(bank, ledger, "b".repeat(64));
  assert.equal(output.status, "incomplete");
  assert.equal(output.review_summary.approved_or_corrected, 1);
  assert.equal(output.review_summary.gap, 49);
  assert.equal(output.reserve.valid_hidden_holdout_exists, false);
});

test("el resumen separa cobertura y decisiones", () => {
  const bank = { cases: [sample("A", "A"), sample("B", "B", "reserve_candidate")], non_answerable_cases: [] };
  const ledger = { decisions: [{ case_id: "A", decision: "rejected" }] };
  const summary = reviewSummary(bank, ledger);
  assert.deepEqual(summary.decisions, { pending: 1, rejected: 1 });
  assert.deepEqual(summary.non_answerable_decisions, {});
  assert.deepEqual(summary.by_proposed_split, { development: 1, reserve_candidate: 1 });
});
