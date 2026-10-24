/** Public development cases, not a reserved/academic evaluation bank. */
import type {ConversationMessage} from '../../src/chat/conversation-context.js';
export interface ContextCase {
  id: string;
  query: string;
  history: ConversationMessage[];
  intent: 'identified'|'ambiguous'|'unknown'|'multiple'|'catalog'|'unverified_claim';
  expected?: string[];
}
const ia='unit:M02:DOC-101',brand='unit:M02:DOC-103';
const user=(content:string):ConversationMessage=>({role:'user',content});
export const contextCases:ContextCase[]=[
  {id:'canonical',query:'Describe los temas del curso IA Generativa.',intent:'identified',expected:[ia],history:[]},
  {id:'expanded',query:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?',intent:'identified',expected:[ia],history:[]},
  {id:'normalized',query:'¿QUÉ TEMAS TIENE INTELIGÉNCIA ARTIFICIÁL GENERATÍVA?',intent:'identified',expected:[ia],history:[]},
  ...[['brand','Marca Personal Digital','103'],['interaction','Interacción Digital','102'],
    ['content','Creación de Contenidos Digitales','099'],['wellbeing','Cuidado y bienestar digital','100'],
    ['law','Marco Legal Digital','104'],['analytics','Habilidades en Analítica Digital','098']].map(([id,title,doc])=>({id:id!,query:`Describe los temas de ${title}.`,intent:'identified' as const,expected:[`unit:M02:DOC-${doc}`],history:[]})),
  {id:'paraphrase',query:'Busco la asignatura para aprender a dar instrucciones a modelos que crean texto e imágenes.',intent:'ambiguous',history:[]},
  {id:'catalog',query:'¿Cuáles son los cursos de Competencias Digitales?',intent:'catalog',history:[]},
  {id:'broad_topics',query:'Explica los contenidos de todos los cursos disponibles.',intent:'multiple',history:[]},
  {id:'two_courses',query:'Compara los temas de IA Generativa y Marca Personal Digital.',intent:'multiple',expected:[ia,brand],history:[]},
  {id:'unknown',query:'Describe el mantenimiento de motores de aeronaves.',intent:'unknown',history:[]},
  {id:'ambiguous_fresh',query:'¿Y ese curso, qué temas tiene?',intent:'ambiguous',expected:[],history:[]},
  {id:'implicit',query:'¿Y qué temas tiene?',intent:'identified',expected:[ia],history:[user('Describe IA Generativa.')]},
  {id:'catalog_reference',query:'¿Y qué temas tiene?',intent:'ambiguous',expected:[],history:[user('¿Cuáles son los cursos de Competencias Digitales?')]},
  {id:'corrections',query:'¿Y qué temas tiene?',intent:'identified',expected:[ia],history:[user('Describe IA Generativa.'),user('Corrijo: me refiero a Marca Personal.'),user('Ahora quiero conocer IA Generativa.')]},
  {id:'fresh_after_guidance',query:'Describe Inteligencia Artificial Generativa.',intent:'identified',expected:[ia],history:[user('Tengo Excel del plan anterior.')]},
  {id:'long_history',query:'¿Y qué temas tiene?',intent:'identified',expected:[ia],history:[user('Describe IA Generativa. '+ 'Detalle de consulta. '.repeat(55)),...Array.from({length:6},()=>user('Y '+ 'necesito comprender los temas. '.repeat(25)))]},
  {id:'history_subject_evicted',query:'¿Y qué temas tiene?',intent:'ambiguous',expected:[],history:[user('Describe IA Generativa. '+ 'Detalle de consulta. '.repeat(55)),...Array.from({length:6},()=>user('Y '+ 'necesito comprender los temas. '.repeat(35)))]},
  {id:'near_query_limit',query:('Describe los temas de IA Generativa. '+ ' Detalle de consulta. '.repeat(210)).slice(0,3999),intent:'identified',expected:[ia],history:[]},
  {id:'unverified_claim',query:'Ya aprobé IA Generativa y me dijeron que eso concede gratuidad. ¿Está documentado ese derecho?',intent:'unverified_claim',history:[]},
  {id:'unsupported',query:'¿Cuál es el horario vigente de IA Generativa y cuántos cupos quedan?',intent:'identified',expected:[ia],history:[]},
];
