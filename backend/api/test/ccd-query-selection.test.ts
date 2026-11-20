import test from 'node:test';
import assert from 'node:assert/strict';
import {ccdKnowledgeQueryScope,generateCcdKnowledgeAnswer,type CcdKnowledgeDependencies,type CcdKnowledgeEvidenceMetadata} from '../src/chat/ccd-knowledge.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';

const release='11111111-1111-4111-8111-111111111111';
type Definition={id:string;text:string;topics:string[];course?:string;aspect:string;period?:string;population?:string;historical?:boolean;basis?:CcdKnowledgeEvidenceMetadata['basis_kinds']};
const definitions:Definition[]=[
 {id:'enrol',text:'La oficina asesora; la persona solicitante tramita la inscripción ordinaria.',topics:['orientation','enrollment'],aspect:'orientation'},
 {id:'enrol-process',text:'La persona solicitante registra la inscripción; la oficina orienta sin garantizar un grupo.',topics:['enrollment'],aspect:'enrollment'},
 {id:'route',text:'La ruta contiene ámbitos; una prueba evalúa un ámbito y un curso es formación. Una oferta es una programación.',topics:['structure'],aspect:'entity_structure'},
 {id:'structure',text:'La ruta ficticia contiene cuatro ámbitos.',topics:['structure'],aspect:'structure'},
 {id:'diagnostic-structure',text:'El diagnóstico ficticio contiene varias opciones.',topics:['diagnostic'],aspect:'diagnostic_structure'},
 {id:'center-diagnostic',text:'La prueba diagnóstica identifica competencias que ya se poseen.',topics:['diagnostic'],aspect:'purpose'},
 {id:'center-framework',text:'La ruta se alinea con el marco de referencia de la fixture.',topics:['digcomp'],aspect:'digcomp'},
 {id:'center-requirement',text:'Los ámbitos se completan por diagnóstico, cursos o una combinación de ambos.',topics:['completion'],aspect:'requirement'},
 {id:'center-badge',text:'Al completar los ámbitos se obtiene un reconocimiento.',topics:['badge'],aspect:'badge'},
 {id:'center-catalog-one',text:'El primer ámbito tiene un curso introductorio.',topics:['catalog'],aspect:'catalog_one'},
 {id:'center-catalog-two',text:'El segundo ámbito incluye un curso de contenidos.',topics:['catalog'],aspect:'catalog_two'},
 {id:'center-catalog-three',text:'El tercer ámbito incluye un curso de tecnologías.',topics:['catalog'],aspect:'catalog_three'},
 {id:'pending',text:'Después de no validar, el escenario ficticio describe una actividad formativa para el ámbito pendiente.',topics:['completion'],aspect:'completion'},
 {id:'past-attempt',text:'El aviso de 2031 describe una jornada histórica limitada; no concede un derecho indefinido.',topics:['diagnostic','history'],aspect:'history',period:'2031',historical:true},
 {id:'present-retry',text:'El esquema ficticio de 2040 no contempla repetir ese diagnóstico.',topics:['diagnostic','retry_limits'],aspect:'retry_limits',period:'2040'},
 {id:'experience',text:'La encuesta ficticia tiene cuatro dimensiones y cinco preguntas.',topics:['procedure'],aspect:'procedure_dimensions'},
 {id:'contact',text:'El canal de consultas proporciona orientación general.',topics:['contact'],aspect:'contact',basis:['DOMAIN_CONFIRMATION']},
 {id:'platform-enrol',text:'Cosmos registra la solicitud en el periodo habilitado.',topics:['procedure','enrollment'],aspect:'cosmos_enrollment'},
 {id:'platform-payment',text:'Cosmos permite gestionar el pago aplicable.',topics:['procedure','enrollment'],aspect:'cosmos_payment'},
 {id:'old-transition',text:'Los cursos antiguos son antecedentes por verificar, sin reconocimiento individual automático.',topics:['history','transition'],aspect:'transition',historical:true},
 {id:'ai-tools',text:'El curso describe herramientas de texto y figura para una actividad creativa.',topics:['academic'],course:'IA de Taller',aspect:'academic_contents'},
 {id:'organization',text:'El curso incluye organización del entorno de prototipos y herramientas de trabajo.',topics:['academic'],course:'Taller de Objetos',aspect:'academic_competencies'},
 {id:'scenic-overview',text:'El curso estudia composición escénica.',topics:['academic'],course:'Diseño Escénico',aspect:'academic_overview'},
 {id:'sound-overview',text:'El curso estudia composición sonora.',topics:['academic'],course:'Diseño Sonoro',aspect:'academic_overview'},
 {id:'scenic-privacy',text:'La privacidad se aborda al revisar permisos de registro visual.',topics:['academic'],course:'Diseño Escénico',aspect:'academic_competencies'},
 {id:'sound-privacy',text:'La privacidad se aborda al gestionar permisos de grabación sonora.',topics:['academic'],course:'Diseño Sonoro',aspect:'academic_contents'},
];

