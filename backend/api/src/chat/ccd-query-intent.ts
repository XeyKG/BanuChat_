import type {CcdKnowledgeEvidenceMetadata} from './ccd-knowledge.js';
import type {RetrievedDocumentChunk} from '../application/document-retrieval.js';

const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\bdijital(es)?\b/gu,'digital$1').replace(/\bprueva(s)?\b/gu,'prueba$1');
type Metadata=ReadonlyMap<string,CcdKnowledgeEvidenceMetadata>;
/** A request about a source's warrant is different from asking for live data.
 * Mixed questions still take the availability guard. */
export function ccdDocumentaryQuery(query:string):'limit'|'historical_table'|null {
  const text=normalize(query);
  if(/\b(?:histor\p{L}*|transicion|antigu\p{L}*)\b/u.test(text)&&/\b(?:tabla|prosa|fila)\b/u.test(text))return 'historical_table';
  const source=/\b(?:syllabus|temario|documento|edicion)\b/u.test(text);
  const warrant=/\b(?:confirma|acredita|garantiza|demuestra|permite asegurar|permite confirmar)\b/u.test(text);
  const live=/\b(?:docentes?|profesores?|horarios?|cupos?|matricula|oferta|grupos?)\b/u.test(text);
  const actualRequest=/\b(?:quien|que profesor|que docente|que horarios|cuales son|dime|muestrame|reserv\p{L}*|matriculame)\b/u.test(text);
  return source&&warrant&&live&&!actualRequest?'limit':null;
}
export interface CcdQueryIntent {
  courses:string[];
  subject:'academic'|'procedure'|'operational';
  historical:boolean;
  periods:string[];
  aspects:string[];
}

/** Resolve the subject before assigning an operational meaning to a shared word.
 * All course names and presentation aspects are obtained from the release metadata. */
