import assert from 'node:assert/strict';
import test from 'node:test';
import {generateOperationalPilotAnswer,retrieveIsolatedPilotChunks,pilotQueryScope,studentText,type OperationalPilotDependencies,type PilotEvidenceMetadata} from '../src/chat/ccd-operational-pilot.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
const release='11111111-1111-4111-8111-111111111111';
const config={provider:'ollama' as const,model:'qwen3:4b-instruct' as const,model_revision:'a'.repeat(64),runtime_version:'0.12.3',recipe:{think:false as const,stream:false as const,options:{temperature:0 as const,num_predict:256 as const},keep_alive:'5m' as const}};
function chunk(key:string,id:string):RetrievedDocumentChunk{return {chunk_id:id,document_version_id:id,document_id:id,document_key:key,title:key,ordinal:0,content:`# ${key}\n\nContenido académico acotado de ${key}.\n\nPERIODO: edición entregada`,chunk_locator:'claim:'+key,page_start:null,page_end:null,source_path:`documents/${key}.md`,source_locator:'claim:'+key,source_sha256:'b'.repeat(64),release_id:release,cosine_distance:0.2,cosine_similarity:0.8};}
const one=chunk('alpha','22222222-2222-4222-8222-222222222222'),two=chunk('beta','33333333-3333-4333-8333-333333333333');
const meta=(course:string|null=null):PilotEvidenceMetadata=>({claim_id:'example',topics:['academic','contact'],course,basis_kinds:['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION'],period:'Working scope',isolated_evaluation_allowed:true});
function deps(chunks=[one],output='Una afirmación acotada.\nFUENTES: [1]'):OperationalPilotDependencies{return {
 sql:{async query<T>(){return {rows:[{provider:'ollama',model:'qwen3-embedding:0.6b',model_revision:'c'.repeat(64),dimension:1024,distance_metric:'cosine',parameters:{runtime_version:'0.12.3',query:{dimensions:1024,truncate:false,input_prefix:null,normalization:'none',options:{num_ctx:4096}}}}] as T[]};}},
 query_embedding_client:{async embedQuery(){return [1,...Array<number>(1023).fill(0)];}},retrieve_chunks:async()=>chunks,generator_config:config,
 generator_client:{async generate(){return {content:output,done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}},pilot:{release_id:release,metadata:new Map([['alpha',meta()],['beta',meta()]])}};}
test('explicit badge intent outranks generic completion, including F-12',async()=>{
 const d=deps([one,two]);
 d.pilot.metadata=new Map([
  ['alpha',{...meta(),claim_id:'OP-003',topics:['completion'],presentation_units:[{key:'completion',aspects:['completion'],text:'Los pilares pendientes se completan mediante cursos.'}]}],
  ['beta',{...meta(),claim_id:'OP-004',topics:['completion','badge'],presentation_units:[{key:'badge',aspects:['badge'],text:'Al completar los tres pilares recibes una insignia digital. No se ha precisado la fecha de entrega.'}]}],
 ]);
 for(const query of ['¿Qué reconocimiento recibo al completar los tres pilares?','Si ya terminé la ruta, ¿qué insignia recibo?','¿Qué recibo al finalizar los pilares?','¿Qué certificado recibo al completar los pilares de la ruta?']){
  const r=await generateOperationalPilotAnswer(d,{release_id:release,query});
  assert.deepEqual(r.supporting_claim_ids,['OP-004']);assert.deepEqual(r.presentation_units,[{claim_id:'OP-004',key:'badge'}]);
  assert.match(r.content,/insignia digital/u);assert.match(r.content,/fecha de entrega/u);assert.doesNotMatch(r.content,/pendientes se completan/u);
 }
});
test('conditional completion adapts counts without asserting an institutional record',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',{...meta(),topics:['completion'],presentation_units:[
  {key:'generic',aspects:['completion'],text:'Completa los pilares pendientes según sus cursos.'},
  {key:'all',aspects:['all_completed'],text:'No. Si aprobaste las tres, no necesitas cursos para completar esos pilares.'},
  {key:'one',aspects:['one_pending'],text:'Si aprobaste dos y perdiste una, completa solo ese pilar; conserva los otros dos.'},
  {key:'named',aspects:['two_pending_named'],text:'Si validaste {validated_pillar}, completa los otros dos; no repitas el ya validado.'},
 ]}]]);
 const all=await generateOperationalPilotAnswer(d,{release_id:release,query:'Si aprobé las tres pruebas, ¿debo hacer cursos?'});assert.match(all.content,/^No\./u);
 const onePending=await generateOperationalPilotAnswer(d,{release_id:release,query:'Aprobé dos pruebas y perdí una, ¿qué hago?'});assert.match(onePending.content,/solo ese pilar/u);
 const named=await generateOperationalPilotAnswer(d,{release_id:release,query:'Validé Competencias Digitales Básicas, pero no los otros dos pilares. ¿Qué hago?'});assert.match(named.content,/Si validaste Competencias Digitales Básicas/u);assert.equal(named.presentation_bindings?.validated_pillar,'Competencias Digitales Básicas');
 const denied=await generateOperationalPilotAnswer(d,{release_id:release,query:'No aprobé las tres pruebas. ¿Qué hago?'});assert.doesNotMatch(denied.content,/no necesitas cursos/u);
});
test('a specified extraordinary comparison omits unrelated fees and compares sourced amounts',async()=>{
 const d=deps([one,two]);d.pilot.metadata=new Map([
  ['alpha',{...meta(),topics:['fees'],presentation_units:[{key:'first',aspects:['first_attempt'],amount_cop:0,text:'La primera oportunidad es gratuita.'}]}],
  ['beta',{...meta(),topics:['fees'],presentation_units:[{key:'extra',aspects:['extraordinary_fee'],amount_cop:100,text:'La extraordinaria cuesta $100 solo para planes antiguos; periodo sin indicar.'},{key:'other',aspects:['extemporaneous_fee'],amount_cop:50,period:'2026',text:'La extemporánea cuesta $50 en 2026.'}]}],
 ]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿La primera prueba y la extraordinaria cuestan lo mismo?'});assert.match(r.content,/^No\./u);assert.match(r.content,/solo para planes antiguos/u);assert.doesNotMatch(r.content,/extemporánea|\$50/u);assert.equal(r.citation_records.length,2);
});
test('a question about cost-free repetition asks for entitlement, not a tariff menu',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',{...meta(),topics:['fees','diagnostic','retry_limits'],presentation_units:[{key:'menu',aspects:['additional_fee'],text:'¿Qué concepto de prueba necesitas consultar?'},{key:'limits',aspects:['retry_limits'],text:'La primera oportunidad gratuita no garantiza repeticiones gratuitas.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Está garantizado repetir la prueba sin costo?'});assert.deepEqual(r.presentation_units,[{claim_id:'example',key:'limits'}]);assert.doesNotMatch(r.content,/Qué concepto/u);
});
test('a transition payment follow-up is not silently treated as course tuition',async()=>{
 const d=deps([one,two]);d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'first',topics:['fees'],presentation_units:[{key:'first',aspects:['transition_first'],text:'La primera presentación nueva aplicable es gratuita; el CCD determina cuáles pruebas corresponden.'},{key:'limits',aspects:['fee_limits'],text:'Esto no hace gratuitos todos los cursos ni repeticiones.'}]}],['beta',{...meta(),claim_id:'tuition',topics:['fees'],presentation_units:[{key:'course',aspects:['course_fee'],text:'La matrícula del curso tiene un precio.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Eso significa que no tengo que pagar nada?',history:[{role:'user',content:'Aprobé cursos antiguos de Informática. ¿Qué pasa en la transición?'}]});
 assert.match(r.content,/primera presentación nueva/u);assert.doesNotMatch(r.content,/matrícula del curso tiene/u);
});
test('who teaches the next semester is a teacher-availability question',async()=>{
 const r=await generateOperationalPilotAnswer(deps(),{release_id:release,query:'¿Quién lo dicta el próximo semestre?'});assert.equal(r.insufficient_evidence,true);assert.match(r.content,/profesores estarán asignados/u);assert.doesNotMatch(r.content,/El catálogo/u);
});
test('a literal historical row request does not select old-test background instead',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',{...meta(),topics:['transition','history'],presentation_units:[{key:'old',aspects:['old_tests'],text:'Hubo pruebas anteriores.'},{key:'row',aspects:['equivalence_two'],text:'Curso A y Curso B | Pilar 2. Tabla de cursos, no reconocimiento personal.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Cita literalmente la fila histórica de Word y PowerPoint.'});assert.match(r.content,/Curso A y Curso B \| Pilar 2/u);assert.doesNotMatch(r.content,/Hubo pruebas/u);
});
test('content comparisons prefer content evidence over a higher-ranked competency package',async()=>{
 const third=chunk('alpha-content','44444444-4444-4444-8444-444444444444');const d=deps([one,two,third]);
 const marked=(course:string,id:string,role:string):PilotEvidenceMetadata=>({...meta(course),claim_id:id,topics:['academic'],presentation_units:[{key:'kind',aspects:[role],text:'Reviewed academic fact.'}]});
 d.pilot.metadata=new Map([['alpha',marked('Curso Alpha','A-competencies','academic_competencies')],['beta',marked('Curso Beta','B-content','academic_contents')],['alpha-content',marked('Curso Alpha','A-content','academic_contents')]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Compara los contenidos de Curso Alpha y Curso Beta'});assert.deepEqual(r.supporting_claim_ids,['A-content','B-content']);
});
test('candidate identity and retrieved release fail closed',async()=>{
 await assert.rejects(generateOperationalPilotAnswer(deps(),{release_id:'44444444-4444-4444-8444-444444444444',query:'Describe el contenido'}));
 await assert.rejects(generateOperationalPilotAnswer(deps([{...one,release_id:'44444444-4444-4444-8444-444444444444'}]),{release_id:release,query:'Describe el contenido'}));
});
test('unregistered evidence never reaches generation',async()=>{
 await assert.rejects(generateOperationalPilotAnswer(deps([{...one,document_key:'unknown'}]),{release_id:release,query:'Describe el contenido'}));
});
test('citations expose confirmation provenance and no invented artifact endpoint',async()=>{
 const r=await generateOperationalPilotAnswer(deps(),{release_id:release,query:'Describe el contenido'});
 assert.equal(r.insufficient_evidence,false);assert.doesNotMatch(r.citations[0]!.label,/confirmación del responsable/u);assert.ok(r.supporting_evidence?.[0]?.basis_kinds.includes('DOMAIN_CONFIRMATION'));assert.equal(r.citations[0]!.artifact_url,null);
});
test('student formatting keeps dates natural and rejects internal identifiers without deleting metadata',()=>{
 assert.equal(studentText('La convocatoria descrita es 202660.'),'La convocatoria descrita es 2026-2.');
 for(const value of ['OP-012','KC-001','MD-038','DOCUMENT_SOURCE','DOMAIN_CONFIRMATION','INFERENCE','a'.repeat(64),'operational-c-conversation-v1','para el piloto'])assert.equal(studentText(value),null);
 assert.equal(studentText('El curso cuesta $100 para 2026; otros periodos deben confirmarse.'),'El curso cuesta $100 para 2026; otros periodos deben confirmarse.');
});
test('a purpose-only question does not automatically add threshold or course rules',async()=>{
 const third=chunk('gamma','44444444-4444-4444-8444-444444444444');const d=deps([one,two,third]);
 d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'purpose-fact',topics:['purpose','diagnostic'],period:'202660',presentation_units:[{key:'purpose',aspects:['purpose'],text:'Identifica tus habilidades y orienta tu formación.'}]}],['beta',{...meta(),claim_id:'threshold-fact',topics:['threshold'],presentation_units:[{key:'threshold',aspects:['threshold'],text:'El mínimo es 70 % por pilar.'}]}],['gamma',{...meta(),claim_id:'completion-fact',topics:['completion'],presentation_units:[{key:'completion',aspects:['completion'],text:'Puedes completar lo pendiente aprobando el curso correspondiente.'}]}]]);
 d.generator_client={async generate(){throw new Error('Reviewed facts need no invented rewrite');}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Cuál es la finalidad del diagnóstico?'});
 assert.match(r.content,/Identifica tus habilidades/u);assert.doesNotMatch(r.content,/70 %|curso correspondiente/u);
 assert.doesNotMatch(r.content,/202660|Referencia|responsable|piloto/u);assert.equal(r.supporting_evidence?.find(e=>e.claim_id==='purpose-fact')?.period,'202660');assert.equal(r.citation_records.length,1);
});
test('progressive fees answer first opportunity alone and a loss follow-up changes aspect',async()=>{
 const third=chunk('gamma','44444444-4444-4444-8444-444444444444');const d=deps([one,two,third]);
 d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'first',topics:['fees','diagnostic'],presentation_units:[{key:'first',aspects:['first_attempt'],text:'La primera oportunidad es gratuita.'}]}],['beta',{...meta(),claim_id:'other',topics:['fees'],presentation_units:[{key:'other',aspects:['additional_fee'],text:'La prueba especial tiene tarifa propia para la población indicada en 2026.'}]}],['gamma',{...meta(),claim_id:'completion',topics:['completion'],presentation_units:[{key:'completion',aspects:['completion'],text:'Completa solo los pilares pendientes mediante cursos; los aprobados no se repiten.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿La prueba es gratis?'});assert.equal(r.content,'La primera oportunidad es gratuita.');assert.deepEqual(r.supporting_claim_ids,['first']);
 const next=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Y si la pierdo?',history:[{role:'user',content:'¿La prueba es gratis?'},{role:'assistant',content:r.content}]});
 assert.match(next.content,/solo los pilares pendientes/u);assert.doesNotMatch(next.content,/tarifa|gratuita/u);assert.deepEqual(next.supporting_claim_ids,['completion']);
});
test('natural presentation preserves financial scope, population and period as a whole fact',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',{...meta(),topics:['fees'],presentation_units:[{key:'price',aspects:['extraordinary_fee'],amount_cop:100,text:'La extraordinaria cuesta $100 solo para planes antiguos; no tiene periodo indicado. Confirma su aplicación con el CCD.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Cuánto cuesta otra prueba extraordinaria?'});
 assert.match(r.content,/solo para planes antiguos/u);assert.match(r.content,/no tiene periodo indicado/u);assert.match(r.content,/Confirma/u);
});
test('an old-test approval question never substitutes a course-transition fact',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',{...meta(),topics:['transition','history'],presentation_units:[{key:'course',aspects:['transition'],text:'Los cursos aprobados pueden ser revisados.'},{key:'test',aspects:['old_tests'],text:'Las pruebas antiguas pendientes no se validan por sí solas; debes validar los instrumentos nuevos que correspondan.'}]}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Una prueba antigua pendiente se da por aprobada automáticamente?'});
 assert.match(r.content,/instrumentos nuevos/u);assert.doesNotMatch(r.content,/Los cursos aprobados/u);
 assert.equal(studentText('Autoría responsable y ética digital.'),'Autoría responsable y ética digital.');
});
test('hallucinated contact or unsupported citation is rejected',async()=>{
 for(const output of ['Escribe a persona@example.invalid.\nFUENTES: [1]','Afirmación.\nFUENTES: [8]'])assert.equal((await generateOperationalPilotAnswer(deps([one],output),{release_id:release,query:'Describe el contenido'})).insufficient_evidence,true);
});
test('source-separated comparison retains both requested courses',async()=>{
 const d=deps([one,two]);d.pilot.metadata=new Map([['alpha',meta('Curso Alpha')],['beta',meta('Curso Beta')]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Compara contenidos de Curso Alpha y Curso Beta'});assert.equal(r.insufficient_evidence,false);assert.equal(r.citation_records.length,2);assert.match(r.content,/de alpha/u);assert.match(r.content,/de beta/u);
});
test('a missing comparison source is never silently filled',async()=>{
 const d=deps([one]);d.pilot.metadata=new Map([['alpha',meta('Curso Alpha')],['beta',meta('Curso Beta')]]);
 assert.equal((await generateOperationalPilotAnswer(d,{release_id:release,query:'Compara contenidos de Curso Alpha y Curso Beta'})).insufficient_evidence,true);
});
test('unavailable individual group data does not call generator',async()=>{
 const d=deps();d.generator_client={async generate(){throw new Error('must not generate');}};
 assert.equal((await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Qué profesores dictan los cursos el próximo semestre?'})).insufficient_evidence,true);
});
test('sensitive rule answers quote retrieved evidence without a question-answer lookup',async()=>{
 const d=deps([{...one,content:'# Regla revisada\n\nUn hecho acotado con su excepción.\n\nPERIODO: edición entregada'}]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['threshold']}]]);
 d.generator_client={async generate(input){assert.match(input.system_prompt,/CLASIFICACIÓN DE RESPONDIBILIDAD/u);return {content:'RESPONDIBLE',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Qué umbral describe la evidencia?'});
 assert.equal(r.pilot_strategy,'scoped_extract');assert.match(r.content,/Un hecho acotado con su excepción/u);assert.equal(r.citation_records.length,1);
});
test('personal-record requests stop before query embeddings',async()=>{
 const d=deps();d.query_embedding_client={async embedQuery(){throw new Error('must not retrieve a personal record');}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Cuál es mi nota en el expediente?'});assert.equal(r.insufficient_evidence,true);assert.equal(r.citations.length,0);
});
test('scoped SQL retrieval rejects a product database before reading chunks',async()=>{
 let calls=0;
 await assert.rejects(retrieveIsolatedPilotChunks({async query<T>(){calls++;return {rows:[{name:'banuchat_unified',marker:true}] as T[]};}},{release_id:release,query_embedding:[1,...Array<number>(1023).fill(0)],top_k:5},['alpha']));
 assert.equal(calls,1);
});
test('an explicitly identified pillar supplies its own antecedent',async()=>{
 const d=deps([{...one,content:'# Catálogo\n\nOpciones documentadas del pilar identificado.\n\nPERIODO: edición'}]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['catalog']}]]);
 d.generator_client={async generate(){return {content:'RESPONDIBLE',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Tengo pendiente el segundo pilar, ¿qué cursos puedo elegir?'});assert.equal(r.insufficient_evidence,false);
});
test('documented spelling aliases preserve subject and test duration does not select course hours',()=>{
 const metadata=new Map([['alpha',meta('Curso Digital')]]);
 assert.deepEqual(pilotQueryScope('Temas de Curso Dijital',metadata).courses,['Curso Digital']);
 const scope=pilotQueryScope('Duración de la prueva diagnóstica',metadata);assert.ok(scope.topics.includes('diagnostic'));assert.ok(!scope.topics.includes('hours'));
 assert.ok(pilotQueryScope('cuales son los pilare de competencias dijitales',metadata).topics.includes('structure'));
});
test('purpose and antecedent intents do not collapse into structure',()=>{
 const metadata=new Map([['alpha',meta()]]);
 assert.ok(pilotQueryScope('¿Para qué sirve la prueba diagnóstica?',metadata).topics.includes('purpose'));
 assert.ok(pilotQueryScope('¿Qué antecedentes se deben comprobar en la transición?',metadata).topics.includes('antecedents'));
 assert.deepEqual(pilotQueryScope('¿Qué describe la guía sobre comprobar un periodo?',metadata).topics,['procedure']);
 for(const word of ['pago','gratuidad','precio','cobros'])assert.ok(pilotQueryScope(`Transición y ${word}`,metadata).topics.includes('fees'));
 assert.ok(pilotQueryScope('¿Cómo está organizada la ruta?',metadata).topics.includes('structure'));
 assert.ok(pilotQueryScope('Diagnóstico frente a homologación histórica',metadata).topics.includes('purpose'));
 assert.ok(!pilotQueryScope('¿Estoy exento de una asignatura por mis estudios?',metadata).topics.includes('fees'));
});
test('a named financial subject is answerable without an ordinal antecedent',async()=>{
 const d=deps([{...one,content:'# Tarifas\n\nLa primera prueba no tiene precio determinado; no se confunde con la extraordinaria.\n\nPERIODO: referencia'}]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['fees']}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿La primera prueba tiene el mismo precio que la extraordinaria?'});
 assert.equal(r.insufficient_evidence,false);assert.match(r.content,/no tiene precio determinado/u);
 const ambiguous=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Y cuánto cuesta?'});assert.equal(ambiguous.insufficient_evidence,true);
});
test('a named historical plan supplies its own subject without a previous message',async()=>{
 const d=deps([{...one,content:'# Antecedentes\n\nRevisar plan, códigos y registro, sin reconocer un pilar individual.\n\nPERIODO: referencia'}]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['transition','history','antecedents']}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Qué deben comprobar antes de reconocer cursos de un plan anterior de Informática?'});
 assert.equal(r.insufficient_evidence,false);assert.match(r.content,/plan, códigos y registro/u);
});
test('a descriptive course query does not select an unrelated hours package',async()=>{
 const d=deps([one,two],'Descripción de la primera fuente.\nFUENTES: [1]');
 d.pilot.metadata=new Map([['alpha',{...meta('Curso Alpha'),claim_id:'description',topics:['academic']}],['beta',{...meta('Curso Alpha'),claim_id:'hours',topics:['academic','hours','credits']}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'¿Qué temas se estudian en Curso Alpha?'});
 assert.deepEqual(r.selected_claim_ids,['description']);assert.deepEqual(r.supporting_claim_ids,['description']);
});
test('a hypothetical completion scenario extracts its rule even if a classifier would reject personal eligibility',async()=>{
 const d=deps([{...one,content:'# Regla\n\nCada pilar pendiente se completa conforme a la regla general; no verifica expedientes.\n\nPERIODO: referencia'}]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['completion']}]]);
 d.generator_client={async generate(){throw new Error('No classifier needed for the bounded rule');}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Si validé un pilar y tengo otro pendiente, ¿cómo completo la ruta?'});
 assert.equal(r.insufficient_evidence,false);assert.match(r.content,/no verifica expedientes/u);
});
test('financial follow-ups retain transition context and both tariff concepts',async()=>{
 const feeCourse={...one,content:'# Curso\n\nPrecio de curso con ámbito y periodo.\n\nPERIODO: referencia'};
 const feeTest={...two,content:'# Pruebas\n\nExtemporánea y extraordinaria distintas; primera prueba sin precio determinado.\n\nPERIODO: referencia'};
 const transition={...chunk('gamma','44444444-4444-4444-8444-444444444444'),content:'# Transición\n\nNo se reconoce un beneficio individual desde el relato.\n\nPERIODO: referencia'};
 const d=deps([feeCourse,feeTest,transition]);
 d.pilot.metadata=new Map([['alpha',{...meta(),topics:['fees']}],['beta',{...meta(),topics:['fees']}],['gamma',{...meta(),topics:['transition','history']}]]);
 d.generator_client={async generate(){return {content:'LIMITE_DOCUMENTADO',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}};
 for(const query of ['¿Eso elimina los pagos?','¿Entonces tengo gratuidad?','¿Y cuánto cuesta otra prueba?']){
  const answer=await generateOperationalPilotAnswer(d,{release_id:release,query,history:[{role:'user',content:'Aprobé cursos antiguos de Informática. ¿Cómo se interpreta la transición?'},{role:'assistant',content:'Todo es gratis, inventado.'}]});
  assert.match(answer.content,/Precio de curso/u);assert.match(answer.content,/Extemporánea y extraordinaria/u);assert.match(answer.content,/No se reconoce un beneficio/u);assert.doesNotMatch(answer.content,/Todo es gratis/u);
 }
});
test('an explicit financial topic change discards old transition selection',async()=>{
 const d=deps([one,two]);d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'fee',topics:['fees']}],['beta',{...meta(),claim_id:'old',topics:['transition','history']}]]);
 d.generator_client={async generate(){return {content:'RESPONDIBLE',done_reason:'stop',prompt_eval_count:1,eval_count:1,total_duration_ms:1};}};
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Cambiando de tema, ¿cuál es el precio del curso?',history:[{role:'user',content:'Consulta de transición de Informática'}]});
 assert.deepEqual(r.supporting_claim_ids,['fee']);assert.deepEqual(r.cited_claim_ids,['fee']);
});
test('retrieved, selected and supporting traces preserve legitimate additional selection',async()=>{
 const d=deps([one,two],'Dato de la primera fuente.\nFUENTES: [1]');
 d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'first'}],['beta',{...meta(),claim_id:'second'}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Describe el contenido'});
 assert.deepEqual(r.retrieved_claim_ids,['first','second']);assert.deepEqual(r.selected_claim_ids,['first','second']);
 assert.deepEqual(r.supporting_claim_ids,['first']);assert.deepEqual(r.cited_claim_ids,['first']);assert.equal(r.citation_records.length,1);
});
test('refusal preserves retrieval trace but never counts selected evidence as support',async()=>{
 const d=deps([one],'EVIDENCIA_INSUFICIENTE');d.pilot.metadata=new Map([['alpha',{...meta(),claim_id:'retrieved'}]]);
 const r=await generateOperationalPilotAnswer(d,{release_id:release,query:'Describe el contenido'});
 assert.deepEqual(r.retrieved_claim_ids,['retrieved']);assert.deepEqual(r.selected_claim_ids,['retrieved']);assert.deepEqual(r.supporting_claim_ids,[]);assert.deepEqual(r.cited_claim_ids,[]);
});
