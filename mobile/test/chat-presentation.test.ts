import assert from 'node:assert/strict';
import test from 'node:test';
import { offersOwnProgress, readableChatAnswer } from '../src/components/chat-presentation';
import type { SentAssistantMessage } from '../src/api/messages';

const answer: SentAssistantMessage = { message_id:'answer',role:'assistant',content:'Respuesta',created_at:'2026-11-18T00:00:00Z',insufficient_evidence:false,citations:[] };
const notice = 'Referencia CCD seleccionada para demostración; sin aval institucional.\n\n';

test('historical boilerplate is removed from presentation without rewriting the answer or its limits', () => {
  const content = 'No tengo una tarifa confirmada para ese año.';
  assert.equal(readableChatAnswer(notice + content), content);
  assert.equal(readableChatAnswer(content), content);
  assert.equal(readableChatAnswer('El documento cita: ' + notice + content), 'El documento cita: ' + notice + content);
  assert.equal(readableChatAnswer('Expediente ficticio de Alba Prueba.'), 'Expediente de Alba Prueba.');
});

test('own academic questions offer navigation even when the answer has no citations', () => {
  for (const question of ['¿Cuál es mi progreso?', '¿Cómo voy en esta materia?', 'Muéstrame mi expediente', '¿Qué notas tienen mis materias?', 'Mis recursamientos']) {
    assert.equal(offersOwnProgress(answer, question), true, question);
  }
  for (const question of ['¿Cuánto cuestan los cursos?', 'El progreso de otro estudiante', 'https://example.test/progress?student=another', '¿Cuáles pruebas debo hacer?']) {
    assert.equal(offersOwnProgress(answer, question), false, question);
  }
});

test('authenticated progress evidence offers navigation without deriving a student or URL from text', () => {
  const withEvidence: SentAssistantMessage = {...answer,citations:[{index:0,source_kind:'profile_course',label:'Curso de prueba',locator:'Referencia',release_id:'release',document_version_id:null,artifact_url:null}]};
  assert.equal(offersOwnProgress(withEvidence, '¿Y ese curso?'), true);
  assert.deepEqual(answer.citations, []);
});
