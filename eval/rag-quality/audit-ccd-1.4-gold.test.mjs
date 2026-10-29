import assert from "node:assert/strict";
import test from "node:test";
import { renderAuthorPacket, screenCases } from "./audit-ccd-1.4-gold.mjs";

const unit = (key, statement) => ({ document_key: key, claim_id: key, family: "synthetic", statement });
const context = (key, kinds, period = "ficticio", population = "ficticia") => ({ document_key: key,
  evidence_provenance: kinds.map(kind => ({ kind })), period, population, conditions: [], exceptions: [] });
const item = (id, contexts) => ({ id, origin: "synthetic", question: "¿Qué colores ficticios contiene la muestra azul naranja violeta?",
  reference_answer: "Contiene azul naranja violeta. Se limita a una muestra inventada.", relevant_contexts: contexts, period: ["ficticio"], population: ["ficticia"] });

test("prioriza inferencia, agrupa señales de alcance y conserva pendientes", () => {
  const units = [unit("a", "Muestra azul naranja violeta ficticia"), unit("b", "Muestra azul naranja violeta diferente")];
  const cases = [item("simple", [context("a", ["DOCUMENT_SOURCE"])]), item("inferido", [context("a", ["DOCUMENT_SOURCE", "INFERENCE"])]),
    item("mixto", [context("a", ["DOMAIN_CONFIRMATION"], "uno", "una"), context("b", ["DOMAIN_CONFIRMATION"], "dos", "otra")])];
  const result = screenCases(cases, units, 2);
  assert.equal(result.selected_ids[0], "inferido");
  assert.equal(result.pending_ids.length, 1);
  const mixed = result.cases.find(value => value.id === "mixto");
  assert.equal(mixed.grouped_priority_reasons.filter(value => value.cause === "scope_mixture").length, 1);
  assert.equal(mixed.grouped_priority_reasons.filter(value => value.cause === "domain_confirmation").length, 1);
  assert.equal(result.cases[0].semantic_status, "NOT_DOCUMENTARILY_EXAMINED_IN_THIS_BLOCK");
  assert.equal(result.cases[0].gold_contexts[0].evidence_provenance[1].kind, "INFERENCE");
  assert.equal(result.cases[0].gold_contexts[0].family, "synthetic");
});

test("propone alternativas sin convertirlas en gold ni dictámenes", () => {
  const cases = [item("uno", [context("a", ["DOCUMENT_SOURCE"])])];
  const before = structuredClone(cases);
  const result = screenCases(cases, [unit("a", "Muestra azul naranja violeta"), unit("b", "Muestra azul naranja violeta sintética")]);
  assert.equal(result.cases[0].alternative_support_candidates[0].document_key, "b");
  assert.deepEqual(cases, before);
  assert.throws(() => screenCases(cases, [], 1), /sin unidad/);
  assert.throws(() => screenCases([...cases, ...cases], []), /duplicadas/);
  assert.throws(() => screenCases(cases, [], 13), /Límite/);
});

test("el paquete sintético conserva pregunta y soporte y exige clasificación explícita", () => {
  const benchmark = { cases: [{ ...item("uno", [context("a", ["DOCUMENT_SOURCE"])]), approval: { source_id: "fixture", ledger_line: 2, event_sha256: "a".repeat(64) } }] };
  const assessment = { benchmark_sha256: "b".repeat(64), pending_ids: [], sample_proposal: ["Muestra ficticia"], findings: [{ id: "uno",
    status: "REQUIERE_REVISION_DEL_AUTOR", selection_reason: "Ficción", demonstrated: [], risks: ["Riesgo ficticio"], completed: ["Cotejo ficticio"],
    claims: [{ assertion: "Afirmación sintética", judgment: "parcial", support: "Soporte ficticio", source_refs: ["fixture:1"] }],
    alternatives: [], related: [], author_action: "Cotejar fixture", preserve_approved_parts: "Texto original" }] };
  const before = structuredClone(benchmark);
  const packet = renderAuthorPacket(benchmark, assessment, new Map([["a", "Soporte completamente sintético"]]));
  assert.ok(packet.includes(benchmark.cases[0].question));
  assert.ok(packet.includes("Soporte completamente sintético"));
  assert.ok(packet.includes("A. Problemas demostrados"));
  assert.deepEqual(benchmark, before);
  assessment.findings[0].status = "approved";
  assert.throws(() => renderAuthorPacket(benchmark, assessment, new Map()), /clasificación/);
});
