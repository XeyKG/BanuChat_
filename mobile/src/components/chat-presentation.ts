import type { SentAssistantMessage } from '../api/messages';

const LEGACY_REFERENCE_NOTICE = 'Referencia CCD seleccionada para demostración; sin aval institucional.\n\n';

/** Historical turns retain their original text and provenance in storage. */
export function readableChatAnswer(content: string): string {
  const answer = content.startsWith(LEGACY_REFERENCE_NOTICE)
    ? content.slice(LEGACY_REFERENCE_NOTICE.length)
    : content;
  return answer.startsWith('Expediente ficticio de ')
    ? 'Expediente de ' + answer.slice('Expediente ficticio de '.length)
    : answer;
}

/** Navigation opens the signed-in user's screen, never a model-supplied URL. */
export function offersOwnProgress(message: SentAssistantMessage, question: string): boolean {
  if (message.citations.some(c => c.source_kind === 'profile_course')) return true;
  const text = question.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return /\b(?:mis? (?:progreso|avances?|cursos?|materias?|notas|calificaciones|recursamientos?|expediente|historial academico)|como voy|como van mis)\b/u.test(text);
}
