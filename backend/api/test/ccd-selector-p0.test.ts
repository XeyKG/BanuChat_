import assert from 'node:assert/strict';
import test from 'node:test';
import {decideCcdEvidence} from '../src/chat/document-evidence.js';
import {classifyFollowUp,resolveConversationQuery} from '../src/chat/conversation-context.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';

const chunks = [
  ['M01','Estructura general'],['M12','Contacto'],['TEST_ORIENTATION','Pruebas'],
  ['U03','Orientación histórica'],['U04','Transición'],['M02:DOC-102','Interacción Digital'],
].map(([locator,title])=>({chunk_locator:`unit:${locator}`,title}) as RetrievedDocumentChunk);
const selected=(query:string,history:Parameters<typeof decideCcdEvidence>[2]=[])=>decideCcdEvidence(chunks,query,history).chunks.map(c=>c.chunk_locator);

test('structure intent precedes course clarification while tests and named courses keep their scope',()=>{
  for(const q of ['Describe la organización de competencias digitales','Los pilares de la ruta','Como se divide la ruta']) assert.deepEqual(selected(q),['unit:M01']);
  assert.deepEqual(selected('estructura de la prueba diagnóstica'),['unit:TEST_ORIENTATION']);
  assert.deepEqual(selected('organización del curso Interacción Digital'),['unit:M02:DOC-102']);
  assert.deepEqual(selected('estructura de un hospital'),[]);
});

test('closed spelling normalization preserves subject identity and never invents missing chunks',()=>{
  assert.deepEqual(selected('temas de interacción dijital'),['unit:M02:DOC-102']);
  assert.deepEqual(selected('duración de la prueva diagnóstica'),['unit:TEST_ORIENTATION']);
  assert.deepEqual(selected('contactar al CCD'),['unit:M12']);
  assert.deepEqual(selected('Interacción Artificial'),[]);
  assert.deepEqual(decideCcdEvidence([], 'pilares de la ruta',[]).chunks,[]);
});

test('bounded guidance precedes generic test and all-course rules without granting rights',()=>{
  for(const q of ['orientación tras resultados de la prueba','repetir la prueba sin costo']) assert.deepEqual(selected(q),['unit:M12','unit:U03']);
  assert.deepEqual(selected('reconocimiento de todos los cursos antiguos'),['unit:M12','unit:U04']);
  assert.equal(decideCcdEvidence(chunks,'explica todos los temarios',[]).kind,'clarify_scope');
  assert.deepEqual(selected('cuál es el puntaje de la prueba'),['unit:TEST_ORIENTATION']);
});

test('clear verification references preserve the student topic and changes cannot borrow evidence',()=>{
  const history=[{role:'user' as const,content:'Aprobé cursos antiguos de Informática'}];
  const q='¿Qué deben verificar en mi caso?';
  assert.equal(classifyFollowUp(q,history),'FOLLOW_UP_CLEAR_REFERENCE');
  assert.match(resolveConversationQuery(q,history).retrieval_query,/Informática/);
  assert.deepEqual(selected(q,history),['unit:M12','unit:U04']);
  assert.equal(classifyFollowUp(q,[]),'FOLLOW_UP_AMBIGUOUS');
  assert.equal(classifyFollowUp('Ahora quiero el contacto del CCD',history),'FOLLOW_UP_TOPIC_CHANGE');
  assert.deepEqual(selected('Ahora quiero el contacto del CCD',history),['unit:M12']);
});
