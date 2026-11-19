import type {CcdKnowledgeEvidenceMetadata} from './ccd-knowledge.js';

const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export interface CcdEvidenceFacet {
  aspect:string;
  label:string;
  /** Older releases can express a fact under a broader aspect. Require material support. */
  material?:RegExp;
  aliases?:string[];
}
export interface CcdSemanticPlan {facets:CcdEvidenceFacet[];courseCount:boolean;catalog:boolean;}

/** Resolve independent attributes within a subject. No diagnostic questions,
 * answers, claim IDs, document names or release IDs are stored in this plan. */
export function planCcdEvidence(query:string,subjectQuery:string,courses:readonly string[]):CcdSemanticPlan|null {
  const text=normalize(query),subject=normalize(subjectQuery);
  const diagnostic=/\b(?:diagnostic\p{L}*|pruebas?|instrumentos?)\b/u.test(subject);
  const enrollment=/\b(?:inscri\p{L}*|matricul\p{L}*|adicion\p{L}*|cancel\p{L}*)\b/u.test(text);
  const process=/\b(?:plataformas?|sistemas?|portal\p{L}*|procedimiento|pasos?|tramite|como|donde)\b/u.test(text);
  const duration=/\b(?:dura\p{L}*|tiempo|horas|semanas?|semanal\p{L}*|intensidad)\b/u.test(text);
  const fees=/\b(?:cuest\p{L}*|cost\p{L}*|precio|tarif\p{L}*|valor)\b/u.test(text);
  const facets:CcdEvidenceFacet[]=[];
  const add=(aspect:string,label:string,extra:Partial<CcdEvidenceFacet>={})=>{if(!facets.some(f=>f.aspect===aspect))facets.push({aspect,label,...extra});};
  let catalog=false,courseCount=false;
  // Processes take precedence over incidental words such as courses or modality.
  if(enrollment&&process&&!diagnostic&&/\b(?:cursos?|asignaturas?|materias?|cosmos)\b/u.test(subject)){
    add('cosmos_enrollment','el procedimiento de inscripción, adición o cancelación');
    if(/\b(?:pago|pagar|cupon)\b/u.test(text))add('cosmos_payment','la generación del cupón de pago');
  }else if(diagnostic&&/\b(?:plataformas?|lms|sistemas?|monitor\p{L}*|supervis\p{L}*)\b/u.test(text)){
    add('diagnostic_platforms','las plataformas de la prueba diagnóstica',{aliases:['history'],material:/\b(?:moodle|canvas|lms|plataforma\p{L}*)\b/u});
    if(/\b(?:monitor\p{L}*|supervis\p{L}*)\b/u.test(text))add('diagnostic_monitoring','la plataforma de supervisión',{aliases:['history'],material:/\b(?:monitor\p{L}*|supervis\p{L}*|sumadi)\b/u});
  }else if(diagnostic&&duration){
    if(/\b(?:proposito|finalidad|objetivo|reconocimiento|para que|que funcion|que utilidad)\b/u.test(text))add('purpose','el propósito de la prueba');
    add('diagnostic_duration','la duración de la prueba diagnóstica');
  }else if(!diagnostic&&duration&&(/\b(?:cursos?|asignaturas?|materias?|regular\p{L}*|intensiv\p{L}*)\b/u.test(subject)||courses.length>0)){
    if(fees)add('course_fee','la tarifa del curso');
    add(courses.length?'hours':'course_intensity','la intensidad del curso');
    if(/\b(?:semanas?|semanal\p{L}*|regular\p{L}*|intensiv\p{L}*)\b/u.test(text))add('course_schedule_intensity','las semanas y horas semanales de cada formato');
  }else if(!diagnostic&&/\b(?:cuantos|cantidad|total|numero)\b/u.test(text)&&/\b(?:cursos?|materias?|asignaturas?)\b/u.test(text)&&/\b(?:ruta|pilares?|pregrado)\b/u.test(subject)){
    courseCount=true;add('requirement','los pilares que deben completarse');add('completion','los mecanismos para completar cada pilar');
    if(/\bcreditos\b/u.test(text)){add('professional_credits','el aporte de créditos al plan');add('credits','la distinción de créditos operativos');}
  }else if(!diagnostic&&/\b(?:obligatori\p{L}*|base)\b/u.test(text)&&/\b(?:pilares?|ruta)\b/u.test(subject)){
    if(/\b(?:organiz\p{L}*|estructur\p{L}*|cuales|tres)\b/u.test(text))add('structure','la estructura de la ruta');
    add('catalog_one','el curso base del primer pilar');add('completion','los límites de la obligación de cursarlo');
  }else if(!diagnostic&&!courses.length&&!/\b(?:modalidad\p{L}*|metodologi\p{L}*|horarios?|docentes?|profesores?)\b/u.test(text)&&/\b(?:cursos?|asignaturas?|electiv\p{L}*|catalogo)\b/u.test(text)&&/\b(?:lista|enumera\p{L}*|catalogo|opciones|componen|electiv\p{L}*|oferta)|\b(?:cuales|que) (?:son (?:los|las) )?(?:cursos?|asignaturas?)\b/u.test(text)&&!enrollment){
    const second=/\b(?:pilar 2|segundo pilar|analitica y contenido)\b/u.test(text);
    const third=/\b(?:pilar 3|tercer pilar|tecnologias transformativas)\b/u.test(text)||second&&/\by (?:del |el )?(?:pilar )?3\b/u.test(text);
    catalog=true;
    if(second)add('catalog_two','los cursos del segundo pilar');
    if(third)add('catalog_three','los cursos del tercer pilar');
    if(!second&&!third)add(/\b(?:pilar 1|primer pilar)\b/u.test(text)?'catalog_one':'catalog','el catálogo de cursos');
  }
  // Orthogonal attributes accumulate even when the first clause establishes a
  // platform, catalogue or procedure. Their order never decides coverage.
  if(facets.length){
    if(diagnostic&&duration)add('diagnostic_duration','la duración de la prueba diagnóstica');
    if(diagnostic&&/\b(?:proposito|finalidad|objetivo|reconocimiento|para que|que funcion|que utilidad)\b/u.test(text))add('purpose','el propósito de la prueba');
    if(diagnostic&&/\b(?:umbral|puntaje|porcentaje|minimo|70)\b/u.test(text))add('threshold','el umbral de validación');
    if(!diagnostic&&duration&&!enrollment)add(courses.length?'hours':'course_intensity','la intensidad y duración del curso');
    if(!diagnostic&&fees)add('course_fee','la tarifa del curso');
    if(!diagnostic&&/\bcreditos\b/u.test(text)){add('professional_credits','el aporte de créditos al plan');add('credits','la distinción de créditos operativos');}
  }
  return facets.length?{facets,courseCount,catalog}:null;
}