export function resolveCcdQueryIntent(query:string,metadata:Metadata):CcdQueryIntent {
  const text=normalize(query),names=[...new Set([...metadata.values()].flatMap(m=>m.course?[m.course]:[]))];
  let courses=names.filter(c=>text.includes(normalize(c))||text.includes(normalize(c).replace(/^habilidades en /u,'')));
  const experience=/\b(?:experiencia de aprendizaje|evaluacion docente|evaluacion de experiencia)\b/u.test(text);
  const diagnostic=!experience&&/\b(?:diagnostic\p{L}*|pruebas?)\b/u.test(text);
  const academicWords=/\b(?:herramientas?|temas?|temarios?|contenidos?|competencias?|aprend\p{L}*|practicas?|syllabus|materia|organizacion|productividad|enfoque|proposito|identidad|privacidad|criterios|explica|describe|compara\p{L}*)\b/u.test(text);
  const administrative=/\b(?:matricul\p{L}*|inscrib\p{L}*|inscripcion|precio|cuesta|costo|tarifa|creditos|horas|horarios?|cupos?|oferta|profesores?|docentes?)\b/u.test(text);
  if(!courses.length&&academicWords&&!administrative&&!diagnostic){
    // Only an unambiguous acronym from an adopted course name is an alias.
    const aliases=names.filter(c=>{const first=c.split(/\s+/u)[0]!;return /^[A-ZÁÉÍÓÚ]{2,5}$/u.test(first)&&text.split(' ').includes(normalize(first));});
    if(aliases.length===1)courses=aliases;
  }
  const periods=[...query.matchAll(/\b(?:19|20)\d{2}(?:(?:10|60))?\b/gu)].map(m=>m[0]);
  const historical=/\b(?:histor\p{L}*|antigu\p{L}*|transicion|convocatoria|temario de|lineamientos)\b/u.test(text)||(/\b(?:describ\p{L}*|autorizab\p{L}*)\b/u.test(text)&&periods.length>0);
  const subject=experience?'procedure':ccdDocumentaryQuery(query)==='historical_table'?'operational':academicWords&&!administrative&&!diagnostic&&(courses.length>0||/\bherramientas?\b/u.test(text))?'academic':'operational';
  const aspects:string[]=[];
  if(experience){
    if(/\b(?:dimensiones|preguntas|instrumento|cantidad|cuantas)\b/u.test(text))aspects.push('procedure_dimensions');
  }else if(subject!=='academic'){
    const entities=[/\bruta\b/u,/\bpilar|\bambito/u,/\bopcion\p{L}* diagnost/u,/\bcurso\b/u,/\boferta\b/u].filter(p=>p.test(text)).length;
    const contrast=/\b(?:diferenc\p{L}*|distint\p{L}*|distinc\p{L}*|compar\p{L}*)\b/u.test(text);
    if(contrast&&entities>=3)aspects.push('entity_structure');
    else if(/\b(?:responsabil\p{L}*|funcion\p{L}*|papel|quien)\b/u.test(text)&&/\bmatricul\p{L}*|\binscripcion\b/u.test(text)&&/\b(?:estudiante|alumno|persona|oficina|ccd)\b/u.test(text)){
      // A contact/platform comparison has its own independent aspects below.
      if(!/\bcosmos\b/u.test(text))aspects.push('orientation','enrollment');
    }
    const failed=/\bno (?:se )?(?:valid\p{L}*|aprob\p{L}*)\b|\breprob\p{L}*\b/u.test(text);
    const countedOutcome=/\b(?:aprob\p{L}*|valid\p{L}*|reprob\p{L}*|perdi\p{L}*)\s+(?:(?:el|la|los|las)\s+)?(?:uno|una|dos|tres|[123])\b/u.test(text);
    if(!aspects.length&&diagnostic&&failed&&/\b(?:complet\p{L}*|pendiente\p{L}*)\b/u.test(text)&&!countedOutcome){
      aspects.push('completion');
      if(contrast&&/\b(?:transicion|cursos? antiguos?|informatica)\b/u.test(text))aspects.push('transition');
    }
    if(!aspects.length&&diagnostic&&historical&&/\b(?:convocatoria|ultima oportunidad|continuos|autorizaba)\b/u.test(text)&&!/\b(?:ahora|hoy|actual\p{L}*|precio|cuesta|tarifa)\b/u.test(text))aspects.push('history');
    if(/\bcosmos\b/u.test(text)&&/\b(?:contacto|canal|consultas?|comunicar\p{L}*)\b/u.test(text)&&/\b(?:inscripcion|inscrib\p{L}*|matricul\p{L}*|pago|pagar)\b/u.test(text)){
      aspects.splice(0,aspects.length,'contact');
      if(/\b(?:inscripcion|inscrib\p{L}*|matricul\p{L}*)\b/u.test(text))aspects.push('cosmos_enrollment');
      if(/\b(?:pago|pagar)\b/u.test(text))aspects.push('cosmos_payment');
    }
  }
  return {courses,subject,historical,periods,aspects};
}

export function periodMatchesIntent(period:string,intent:CcdQueryIntent):boolean {
  if(!intent.periods.length)return true;
  const source=period.match(/\b(?:19|20)\d{2}(?:(?:10|60))?\b/gu)??[];
  return intent.periods.some(requested=>source.some(value=>requested.length===6?value===requested:value.slice(0,4)===requested));
}

export function requestedAcademicRole(query:string,courses:readonly string[]):string|undefined {
  let text=normalize(query);for(const course of courses)text=text.split(normalize(course)).join(' ');
  if(/\b(?:ley|decreto|norma|articulo)\b/u.test(text)&&/\b(?:nombre|numero|exact\p{L}*|cual|dime)\b/u.test(text))return 'academic_contents';
  if(/\b(?:contenidos?|temarios?|temas?|clases|tipos)\b/u.test(text))return 'academic_contents';
  if(/\b(?:competencias?|aprendizajes?)\b/u.test(text))return 'academic_competencies';
  return undefined;
}

const generic=new Set('como cual cuales que el la los las un una unos unas de del al en y o se su sus por para con entre sobre respecto segun hay son tiene tienen hace haceis hacer es uso usar curso cursos materia materias syllabus temario temarios tema temas contenido contenidos digital digitales estudia estudiar describe explica general especifico diferencia diferencias diferencian diferente distintos complementan considera consideran incluye incluyen cubre cubren trata tratamiento relacion relaciona plantea aparecen aparece tipos clases elementos funcion funciones practicas practico criterios criterio limites limite'.split(' '));
function requestedTerms(query:string,courses:readonly string[]):string[]{
  let text=normalize(query);for(const course of courses)text=text.split(normalize(course)).join(' ');
  return [...new Set(text.split(/\s+/u).filter(w=>w.length>=4&&!generic.has(w)&&!/^compar\p{L}*$/u.test(w)&&!/^\d+$/u.test(w)).map(w=>w.slice(0,5)))];
}
function materialMatches(text:string,term:string):boolean {
  const normalized=normalize(text);
  if(term==='medio')return /\b(?:video|audio|infografi\p{L}*|multimedia|formato\p{L}*)\b/u.test(normalized);
  return normalized.split(' ').some(w=>w.startsWith(term));
}

