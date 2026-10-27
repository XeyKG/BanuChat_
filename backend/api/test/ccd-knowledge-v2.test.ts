import test from 'node:test';
import assert from 'node:assert/strict';
import {ccdKnowledgeMetadata} from '../src/chat/ccd-knowledge-manifest.js';
import {asksCcdProvenance,generateCcdKnowledgeAnswer,type CcdKnowledgeDependencies} from '../src/chat/ccd-knowledge.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
const release='11111111-1111-4111-8111-111111111111',hash='b'.repeat(64);
function fixture(n=3){
 const claims=Array.from({length:n},(_,i)=>({claim_id:'REF-'+i,document_key:'ccd-knowledge-ref-'+i,title:'Referencia del curso',statement:'Contenido revisado.',topics:['general'],course:null,period:'2026',population:'Programas profesionales',conditions:[],exceptions:[],reference_status:'adopted',basis:[{kind:'DOCUMENT_SOURCE',references:[{source:'reference.md',sha256:hash,locator:'paragraph:1'}]}],presentation_units:[{key:'fact',aspects:['academic'],text:'Contenido revisado.'}],domain_metadata:{entity_type:'COURSE_OPTION',temporal_class:'CURRENT_GENERAL',current:true,source_access_class:'LOCAL_AUTHORIZED'}}));
 const items=claims.map(c=>({kind:'document',key:c.document_key,path:`documents/artifacts/${c.document_key}.md`,sha256:hash}));
 return {schema_version:'ccd-1.4.0',synthetic:false,items,files:items.map(i=>({kind:'document_artifact',path:i.path,sha256:hash})),ccd_knowledge:{schema_version:'ccd-knowledge-2',claims}};
}
test('v2 cardinality and scope projection follow the manifest, not the candidate count',()=>{
 for(const n of [1,3,91]){const m=ccdKnowledgeMetadata(fixture(n));assert.equal(m.size,n);assert.equal([...m.values()][0]!.knowledge_version,2);assert.equal([...m.values()][0]!.population,'Programas profesionales');}
 const scoped=fixture();(scoped.ccd_knowledge.claims[0]!.domain_metadata as Record<string,unknown>).unused_governance='internal';assert.equal([...ccdKnowledgeMetadata(scoped).values()][0]!.domain_metadata?.unused_governance,undefined);
 for(const mutate of [(m:ReturnType<typeof fixture>)=>{m.items.pop();},(m:ReturnType<typeof fixture>)=>{m.ccd_knowledge.claims[1]!.claim_id=m.ccd_knowledge.claims[0]!.claim_id;},(m:ReturnType<typeof fixture>)=>{m.ccd_knowledge.claims[1]!.document_key=m.ccd_knowledge.claims[0]!.document_key;},(m:ReturnType<typeof fixture>)=>{m.files[0]!.sha256='c'.repeat(64);},(m:ReturnType<typeof fixture>)=>{m.ccd_knowledge.claims[0]!.basis[0]!.kind='PENDING_CLARIFICATION';}]){const m=fixture();mutate(m);assert.throws(()=>ccdKnowledgeMetadata(m));}
});
function deps():CcdKnowledgeDependencies{
 const definitions=[
  ['first_attempt','La primera oportunidad de la prueba diagnóstica de Competencias Digitales es gratuita.'],
  ['diagnostic_options_2','El Pilar 2 permite escoger una opción disponible: Narrativas Digitales y Comunicación Estratégica; Visualización y Analítica de Datos; Gestión de la Identidad Digital y Marca Personal. No son nombres de cursos.'],
  ['diagnostic_options_3','El Pilar 3 permite escoger Inteligencia Artificial y Creatividad Generativa; Legislación y Ética Digital; Cuidado y Bienestar Digital, según disponibilidad.'],
  ['diagnostic_options_1','No tengo una lista suficientemente sustentada de las opciones diagnósticas actuales del Pilar 1.'],
  ['diagnostic_course_mapping','No tengo un mapeo uno-a-uno confirmado entre opciones diagnósticas y cursos.'],
  ['retry_limits','No. El diagnóstico actual corresponde a una sola presentación; no se contempla una segunda presentación pagada equivalente.'],
  ['cosmos_current_period','No tengo confirmado qué periodo o NRC debes seleccionar ahora. No reutilices automáticamente los intensivos de 2026-1.'],
  ['dynamic_enrollment','No tengo una próxima fecha de inscripción confirmada; consulta la información del periodo aplicable.'],
  ['contact','Puedes escribir a ccdigital@unab.edu.co, ir al bloque L piso 2 o llamar al 607 643 6111 ext. 1644.'],
  ['professional_credits','La ruta no asigna créditos en los programas profesionales; no tengo ese alcance confirmado para tecnológicos o posgrados.'],
  ['digcomp','La ruta se alinea con el Marco Europeo de Competencias Digitales (DigComp), sin versión ni certificación europea establecida.'],
  ['course_fee','El curso cuesta $362.550 COP en 2026.'],
  ['future_fee','No tengo tarifa confirmada para 2027; el dato disponible corresponde a 2026.'],
  ['catalog_two','Los cursos del Pilar 2 son Habilidades en Analítica Digital, Productividad y Marca Personal Digital y Creación de Contenidos Digitales.'],
  ['badge','Al completar los tres pilares mediante mecanismos válidos corresponde una insignia; no está confirmada la fecha exacta de entrega.'],
  ['threshold','Exactamente 70 % sí valida el pilar; el mínimo es 70 %, independientemente por pilar.'],
  ['extemporaneous_fee','El FAQ registra $245.900 para extemporánea de 2026; su aplicación actual no está confirmada y no es repetición diagnóstica.'],
  ['course_intensity','El portal indica 32 horas por curso; un syllabus puede registrar 32 directas y 64 independientes, 96 totales.'],
  ['course_modalities','Presencial, virtual o remoto son modalidades posibles, no disponibilidad simultánea garantizada.'],
  ['course_methodology','Aprendizaje basado en retos y resolución de problemas reales; no se atribuyen siglas adicionales.'],
  ['course_completed','No. Si apruebas el curso correspondiente, completas el pilar pendiente y no necesitas repetir el diagnóstico.'],
 ];
 const m=fixture(definitions.length);
 for(const [i,[aspect,text]]of definitions.entries()){
  const c=m.ccd_knowledge.claims[i]!;c.presentation_units=[{key:'fact',aspects:[aspect!],text:text!}];
  if(['first_attempt','course_fee','future_fee','extemporaneous_fee'].includes(aspect!))c.topics=['fees'];
  if(aspect==='first_attempt')c.basis[0]!.kind='DOMAIN_CONFIRMATION';
  if(aspect==='course_fee')Object.assign(c.presentation_units[0]!,{period:'2026',amount_cop:362550});
  if(aspect==='catalog_two')c.topics=['catalog'];if(aspect==='badge')c.topics=['badge'];if(aspect==='threshold')c.topics=['threshold'];
 }
 const metadata=ccdKnowledgeMetadata(m),chunks:RetrievedDocumentChunk[]=m.ccd_knowledge.claims.map((c,i)=>({chunk_id:`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`,document_version_id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`,document_id:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,document_key:c.document_key,title:c.title,ordinal:0,content:'# '+c.title+'\n\n'+c.statement,chunk_locator:'section:1',page_start:null,page_end:null,source_path:`documents/artifacts/${c.document_key}.md`,source_locator:'section:1',source_sha256:hash,release_id:release,cosine_distance:.2,cosine_similarity:.8}));
 return {sql:{async query<T>(){return {rows:[{provider:'ollama',model:'qwen3-embedding:0.6b',model_revision:hash,dimension:1024,distance_metric:'cosine',parameters:{runtime_version:'0.12.3',query:{dimensions:1024,truncate:false,input_prefix:null,normalization:'none',options:{num_ctx:4096}}}}] as T[]};}},knowledge:{release_id:release,metadata},query_embedding_client:{async embedQuery(){return [1,...Array<number>(1023).fill(0)];}},retrieve_chunks:async()=>chunks,retrieve_scoped_chunks:async(_s,_i,keys)=>chunks.filter(c=>keys.includes(c.document_key)),generator_client:{async generate(){throw new Error('Reviewed canonical rules must use retrieved evidence');}},generator_config:{provider:'ollama',model:'qwen3:4b-instruct',model_revision:hash,runtime_version:'0.12.3',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}}};
}
test('diagnostic choices preserve pillar/course separation and unknown P1',async()=>{
 for(const [question,expected]of [['¿Qué pruebas puedo hacer para el Pilar 2?','Narrativas'],['¿El Pilar 3 es una sola prueba?','Legislación'],['¿Cuál diagnóstico corresponde a Marca Personal Digital?','mapeo uno-a-uno']] as const){const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:question});assert.match(a.content,new RegExp(expected));assert.ok(a.citations.length>0);}
 const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Qué opciones diagnósticas hay en el Pilar 1?'});assert.equal(a.insufficient_evidence,true);assert.doesNotMatch(a.content,/Interacción Digital/u);
});
test('paid retries cannot leak any historical special-test amount or invitation',async()=>{
 for(const query of ['¿Puedo pagar para volver a presentar la prueba diagnóstica?','¿Puedo pagar otra prueba si pierdo la diagnóstica?','¿La segunda oportunidad diagnóstica es gratuita?']){const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query});assert.match(a.content,/No\.|una sola presentación/u);assert.doesNotMatch(a.content,/245|385|condiciones de otro intento/u);}
});
test('dynamic dates and Cosmos parameters do not inherit a past offering',async()=>{
 for(const query of ['¿Cuándo son las próximas inscripciones?','¿Qué periodo debo seleccionar ahora?']){const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query});assert.match(a.content,/No tengo/u);assert.doesNotMatch(a.content,/selecciona 2026|junio/u);}
});
test('source-scoped contact, DigComp and credits avoid unsupported promotion',async()=>{
 const c=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Dónde queda CCD y cuál es el teléfono institucional?'});assert.match(c.content,/607 643 6111 ext\. 1644/u);assert.doesNotMatch(c.content,/unab\.edo\.co|Hangouts|DOMAIN_CONFIRMATION/u);
 const d=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿La ruta usa DigComp 2.2 y no tiene créditos para tecnológicos?'});assert.match(d.content,/sin versión/u);assert.match(d.content,/no tengo ese alcance confirmado/u);assert.doesNotMatch(d.content,/DigComp 2\.2/u);
});
test('course catalog, current-year fees and future limits stay distinct from diagnosis',async()=>{
 const catalog=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuáles son los cursos del Pilar 2?'});assert.match(catalog.content,/Productividad y Marca Personal Digital/u);assert.doesNotMatch(catalog.content,/Narrativas/u);
 const fee=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuánto cuesta un curso en 2026?'});assert.match(fee.content,/362\.550.*2026/u);
 const future=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuánto cuesta un curso en 2027?'});assert.match(future.content,/No tengo tarifa/u);assert.doesNotMatch(future.content,/362[.,]?550/u);
 const extra=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuánto cuesta la prueba extemporánea?'});assert.match(extra.content,/2026/u);assert.match(extra.content,/no es repetición/u);
});
test('badge, hours, methodology and inclusive threshold retain their source limits',async()=>{
 for(const [query,pattern]of [['¿Cuándo se entrega exactamente la insignia?','no está confirmada'],['¿Son 32 o 96 horas por curso?','64 independientes'],['¿Qué modalidades tienen los cursos?','no disponibilidad simultánea'],['¿La metodología se llama ABP o PBL?','retos y resolución'],['¿Con exactamente 70 % valido el pilar?','Exactamente 70']] as const){const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query});assert.match(a.content,new RegExp(pattern));}
});
test('anaphoric approved course preserves user-established context and no retest',async()=>{
 const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'Si lo apruebo, ¿debo repetir la prueba?',history:[{role:'user',content:'¿Qué cursos del Pilar 2 puedo elegir?'},{role:'assistant',content:'Hay varias opciones.'},{role:'user',content:'¿Y cuánto cuesta uno?'},{role:'assistant',content:'Tiene tarifa de 2026.'}]});assert.match(a.content,/completas el pilar pendiente/u);assert.doesNotMatch(a.content,/segunda presentación pagada/u);
});
test('dated price follow-up retains its active course but not an unrelated earlier subject',async()=>{
 const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuánto cuesta en 2027?',history:[{role:'user',content:'¿Cuánto cuesta un curso en 2026?'},{role:'assistant',content:'El dato es de 2026.'}]});assert.match(a.content,/No tengo tarifa/u);assert.doesNotMatch(a.content,/362[.,]?550/u);
 const ambiguous=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuánto cuesta en 2027?',history:[{role:'user',content:'¿Cuánto cuesta un curso en 2026?'},{role:'assistant',content:'El dato es de 2026.'},{role:'user',content:'Ahora quiero el correo de contacto del CCD.'},{role:'assistant',content:'Consulta al CCD.'}]});assert.equal(ambiguous.insufficient_evidence,true);assert.match(ambiguous.content,/A qué curso/u);
});

test('explicit provenance is general and simple answers remain brief',async()=>{
 for(const query of ['¿De dónde sale?','¿Cuál es la fuente?','¿Qué fuente?','¿Qué documento lo dice?','¿Está documentado?','¿En qué documento aparece?','¿Qué lo respalda?','¿Cuál es el origen?','¿Esa regla está en un documento?'])assert.equal(asksCcdProvenance(query),true,query);
 const simple=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿La primera oportunidad es gratis?'});
 assert.match(simple.content,/es gratuita/u);assert.doesNotMatch(simple.content,/confirmación|fuente documental/u);
 const explicit=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿La primera oportunidad es gratis? ¿De dónde sale esa regla?'});
 assert.match(explicit.content,/es gratuita/u);assert.match(explicit.content,/confirmación de dominio/u);assert.match(explicit.content,/no tengo una fuente documental independiente/u);
 const follow=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Esa regla está en un documento?',history:[{role:'user',content:'¿La primera oportunidad es gratis?'},{role:'assistant',content:simple.content}]});
 assert.equal(follow.content,explicit.content);
 for(const a of [simple,explicit,follow])assert.doesNotMatch(a.content,/DOMAIN_CONFIRMATION|DOCUMENT_SOURCE|INFERENCE|PENDING_CLARIFICATION|REF-\d|[a-f\d]{64}|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}|[A-Z]:[\\/]|documents\/artifacts/u);
});
test('provenance follows supporting claims, including mixed and inferred evidence',async()=>{
 const d=deps();
 // Other retrieved/available rules include domain confirmation; they must not
 // change the source attribution of the documentary price actually selected.
 const documentary=await generateCcdKnowledgeAnswer(d,{release_id:release,query:'¿Cuánto cuesta un curso en 2026 y cuál es la fuente?'});
 assert.match(documentary.content,/362\.550/u);assert.match(documentary.content,/respaldada por la documentación citada/u);assert.doesNotMatch(documentary.content,/confirmación de dominio/u);
 const fee=[...d.knowledge.metadata.values()].find(m=>m.presentation_units?.some(u=>u.aspects.includes('course_fee')))!;
 fee.basis_kinds=['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION'];
 const mixed=await generateCcdKnowledgeAnswer(d,{release_id:release,query:'¿Cuánto cuesta un curso en 2026? ¿Qué lo respalda?'});
 assert.match(mixed.content,/combina documentación citada y una confirmación de dominio/u);assert.match(mixed.content,/no puedo atribuir toda la afirmación a un único documento/u);
 fee.basis_kinds=['INFERENCE'];
 const inferred=await generateCcdKnowledgeAnswer(d,{release_id:release,query:'¿Cuánto cuesta un curso en 2026? ¿Cuál es el origen?'});
 assert.match(inferred.content,/inferencia derivada/u);assert.match(inferred.content,/no una cita literal ni una regla documental/u);
 fee.basis_kinds=['DOCUMENT_SOURCE','PENDING_CLARIFICATION'];
 const pending=await generateCcdKnowledgeAnswer(d,{release_id:release,query:'¿Cuánto cuesta un curso en 2026? ¿Está documentado?'});
 assert.match(pending.content,/pendientes de aclaración no constituyen una regla confirmada/u);
});
test('source follow-ups need a safe student antecedent and respect topic switches',async()=>{
 for(const history of [[],[{role:'assistant' as const,content:'La primera oportunidad es gratis.'}],[{role:'user' as const,content:'¿La primera oportunidad es gratis?'},{role:'assistant' as const,content:'Es gratuita.'},{role:'user' as const,content:'Ahora quiero saber sobre salarios.'}]]){
  const a=await generateCcdKnowledgeAnswer(deps(),{release_id:release,query:'¿Cuál es la fuente?',history});assert.equal(a.insufficient_evidence,true);assert.doesNotMatch(a.content,/es gratuita|confirmación de dominio/u);
 }
});

test('generated source attribution uses only its grounded support and checks visible leakage',async()=>{
 const d=deps();for(const m of d.knowledge.metadata.values()){m.course='Ejemplo Digital';m.topics=['academic'];}
 let content='Una descripción del contenido.',seenPrompt='';
 d.generator_client={async generate(input){seenPrompt=input.system_prompt;assert.match(input.user_prompt,/Alcance de procedencia:/u);return {content:content+'\nFUENTES: [2]',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}};
 const question='¿Qué temas tiene Ejemplo Digital? ¿Cuál es la fuente?';
 const a=await generateCcdKnowledgeAnswer(d,{release_id:release,query:question});
 assert.equal(a.pilot_strategy,'grounded_synthesis');assert.ok(a.retrieved_claim_ids!.length>a.supporting_claim_ids!.length);
 assert.match(a.content,/respaldada por la documentación citada/u);assert.doesNotMatch(a.content,/confirmación de dominio/u);assert.match(seenPrompt,/normalmente no las expliques/u);assert.match(seenPrompt,/Si se pide explícitamente/u);
 for(const leak of ['DOMAIN_CONFIRMATION','REF-1',hash,release,'C:\\private\\file.md','documents/artifacts/private.md']){content=leak;const rejected=await generateCcdKnowledgeAnswer(d,{release_id:release,query:question});assert.equal(rejected.insufficient_evidence,true,leak);assert.doesNotMatch(rejected.content,/REF-1|DOMAIN_CONFIRMATION|private/u);}
});