export function matchesCcdFacet(facet:CcdEvidenceFacet,unit:{aspects:string[];text:string}):boolean {
  return (unit.aspects.includes(facet.aspect)||(facet.aliases??[]).some(alias=>unit.aspects.includes(alias)))&&(!facet.material||facet.material.test(normalize(unit.text)));
}

/** Capability boundaries precede evidence retrieval; they are not institutional rules. */
export function ccdCapabilityBoundary(query:string):string|null {
  const text=normalize(query);
  if(/\b(?:doc|documento|archivo)[\s-]*(?:numero\s+)?\d+\b|\b(?:kc|md|op|can)[ -]\d+\b/iu.test(query)||/\.(?:docx?|pdf|pptx?|xlsx?|md|txt)\b/iu.test(query)||/[A-Z]:[\\/]|documents[\\/]artifacts[\\/]/iu.test(query)||/\b(?:documento|archivo)\s+(?:[«“"]|llamado\b|titulado\b|denominado\b)/iu.test(query))
    return 'No puedo identificar archivos internos por su nombre, código o ruta. Pregúntame por el tema o el procedimiento que necesitas conocer.';
  const privateRecords=/\b(?:mis? (?:notas|calificaciones|promedio|pga|expedientes?)|expedientes? personales?|mi historial academico)\b/u.test(text);
  const individualTeacher=/\b(?:profesor|docente)\b/u.test(text)&&/\b(?:mi grupo|mi profesor|mi docente|asign\p{L}*|correo personal|horario de atencion)\b/u.test(text);
  if(privateRecords||individualTeacher)return 'No tengo acceso a expedientes personales, calificaciones o promedios de Banner ni a la asignación individual de docentes o grupos. El progreso de demostración de BanuChat usa datos ficticios.';
  const benefit=/\b(?:exenci\p{L}*|exoner\p{L}*|descuent\p{L}*|gratuidad|gratis|gratuito|no (?:tener que )?pagar)\b/u.test(text);
  const authority=/\b(?:autorizame|autoriza|aplicame|aplica|concedeme|concede|otorgame|otorga|apruebame|aprueba|eximeme|exime|exonerame|exonera|hazme|dame)\b/u.test(text)||/\b(?:puedes|podrias|quiero|necesito)\b.{0,40}\b(?:autorizar|aplicar|conceder|otorgar|aprobar)\b/u.test(text);
  if(benefit&&authority)return 'No tengo facultades para autorizar exenciones, descuentos, gratuidades ni excepciones de pago. Una solicitud económica particular debe tramitarse ante las instancias administrativas de la universidad; este chat no aprueba beneficios.';
  return null;
}

/** Catalog aliases may be presented using a unique adopted course name already
 * in the same release. Never invent aliases or rewrite academic source passages. */
export function canonicalCcdCatalogText(text:string,metadata:ReadonlyMap<string,CcdKnowledgeEvidenceMetadata>):string {
  const names=[...new Set([...metadata.values()].filter(m=>m.domain_metadata?.current!==false).flatMap(m=>m.course?[m.course]:[]))];
  return text.split(/([,;:.]|\s+o\s+)/u).map(segment=>{
    const leading=segment.match(/^\s*/u)![0],value=segment.trim();
    const candidates=names.filter(name=>value.endsWith(' y '+name)&&value.slice(0,-name.length).trim().split(/\s+/u).length===2);
    return candidates.length===1?leading+candidates[0]:segment;
  }).join('');
}