/** Select within the existing evidence budget, without changing SQL rank or top_k.
 * Verbatim statements are exposed per entity; lexical support never invents a relation. */
export function selectAcademicComparison(chunks:readonly RetrievedDocumentChunk[],metadata:Metadata,intent:CcdQueryIntent,query:string,budget:number):RetrievedDocumentChunk[]|null {
  const terms=requestedTerms(query,intent.courses),text=normalize(query);
  const functional=/\b(?:uso|funcion\p{L}*|proposito|finalidad|objetivo|enfoque|complement\p{L}*)\b/u.test(text);
  let withoutNames=text;for(const course of intent.courses)withoutNames=withoutNames.split(normalize(course)).join(' ');
  const contents=/\b(?:contenidos?|temarios?|temas?)\b/u.test(withoutNames),competencies=/\b(?:aprendizajes?|competencias?)\b/u.test(withoutNames);
  const role=contents?'academic_contents':competencies?'academic_competencies':'academic_overview';
  const selected:RetrievedDocumentChunk[]=[];
  const statement=(c:RetrievedDocumentChunk)=>{
    const value=c.content.split('\n\n')[1]??'',course=metadata.get(c.document_key)?.course;
    const normalized=normalize(value),prefix=course?normalize(course):'';
    return prefix&&normalized.startsWith(prefix)?normalized.slice(prefix.length):normalized;
  };
  for(const course of intent.courses){
    const eligible=chunks.filter(c=>{const m=metadata.get(c.document_key)!;return m.course===course&&periodMatchesIntent(m.period,intent)&&(intent.historical||m.domain_metadata?.current!==false);});
    if(!eligible.length)return null;
    // Attributes before an explicit entity belong to that clause; otherwise the
    // shared attributes apply to every entity (e.g. privacy AND security).
    const mentions=intent.courses.map(name=>({name,index:text.indexOf(normalize(name))})).filter(m=>m.index>=0).sort((a,b)=>a.index-b.index);
    const position=mentions.findIndex(m=>m.name===course),mention=mentions[position],previous=mentions[position-1];
    const local=mention?requestedTerms(text.slice(previous?previous.index+normalize(previous.name).length:0,mention.index),[]):[];
    const remaining=new Set(local.length?local:terms),group:RetrievedDocumentChunk[]=[];
    while(remaining.size){
      const ranked=eligible.filter(c=>!group.includes(c)).map((c,index)=>({c,index,score:[...remaining].filter(t=>materialMatches(statement(c),t)).length})).sort((a,b)=>b.score-a.score||a.index-b.index);
      const best=ranked[0];if(!best?.score)return null;
      group.push(best.c);for(const term of remaining)if(materialMatches(statement(best.c),term))remaining.delete(term);
      if(selected.length+group.length>budget)return null;
    }
    if(!group.length)group.push(eligible.find(c=>metadata.get(c.document_key)?.presentation_units?.some(u=>u.aspects.includes(role)))??eligible[0]!);
    if(functional){const purpose=eligible.find(c=>metadata.get(c.document_key)?.presentation_units?.some(u=>u.aspects.includes('academic_overview')));if(purpose&&!group.includes(purpose))group.push(purpose);}
    selected.push(...group);
  }
  if(selected.length>budget)return null;
  const populations=new Set(selected.flatMap(c=>{const p=metadata.get(c.document_key)?.population;return p?[normalize(p)]:[];}));
  if(populations.size>1)return null;
  const periods=selected.map((c):string[]=>metadata.get(c.document_key)!.period.match(/\b(?:19|20)\d{2}(?:(?:10|60))?\b/gu)??[]);
  const dated=periods.filter(p=>p.length);
  if(dated.length&&dated.length!==periods.length)return null;
  if(dated.length>1&&!dated[0]!.some(period=>dated.every(p=>p.includes(period))))return null;
  return [...new Set(selected)];
}
