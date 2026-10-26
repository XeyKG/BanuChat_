import assert from 'node:assert/strict';
import test from 'node:test';
import {generateOperationalPilotAnswer,retrieveIsolatedPilotChunks,pilotQueryScope,type OperationalPilotDependencies,type PilotEvidenceMetadata} from '../src/chat/ccd-operational-pilot.js';
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
test('candidate identity and retrieved release fail closed',async()=>{
 await assert.rejects(generateOperationalPilotAnswer(deps(),{release_id:'44444444-4444-4444-8444-444444444444',query:'Describe el contenido'}));
 await assert.rejects(generateOperationalPilotAnswer(deps([{...one,release_id:'44444444-4444-4444-8444-444444444444'}]),{release_id:release,query:'Describe el contenido'}));
});
test('unregistered evidence never reaches generation',async()=>{
 await assert.rejects(generateOperationalPilotAnswer(deps([{...one,document_key:'unknown'}]),{release_id:release,query:'Describe el contenido'}));
});
test('citations expose confirmation provenance and no invented artifact endpoint',async()=>{
 const r=await generateOperationalPilotAnswer(deps(),{release_id:release,query:'Describe el contenido'});
 assert.equal(r.insufficient_evidence,false);assert.match(r.citations[0]!.label,/confirmación del responsable/u);assert.equal(r.citations[0]!.artifact_url,null);
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
});
