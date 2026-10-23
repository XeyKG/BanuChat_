import assert from "node:assert/strict";
import test from "node:test";
import { asksUnsupportedTestRule, ccdGuidanceTopic, hasUnbackedGuidanceClaim, parseGroundedAnswer, selectCcdEvidence } from "../src/chat/document-evidence.js";
import type { RetrievedDocumentChunk } from "../src/application/document-retrieval.js";

// Selection consumes metadata only; no distance or similarity is used as support.
const ia = { title: "IA Generativa", chunk_locator: "unit:M02:DOC-101" } as RetrievedDocumentChunk;
const brand = { title: "Marca Personal Digital", chunk_locator: "unit:M02:DOC-103" } as RetrievedDocumentChunk;
const contact = { title: "Contacto CCD", chunk_locator: "unit:M12" } as RetrievedDocumentChunk;
const tests = { title: "Pruebas", chunk_locator: "unit:TEST_ORIENTATION" } as RetrievedDocumentChunk;
const chunks = [brand, contact, tests, ia];
const failure = { title: 'Historical failure', chunk_locator: 'unit:U03' } as RetrievedDocumentChunk;
const transition = { title: 'Transition', chunk_locator: 'unit:U04' } as RetrievedDocumentChunk;

test('CCD full course alias and canonical title select only the existing IA syllabus', () => {
  const all = [...chunks, failure, transition];
  for (const query of ['IA Generativa', 'Inteligencia Artificial Generativa',
    '¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?',
    '¿QUÉ TEMAS SE ESTUDIAN EN EL CURSO DE INTELIGENCIA ARTIFICIAL GENERATIVA?',
    'Explica INTELIGÉNCIA ARTIFICIÁL GENERATÍVA.', '¿Qué temas tiene ia GENERATIVA?']) {
    assert.deepEqual(selectCcdEvidence(all, query, []), [ia]);
  }
  // No new evidence when the syllabus is absent, and no generic AI expansion.
  assert.deepEqual(selectCcdEvidence([brand, tests], 'Inteligencia Artificial Generativa', []),
    selectCcdEvidence([brand, tests], 'IA Generativa', []));
  assert.deepEqual(selectCcdEvidence(all, 'Inteligencia artificial', []), [brand, contact, tests, ia]);
  assert.deepEqual(selectCcdEvidence(all, 'Inteligencia artificial general', []), [brand, contact, tests, ia]);
});

test('CCD alias preserves all other admitted course titles and selects no accidental syllabus', () => {
  const others = [brand, ...[
    ['Interacción Digital','102'], ['Creación de Contenidos Digitales','099'],
    ['Cuidado y bienestar digital','100'], ['Marco Legal Digital','104'], ['Habilidades en Analítica Digital','098'],
  ].map(([title,code]) => ({title,chunk_locator:`unit:M02:DOC-${code}`} as RetrievedDocumentChunk))];
  const all = [...others, contact, tests, ia];
  for (const course of others) assert.deepEqual(selectCcdEvidence(all, `Describe ${course.title}`, []), [course]);
  assert.deepEqual(selectCcdEvidence(all, 'Describe Marca Personal', [{role:'user',content:'Inteligencia Artificial Generativa'}]), [brand]);
});

test('CCD alias preserves follow-up, corrections and fresh topic priority over old guidance', () => {
  const all = [...chunks, failure, transition];
  const history = [{role:'user' as const,content:'Inteligencia Artificial Generativa'}];
  assert.deepEqual(selectCcdEvidence(all, '¿Y qué temas tiene?', history), [ia]);
  const correction = {role:'user' as const,content:'Corrijo: me refiero a Marca Personal, ¿qué temas aborda?'};
  assert.deepEqual(selectCcdEvidence(all, correction.content, history), [brand]);
  assert.deepEqual(selectCcdEvidence(all, '¿Y qué temas tiene?', [...history, correction]), [brand]);
  const old = [{role:'user' as const,content:'Tengo Excel aprobado del plan anterior'}];
  assert.equal(ccdGuidanceTopic('Inteligencia Artificial Generativa', old), undefined);
  assert.deepEqual(selectCcdEvidence(all, 'Inteligencia Artificial Generativa', old), [ia]);
  assert.deepEqual(selectCcdEvidence(all, '¿Y qué temas tiene?', []), []);
});