function fixture(changes:Partial<Record<string,Partial<Definition>>>={}){
 const defs=definitions.map(d=>({...d,...changes[d.id]}));
 const metadata=new Map<string,CcdKnowledgeEvidenceMetadata>(defs.map(d=>[d.id,{claim_id:d.id,topics:d.topics,course:d.course??null,period:d.period??'edición sintética',population:d.population??'población sintética común',conditions:[],exceptions:[],basis_kinds:d.basis??['DOCUMENT_SOURCE'],knowledge_version:2,reference_status:'adopted',domain_metadata:{entity_type:d.course?'COURSE_OPTION':'REFERENCE',current:!d.historical,temporal_class:d.historical?'HISTORICAL':'CURRENT_GENERAL',source_access_class:'LOCAL_AUTHORIZED'},presentation_units:[{key:'fact',aspects:[d.aspect],text:d.text}]}]));
 const chunks:RetrievedDocumentChunk[]=defs.map((d,i)=>({release_id:release,chunk_id:`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`,document_version_id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`,document_id:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,document_key:d.id,title:d.course??'Referencia sintética',ordinal:0,content:`# Referencia\n\n${d.text}`,chunk_locator:'section:1',source_path:`documents/${d.id}.md`,source_locator:'section:1',source_sha256:'b'.repeat(64),page_start:null,page_end:null,cosine_distance:.2,cosine_similarity:.8}));
 const calls:{keys:string[];top_k:number}[]=[],prompts:string[]=[];
 const deps:CcdKnowledgeDependencies={knowledge:{release_id:release,metadata},sql:{async query<T>(){return {rows:[{provider:'ollama',model:'qwen3-embedding:0.6b',model_revision:'c'.repeat(64),dimension:1024,distance_metric:'cosine',parameters:{runtime_version:'0.35.0',query:{dimensions:1024,truncate:false,input_prefix:null,normalization:'none',options:{num_ctx:4096}}}}] as T[]};}},query_embedding_client:{async embedQuery(){return [1,...Array<number>(1023).fill(0)];}},retrieve_chunks:async()=>chunks,retrieve_scoped_chunks:async(_sql,input,keys)=>{calls.push({keys:[...keys],top_k:input.top_k});return chunks.filter(c=>keys.includes(c.document_key));},generator_config:{provider:'ollama',model:'qwen3:4b-instruct',model_revision:'a'.repeat(64),runtime_version:'0.35.0',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}},generator_client:{async generate(input){prompts.push(input.user_prompt);return {content:'Descripción sintética.\nFUENTES: [1]',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}}};
 return {deps,calls,prompts,ask:(query:string,history?:Array<{role:'user'|'assistant';content:string}>)=>generateCcdKnowledgeAnswer(deps,{release_id:release,query,...(history?{history}:{})})};
}

test('herramientas y organización conservan el sujeto académico, no la selección de cursos o estructura de ruta',async()=>{
 const f=fixture();for(const [q,course]of [['¿Qué herramientas de IA se consideran para selección crítica?','IA de Taller'],['¿Qué organización incluye Taller de Objetos?','Taller de Objetos']]){const scope=ccdKnowledgeQueryScope(q!,f.deps.knowledge.metadata);assert.deepEqual(scope.topics,['academic']);assert.deepEqual(scope.courses,[course]);await f.ask(q!);assert.ok(f.calls.at(-1)!.keys.some(k=>f.deps.knowledge.metadata.get(k)?.course===course));assert.ok(f.calls.at(-1)!.keys.every(k=>f.deps.knowledge.metadata.get(k)?.course===course));}
});
test('un instrumento de experiencia conserva procedimiento en la llamada real de recuperación',async()=>{const f=fixture(),a=await f.ask('Según el instructivo de experiencia de aprendizaje, ¿cuántas preguntas y dimensiones tiene el instrumento?');assert.deepEqual(a.supporting_claim_ids,['experience']);assert.match(a.content,/cuatro dimensiones/u);assert.ok(!f.calls[0]!.keys.includes('diagnostic-structure'));});
test('la descripción del Centro cita su orientación en la ruta y requiere respaldo explícito', async () => {
 const f=fixture({enrol:{text:'El CCD te orienta para elegir cursos según los resultados del diagnóstico.'}});
 for(const query of ['que es el centro de competencias digitales','¿Qué hace el CCDigital?','¿Cuál es la función del Centro de Competencias Digitales de la UNAB?']){
  const answer=await f.ask(query);
  assert.equal(answer.insufficient_evidence,false);
  assert.match(answer.content,/Centro de Competencias Digitales.*orienta para elegir cursos/u);
  assert.match(answer.content,/prueba diagnóstica.*identifica/u);
  assert.deepEqual(answer.supporting_claim_ids,['enrol','structure','center-requirement','center-framework','center-catalog-one','center-catalog-two','center-catalog-three','center-diagnostic','center-badge']);
  assert.equal(answer.citations.length,9);
  assert.ok(!f.calls.at(-1)!.keys.includes('contact'));
 }
 assert.deepEqual(f.prompts,[]);
 const unsupported=await fixture().ask('¿Qué es el CCD?');
 assert.equal(unsupported.insufficient_evidence,true);
 assert.deepEqual(unsupported.unanswered_aspects,['center_orientation']);
 assert.doesNotMatch(unsupported.content,/CCD significa/u);
});
test('opciones para completar después de no validar no se convierten en opciones de diagnóstico',async()=>{const f=fixture(),a=await f.ask('¿Qué opciones hay para completar un ámbito pendiente que no se validó en el diagnóstico?');assert.deepEqual(a.supporting_claim_ids,['pending']);assert.match(a.content,/Después de no validar/u);});
test('un aviso histórico no se sustituye por una regla actual de repetición',async()=>{const f=fixture(),a=await f.ask('¿La convocatoria diagnóstica descrita en 2031 autorizaba repetir de forma indefinida?');assert.deepEqual(a.supporting_claim_ids,['past-attempt']);assert.match(a.content,/2031/u);assert.doesNotMatch(a.content,/2040/u);});
test('dos funciones conservan contacto, inscripción y pago con sus fuentes',async()=>{const f=fixture(),a=await f.ask('¿Qué función tienen el contacto de la oficina y Cosmos para inscripción y pago? ¿Cuál es la fuente?');assert.ok(a.supporting_claim_ids?.includes('contact'));assert.ok(a.supporting_claim_ids?.includes('platform-enrol'));assert.ok(a.supporting_claim_ids?.includes('platform-payment'));assert.equal(a.citations.length,3);assert.match(a.content,/confirmación de dominio/u);assert.match(a.content,/documentación citada/u);});
test('distinguir entidades no debe responder con orientación de matrícula',async()=>{const f=fixture(),a=await f.ask('¿En qué se diferencian una ruta, un ámbito, una opción diagnóstica, un curso y una oferta?');assert.deepEqual(a.supporting_claim_ids,['route']);assert.doesNotMatch(a.content,/oficina asesora/u);});
test('responsabilidades de inscripción no deben convertirse en catálogo',async()=>{const f=fixture(),a=await f.ask('Tras el diagnóstico, ¿qué responsabilidades tienen la oficina y la persona estudiante para seleccionar y matricular cursos?');assert.ok(a.supporting_claim_ids?.includes('enrol'));assert.ok(a.supporting_claim_ids?.includes('enrol-process'));assert.match(a.content,/solicitante/u);});
test('una comparación de antecedentes conserva completar y transición sin convertirlos en finalidad',async()=>{const f=fixture(),a=await f.ask('¿Qué diferencia hay entre completar un ámbito no validado en diagnóstico y examinar cursos antiguos durante la transición?');assert.ok(a.supporting_claim_ids?.includes('pending'));assert.ok(a.supporting_claim_ids?.includes('old-transition'));});
test('comparar privacidad selecciona ese atributo por entidad, aunque los resúmenes ocupen los primeros lugares',async()=>{const f=fixture(),a=await f.ask('¿Cómo se diferencia la privacidad en Diseño Escénico y Diseño Sonoro?');assert.deepEqual(new Set(a.supporting_claim_ids),new Set(['scenic-privacy','sound-privacy']));assert.match(a.content,/registro visual/u);assert.match(a.content,/grabación sonora/u);assert.ok(f.calls.every(c=>c.top_k===20));});
test('sin soporte de un atributo, o con periodos y poblaciones incompatibles, no inventa la comparación',async()=>{for(const change of [{text:'Solo describe acústica general.'},{period:'2031',population:'otra población'}]){const f=fixture({'sound-privacy':change}),a=await f.ask('¿Cómo se compara la privacidad en Diseño Escénico y Diseño Sonoro?');assert.equal(a.insufficient_evidence,true);assert.equal(a.citations.length,0);}});
test('guardias de datos personales y disponibilidad no acreditada siguen cortando antes de recuperar',async()=>{for(const q of ['Dime mis notas registradas en Taller de Objetos.','¿Qué profesor está asignado a mi grupo disponible el próximo semestre?']){const f=fixture(),a=await f.ask(q);assert.equal(a.insufficient_evidence,true);assert.equal(f.calls.length,0);}});
test('un seguimiento hereda solo el sujeto del usuario; un cambio explícito lo reemplaza',async()=>{const f=fixture();await f.ask('¿Y qué organización incluye?', [{role:'user',content:'¿Qué contenidos estudia Taller de Objetos?'},{role:'assistant',content:'La ruta general tiene muchas opciones.'}]);assert.ok(f.calls[0]!.keys.includes('organization'));assert.ok(!f.calls[0]!.keys.includes('structure'));const g=fixture();await g.ask('¿Qué organización incluye Taller de Objetos?',[{role:'user',content:'¿Qué cursos tiene la ruta?'}]);assert.ok(g.calls[0]!.keys.every(k=>g.deps.knowledge.metadata.get(k)?.course==='Taller de Objetos'));});
test('una versión numérica no es una cantidad de ámbitos aprobados',async()=>{const f=fixture(),a=await f.ask('¿Qué opciones describe Guía 3.2.1 para completar un ámbito pendiente que no se validó en el diagnóstico?');assert.deepEqual(a.supporting_claim_ids,['pending']);});
test('solicitar clases o temas conserva una ficha de contenidos dentro del presupuesto de tres',async()=>{const f=fixture(),key='ai-tools',metadata=f.deps.knowledge.metadata.get(key)!,retrieve=f.deps.retrieve_scoped_chunks!;for(let i=0;i<3;i++)f.deps.knowledge.metadata=(new Map(f.deps.knowledge.metadata)).set('distractor-'+i,{...metadata,claim_id:'distractor-'+i,presentation_units:[{key:'general',aspects:['academic_overview'],text:'Descripción general de competencias.'}]});f.deps.retrieve_scoped_chunks=async(sql,input,keys)=>{const rows=await retrieve(sql,input,keys),base=rows.find(c=>c.document_key===key)!;return [...Array.from({length:3},(_,i)=>({...base,document_key:'distractor-'+i,chunk_id:`55555555-5555-4555-8555-${String(i).padStart(12,'0')}`,content:'# Descripción\n\nDescripción general de competencias.'})),...rows];};await f.ask('¿Qué clases de herramientas incluye IA de Taller?');assert.match(f.prompts[0]!,/herramientas de texto y figura/u);});
test('periodos incompatibles o una edición sin fecha no se combinan como comparación compatible',async()=>{for(const soundPeriod of ['2032','edición sin fecha']){const f=fixture({'scenic-privacy':{period:'2031'},'sound-privacy':{period:soundPeriod}}),a=await f.ask('¿Cómo se compara la privacidad en Diseño Escénico y Diseño Sonoro?');assert.equal(a.insufficient_evidence,true);assert.deepEqual(a.citations,[]);}const dated=fixture({'scenic-privacy':{period:'2031'},'sound-privacy':{period:'2031'}}),a=await dated.ask('¿Cómo se compara la privacidad en Diseño Escénico y Diseño Sonoro en 2031?');assert.equal(a.insufficient_evidence,false);});
test('un periodo histórico solicitado sin fuente compatible se abstiene sin reutilizar otra edición',async()=>{const f=fixture({'past-attempt':{period:'2032'}}),a=await f.ask('¿La convocatoria diagnóstica descrita en 2031 autorizaba repetir de forma indefinida?');assert.equal(a.insufficient_evidence,true);assert.deepEqual(a.citations,[]);});
test('dos atributos compartidos requieren soporte material para ambos en cada entidad dentro del mismo presupuesto',async()=>{const f=fixture(),retrieve=f.deps.retrieve_scoped_chunks!,extras:RetrievedDocumentChunk[]=[];for(const [i,base]of ['scenic-privacy','sound-privacy'].entries()){const m=f.deps.knowledge.metadata.get(base)!,key=base+'-security';f.deps.knowledge.metadata=new Map(f.deps.knowledge.metadata).set(key,{...m,claim_id:key,presentation_units:[{key:'security',aspects:['academic_competencies'],text:'La seguridad se trata mediante controles de acceso.'}]});const rows=await retrieve(f.deps.sql,{release_id:release,query_embedding:Array<number>(1024).fill(.1),top_k:20},[base]);extras.push({...rows[0]!,document_key:key,chunk_id:`77777777-7777-4777-8777-${String(i).padStart(12,'0')}`,content:'# Referencia\n\nLa seguridad se trata mediante controles de acceso.'});}f.deps.retrieve_scoped_chunks=async(sql,input,keys)=>[...await retrieve(sql,input,keys),...extras.filter(c=>keys.includes(c.document_key))];const a=await f.ask('¿Cómo se comparan privacidad y seguridad en Diseño Escénico y Diseño Sonoro?');assert.equal(a.insufficient_evidence,false);assert.equal(a.selected_claim_ids?.length,4);assert.ok(a.supporting_claim_ids?.includes('scenic-privacy-security'));assert.ok(a.supporting_claim_ids?.includes('sound-privacy-security'));});

test('una palabra compartida no sustituye la pregunta por modalidades de cursos',async()=>{
 const f=fixture();for(const q of ['¿Qué duración en semanas tienen los cursos regulares e intensivos?','¿La evaluación de experiencia de aprendizaje aplica a modalidad virtual?']){const a=await f.ask(q);assert.equal(a.insufficient_evidence,true);assert.doesNotMatch(a.content,/presencial, virtual o remoto/u);}
});
test('los identificadores de oferta futura se rechazan antes de recuperar contenido curricular',async()=>{
 const f=fixture(),a=await f.ask('¿Qué código de materia exacto debo matricular para IA de Taller el próximo semestre?');assert.equal(a.insufficient_evidence,true);assert.equal(f.calls.length,0);assert.match(a.content,/programación/u);
});
test('la consecuencia de una asignatura no hereda la regla diagnóstica',async()=>{
 const f=fixture(),a=await f.ask('Si repruebo una asignatura, ¿la consecuencia es la misma que cuando repruebo una prueba diagnóstica?');assert.equal(a.insufficient_evidence,true);assert.ok(a.supporting_claim_ids?.includes('pending'));assert.match(a.content,/no determina ese resultado/u);assert.doesNotMatch(a.content,/varias opciones/u);
});
test('las palabras interrogativas no se exigen como atributos curriculares de cada curso',async()=>{
 const f=fixture(),a=await f.ask('¿En qué se diferencia el concepto de privacidad en Diseño Escénico respecto a privacidad en Diseño Sonoro?');assert.equal(a.insufficient_evidence,false);assert.deepEqual(new Set(a.supporting_claim_ids),new Set(['scenic-privacy','sound-privacy']));
});
test('una oportunidad de ingreso histórica no se convierte en derecho actual por mencionar repetición',async()=>{
 const f=fixture(),a=await f.ask('¿Los estudiantes ingresados antes de 2031 tienen derecho indefinido a repetir la prueba en 2040?');assert.deepEqual(a.supporting_claim_ids,['past-attempt']);assert.doesNotMatch(a.content,/esquema ficticio de 2040/u);
});

test('la relevancia temática conserva un detalle recuperado aunque tres vecinos anteriores tengan el mismo rol',async()=>{
 const f=fixture(),retrieve=f.deps.retrieve_scoped_chunks!,base=f.deps.knowledge.metadata.get('ai-tools')!;
 const additions=Array.from({length:3},(_,i)=>({key:'general-'+i,text:'El curso describe historia general de herramientas.'}));
 const extended=new Map(f.deps.knowledge.metadata);f.deps.knowledge.metadata=extended;for(const d of additions)extended.set(d.key,{...base,claim_id:d.key,presentation_units:[{key:'fact',aspects:['academic_contents'],text:d.text}]});
 f.deps.retrieve_scoped_chunks=async(sql,input,keys)=>{const rows=await retrieve(sql,input,keys),source=rows.find(c=>c.document_key==='ai-tools')!;return [...additions.map((d,i)=>({...source,document_key:d.key,chunk_id:`88888888-8888-4888-8888-${String(i).padStart(12,'0')}`,content:'# Referencia sintética\n\n'+d.text})),...rows];};
 await f.ask('¿Qué herramientas de texto y figura estudia IA de Taller?');assert.match(f.prompts[0]!,/texto y figura/u);assert.ok(f.calls.every(c=>c.top_k===20));
});
test('dos fuentes con una etiqueta amplia conservan el pasaje pertinente, no el primero',async()=>{
 const f=fixture(),retrieve=f.deps.retrieve_scoped_chunks!,base=f.deps.knowledge.metadata.get('past-attempt')!;
 f.deps.knowledge.metadata=new Map(f.deps.knowledge.metadata).set('unrelated-history',{...base,claim_id:'unrelated-history',presentation_units:[{key:'fact',aspects:['history'],text:'Un aviso histórico enumera las plataformas del campus.'}]});
 f.deps.retrieve_scoped_chunks=async(sql,input,keys)=>{const rows=await retrieve(sql,input,keys),source=rows.find(c=>c.document_key==='past-attempt');return source?[{...source,document_key:'unrelated-history',content:'# Aviso\n\nUn aviso histórico enumera las plataformas del campus.'},...rows]:rows;};
 const a=await f.ask('¿La convocatoria diagnóstica histórica de 2031 concede un derecho indefinido?');assert.deepEqual(a.supporting_claim_ids,['past-attempt']);assert.doesNotMatch(a.content,/plataformas/u);
});
test('la abstención del modelo conserva hechos curriculares como respuesta parcial, no confirma la premisa',async()=>{
 const f=fixture(),original=f.deps.generator_client;
 f.deps.generator_client={async generate(input,config){return {...await original.generate(input,config),content:'EVIDENCIA_INSUFICIENTE'};}};
 const a=await f.ask('¿Qué contenidos incluye IA de Taller?');assert.equal(a.insufficient_evidence,true);assert.match(a.content,/texto y figura/u);assert.match(a.content,/No encuentro respaldo suficiente para confirmar/u);assert.ok(a.citations.length);assert.deepEqual(a.unanswered_aspects,['academic_specific_request']);
});
test('un fallo de generación no se oculta con una respuesta extraída',async()=>{
 const f=fixture();f.deps.generator_client={async generate(){throw Error('generator_unavailable');}};await assert.rejects(f.ask('¿Qué contenidos incluye IA de Taller?'),/generator_unavailable/u);
});
test('la asignación de docente no se confunde con organización curricular ni con semestres de matrícula',async()=>{
 const f=fixture(),a=await f.ask('¿Qué docente me asignarán a IA de Taller el siguiente semestre?');assert.equal(a.insufficient_evidence,true);assert.deepEqual(a.citations,[]);assert.equal(f.calls.length,0);assert.doesNotMatch(a.content,/solicitante registra/u);
});
test('las formas irregulares de repetir conservan el aviso histórico y sus límites',async()=>{
 const f=fixture(),a=await f.ask('¿El aviso de 2031 permite que los continuos repitan indefinidamente el diagnóstico?');assert.deepEqual(a.supporting_claim_ids,['past-attempt']);assert.match(a.content,/histórica limitada/u);assert.doesNotMatch(a.content,/contiene varias opciones/u);
});
