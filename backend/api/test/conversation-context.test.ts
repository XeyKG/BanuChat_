import assert from "node:assert/strict";
import test from "node:test";
import { boundConversationContext, resolveConversationQuery, type ConversationMessage } from "../src/chat/conversation-context.js";

const user = (content: string): ConversationMessage => ({ role: "user", content });
const assistant = (content: string): ConversationMessage => ({ role: "assistant", content });

test("course refinement and themes retain the course subject in retrieval", () => {
  const history = [user("¿Cuáles son los cursos de Competencias Digitales?"), assistant("Analítica, IA Generativa…")];
  const detail = resolveConversationQuery("Háblame del de IA generativa", history);
  assert.match(detail.retrieval_query, /Competencias Digitales/);
  history.push(user("Háblame del de IA generativa"), assistant("Curso de herramientas de IA."));
  const themes = resolveConversationQuery("¿Y qué temas tiene?", history);
  assert.match(themes.retrieval_query, /IA generativa/);
  assert.doesNotMatch(themes.retrieval_query, /Curso de herramientas/);
});

test("test follow-ups keep the diagnostic topic; explicit changes drop it", () => {
  const history = [user("¿Qué son las pruebas diagnósticas?"), assistant("Evaluación diagnóstica.")];
  assert.match(resolveConversationQuery("¿Cuánto duran?", history).retrieval_query, /pruebas diagnósticas/);
  history.push(user("¿Cuánto duran?"), assistant("Dos horas según 202660."));
  assert.match(resolveConversationQuery("¿Y qué pasa si no las apruebo?", history).retrieval_query, /pruebas diagnósticas/);
  const changed = resolveConversationQuery("Cambiando de tema, ¿cuál es el contacto?", history);
  assert.deepEqual(changed.history, []);
  assert.doesNotMatch(changed.retrieval_query, /pruebas/);
});

test("corrections remain ordered and a new explicit subject cuts off old context", () => {
  const history = [user("Mi interés es IA generativa"), assistant("Descripción de IA.")];
  const corrected = resolveConversationQuery("Corrijo, me refiero al de marca personal", history);
  assert.equal(corrected.history[0]?.content, history[0]?.content);
  assert.match(corrected.retrieval_query, /Consulta actual: Corrijo, me refiero al de marca personal$/);
  history.push(user("Ahora hablemos de pruebas diagnósticas"), assistant("Descripción de pruebas."));
  assert.doesNotMatch(resolveConversationQuery("¿Cuánto duran?", history).retrieval_query, /IA generativa/);
});

test("ambiguous references without a user antecedent require clarification", () => {
  for (const history of [[], [assistant("Un curso sin pregunta previa")], [user("Hola"), assistant("Hola")]]) {
    assert.equal(resolveConversationQuery("¿Y qué temas tiene?", history).needs_clarification, true);
  }
  assert.equal(resolveConversationQuery("¿Cuánto duran las pruebas diagnósticas?", []).needs_clarification, false);
});

test('a catalog does not identify one course for a singular themes follow-up', () => {
  const history=[user('¿Cuáles son los cursos de Competencias Digitales?'),assistant('IA Generativa, Marca Personal y cinco cursos más.')];
  assert.equal(resolveConversationQuery('¿Y qué temas tiene?',history).needs_clarification,true);
  history.push(user('¿Y qué temas tiene?'),assistant('¿De cuál curso quieres conocer los temas?'));
  assert.equal(resolveConversationQuery('¿Y qué temas tiene?',history).needs_clarification,true);
  history.push(user('Háblame del de IA Generativa'),assistant('Descripción documentada.'));
  assert.equal(resolveConversationQuery('¿Y qué temas tiene?',history).needs_clarification,false);
  assert.equal(resolveConversationQuery('Corrijo: me refiero a Marca Personal, ¿qué temas aborda?',history).needs_clarification,false);
  assert.equal(resolveConversationQuery('Ahora quiero el contacto del CCD',history).needs_clarification,false);
  assert.equal(resolveConversationQuery('¿Qué temas tiene el curso de IA Generativa?',[]).needs_clarification,false);
});

test("context and retrieval budgets count Unicode characters and prefer recent messages", () => {
  const history = Array.from({ length: 12 }, (_, index) => user(`${index}:` + "😀".repeat(2000)));
  const bounded = boundConversationContext(history);
  assert.ok(bounded.length <= 8);
  assert.ok(bounded.every(message => Array.from(message.content).length <= 1200));
  assert.ok(bounded.reduce((sum, message) => sum + Array.from(message.content).length, 0) <= 6000);
  assert.match(bounded.at(-1)!.content, /^11:/);
  const long = "¿Y " + "😀".repeat(3995) + "?";
  assert.ok(Array.from(resolveConversationQuery(long, history).retrieval_query).length <= 4000);
});

test('cohort refinements and repetition keep the scenario but a fresh conversation cannot borrow it', () => {
  const history = [user('No aprobé la prueba nueva de 202660'), assistant('Orientación histórica.')];
  for (const q of ['Soy de primer ingreso virtual en 202660', '¿Puedo repetir gratis?', '¿Puedo pedir la primera gratis ahora?']) {
    assert.match(resolveConversationQuery(q, history).retrieval_query, /No aprobé/);
  }
  assert.equal(resolveConversationQuery('¿Puedo repetirla gratis?', []).needs_clarification, true);
  assert.match(resolveConversationQuery('Corrijo: fue un curso, no una prueba', history).retrieval_query, /Consulta actual: Corrijo/);
  assert.equal(resolveConversationQuery('Tengo Excel aprobado del plan anterior', []).needs_clarification, false);
  assert.equal(resolveConversationQuery('Ingresé en 202510 y quiero la oportunidad de antiguos', []).needs_clarification, false);
  for (const q of ['La de un pilar de 202660', '¿Dónde y cuándo la presento?', '¿Me aplica el mismo plan?', '¿Es inmediata?', '¿Tengo que presentar las nuevas?']) {
    assert.match(resolveConversationQuery(q, history).retrieval_query, /No aprobé/);
  }
});