test('admitted guidance explains bounded situations without using vector rank or old assistant rules', () => {
  const all = [...chunks, failure, transition];
  assert.deepEqual(selectCcdEvidence(all, 'No aprobé una prueba nueva de 202660', []), [contact, failure]);
  const history = [{ role: 'user' as const, content: 'No aprobé una prueba nueva de 202660' }];
  assert.equal(ccdGuidanceTopic('¿Puedo repetir gratis?', history), 'U03');
  assert.deepEqual(selectCcdEvidence(all, 'Me quedaron pruebas antiguas de Informática pendientes', []), [contact, transition]);
  assert.equal(ccdGuidanceTopic('Corrijo: fue un curso reprobado, no una prueba', history), 'U03');
  assert.equal(ccdGuidanceTopic('Corrijo: fue un curso, no una prueba', history), 'U03');
  assert.equal(ccdGuidanceTopic('¿Eso quiere decir que aprobé IA Generativa?', [{role:'user',content:'Tengo Excel aprobado del plan anterior'}]), 'U04');
  assert.equal(ccdGuidanceTopic('Presenté las nuevas pruebas por primera vez sin costo; otro estudiante también las solicitó', []), undefined);
  assert.deepEqual(selectCcdEvidence(all, 'Ahora quiero el contacto del CCD', history), [contact]);
  assert.deepEqual(selectCcdEvidence(all, '¿Cuánto duran?', history), [tests]);
  assert.deepEqual(selectCcdEvidence(all, 'Corrijo: IA Generativa, ¿qué temas tiene?', history), [ia]);
});

test('positive authorizations fail closed while uncertainty and known historical consequences remain speakable', () => {
  for (const content of ['Puedes repetir gratis.', 'Tienes derecho a otra oportunidad.', 'La primera presentación es gratuita.',
    'Si aprobaste Word, tienes el pilar reconocido.', 'Quedas inscrito automáticamente.', 'Dame tu UID.',
    'No es una norma general, pero puedes repetir gratis.', 'No hay norma, puedes repetir gratis.', 'No necesitas pagar para repetir.']) assert.equal(hasUnbackedGuidanceClaim(content), true, content);
  for (const content of ['En 202660, los pilares no validados se completaban cursando la asignatura correspondiente.',
    'No se ha demostrado repetición gratuita. Primera presentación y repetición son diferentes.',
    'No puedo confirmar que tengas ese pilar reconocido; debe comprobarse con tu programa.',
    'No localizar una norma no demuestra que el procedimiento nunca existió.',
    'Si tienes Excel aprobado del plan anterior, se debe comprobar el plan con el CCD.',
    'La evidencia no confirma gratuidad, repetición gratuita ni primera presentación gratuita.',
    'Se debe comprobar si el curso está reconocido mediante el plan académico.']) assert.equal(hasUnbackedGuidanceClaim(content), false, content);
});

test('unsupported absence, cost or eligibility alone never establish a transition topic', () => {
  const all = [...chunks, failure, transition];
  for (const query of ['No asistí a la prueba', 'Me admitieron después de la primera fecha',
    '¿Es otro intento gratis?', '¿Soy elegible como continuo?', 'Presenté las nuevas pruebas por primera vez sin costo; otro estudiante también las solicitó']) {
    assert.equal(ccdGuidanceTopic(query, []), undefined, query);
    assert.ok(selectCcdEvidence(all, query, []).every(c => !['unit:U03', 'unit:U04'].includes(c.chunk_locator)), query);
  }
  assert.equal(ccdGuidanceTopic('¿Puedo pedir la primera gratis?', [{role:'user',content:'Me quedaron pruebas de Informática pendientes'}]), 'U04');
  assert.equal(ccdGuidanceTopic('Presenté las nuevas pruebas por primera vez sin costo; otro estudiante también las solicitó',
    [{role:'user',content:'Me quedaron pruebas de Informática pendientes'}]), 'U04');
  assert.equal(ccdGuidanceTopic('¿Es otro intento gratis?', [{role:'assistant',content:'La transición de Informática permite repetir'}]), undefined);
});

test('generic retrieval cannot reintroduce either guidance unit without a pertinent topic', () => {
  assert.deepEqual(selectCcdEvidence([failure, transition], 'Necesito un procedimiento no especificado', []), []);
  assert.deepEqual(selectCcdEvidence([failure, contact, transition], 'Necesito un procedimiento no especificado', []), [contact]);
});

test('an unrecognized singular themes reference cannot fall back to the full evidence pool',()=>{
  assert.deepEqual(selectCcdEvidence(chunks,'¿Y qué temas tiene?',[{role:'user',content:'Quiero información general'}]),[]);
  assert.deepEqual(selectCcdEvidence(chunks,'Consulta general autónoma',[]),chunks);
});

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
  for (const question of ["¿Y qué pasa si no las apruebo?", "¿Puedo repetirlas gratuitamente?", "¿Con 70 puntos quedo exento?",
    'Me admitieron después de la primera fecha', 'Fui admitido tarde', 'Admisión tardía', '¿Tengo derecho a otro intento?']) {
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
