import assert from "node:assert/strict";
import test from "node:test";
import { asksUnsupportedTestRule, parseGroundedAnswer, selectCcdEvidence } from "../src/chat/document-evidence.js";
import type { RetrievedDocumentChunk } from "../src/application/document-retrieval.js";

// Selection consumes metadata only; no distance or similarity is used as support.
const ia = { title: "IA Generativa", chunk_locator: "unit:M02:DOC-101" } as RetrievedDocumentChunk;
const brand = { title: "Marca Personal Digital", chunk_locator: "unit:M02:DOC-103" } as RetrievedDocumentChunk;
const contact = { title: "Contacto CCD", chunk_locator: "unit:M12" } as RetrievedDocumentChunk;
const tests = { title: "Pruebas", chunk_locator: "unit:TEST_ORIENTATION" } as RetrievedDocumentChunk;
const chunks = [brand, contact, tests, ia];

test("course source is selected by title even when it is ranked last", () => {
  assert.deepEqual(selectCcdEvidence(chunks, "Háblame del curso de IA generativa", []), [ia]);
  assert.deepEqual(selectCcdEvidence(chunks, "¿Y qué temas tiene?", [
    { role: "user", content: "IA generativa" },
    { role: "assistant", content: "Marca Personal Digital" },
  ]), [ia]);
});

test("latest correction overrides the original course; contact and tests change subject", () => {
  const history = [{ role: "user" as const, content: "IA Generativa" }];
  const correction = "Corrijo: me refiero al curso de Marca Personal. ¿Qué temas aborda?";
  assert.deepEqual(selectCcdEvidence(chunks, correction, history), [brand]);
  assert.deepEqual(selectCcdEvidence(chunks, "¿Y qué temas tiene?", [...history, { role: "user", content: correction }]), [brand]);
  assert.deepEqual(selectCcdEvidence(chunks, "Cambiando de tema, ¿cuál es el contacto?", history), [contact]);
  assert.deepEqual(selectCcdEvidence(chunks, "¿Qué son las pruebas de 202660?", history), [tests]);
  assert.deepEqual(selectCcdEvidence([ia], "¿Cuál es el contacto?", []), []);
});

test("private source protocol selects a subset in declared order and strips its metadata", () => {
  assert.deepEqual(parseGroundedAnswer("Respuesta.\nFUENTES: [3], [1]", 3), {
    content: "Respuesta.", source_indexes: [2, 0],
  });
});

test("test description is admitted but unsupported effects and free repetition are not", () => {
  for (const question of ["¿Y qué pasa si no las apruebo?", "¿Puedo repetirlas gratuitamente?", "¿Con 70 puntos quedo exento?"]) {
    assert.equal(asksUnsupportedTestRule(question), true);
  }
  assert.equal(asksUnsupportedTestRule("Explica propósito, duración, estructura y límites de las pruebas"), false);
  assert.equal(asksUnsupportedTestRule("¿Cuánto duran?"), false);
});

test("invalid, missing, repeated, inline and out-of-range references fail closed", () => {
  for (const output of ["Respuesta sin fuentes", "\nFUENTES: [1]", "Respuesta.\nFUENTES: []",
    "Respuesta.\nFUENTES: [0]", "Respuesta.\nFUENTES: [4]", "Respuesta.\nFUENTES: [1], [1]",
    "Respuesta.\nFUENTES: [-1]", "Respuesta.\nFUENTES: [1.5]", "Respuesta.\nFUENTES: [99999999999999999999]",
    "Respuesta [1].\nFUENTES: [1]", "Respuesta.\nFUENTES: [1]\nTexto después",
    "Respuesta.\nFUENTES: [1]\nFUENTES: [2]", "Respuesta.\nFUENTES: [1], inventado"]) {
    assert.equal(parseGroundedAnswer(output, 3), undefined, output);
  }
});
