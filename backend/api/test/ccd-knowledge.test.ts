import test from 'node:test';
import assert from 'node:assert/strict';
import {ccdKnowledgeMetadata} from '../src/chat/ccd-knowledge-manifest.js';
import {assertCcdKnowledgeReads} from '../src/application/ccd-knowledge-retrieval.js';
import {generateCcdKnowledgeAnswer,type CcdKnowledgeDependencies,type CcdKnowledgeEvidenceMetadata} from '../src/chat/ccd-knowledge.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
function manifest(){
 const claims=Array.from({length:87},(_,i)=>({claim_id:'T-'+i,document_key:'ccd-knowledge-'+i,topics:['academic'],course:null,period:'2026',reference_status:'adopted',basis:[{kind:'DOCUMENT_SOURCE',references:[{source:'fixture',sha256:'a'.repeat(64),locator:'section:1'}]}],presentation_units:[{key:'fact',aspects:['academic'],text:'Source-backed fixture statement.'}]}));
 return {schema_version:'ccd-1.3.0',synthetic:false,items:claims.map(c=>({kind:'document',key:c.document_key})),ccd_knowledge:{schema_version:'ccd-knowledge-1',claims}};
}
test('normal CCD metadata adopts references without an experimental admission flag',()=>{
 const input=manifest(),metadata=ccdKnowledgeMetadata(input);assert.equal(metadata.size,87);assert.equal(metadata.get('ccd-knowledge-0')?.reference_status,'adopted');assert.ok(!JSON.stringify(input).includes('isolated_evaluation_allowed'));
});
test('unknown, duplicate, pending-only and experimental-only claims fail closed',()=>{
 const missing=manifest();(missing.ccd_knowledge.claims[0] as unknown as Record<string,unknown>).reference_status=undefined;assert.throws(()=>ccdKnowledgeMetadata(missing));
 const duplicate=manifest();duplicate.ccd_knowledge.claims[0]!.claim_id=duplicate.ccd_knowledge.claims[1]!.claim_id;assert.throws(()=>ccdKnowledgeMetadata(duplicate));
 const pending=manifest();pending.ccd_knowledge.claims[0]!.basis[0]!.kind='PENDING_CLARIFICATION';assert.throws(()=>ccdKnowledgeMetadata(pending));
 const old=manifest();old.schema_version='ccd-isolated-pilot-1';assert.throws(()=>ccdKnowledgeMetadata(old));
});
test('normal scoped retrieval requires the hardened read surface before accepting database rows',async()=>{
 for(const safe of [false,undefined])await assert.rejects(assertCcdKnowledgeReads({async query<T>(){return {rows:[{safe}] as T[]};}}));
 await assertCcdKnowledgeReads({async query<T>(){return {rows:[{safe:true}] as T[]};}});
});

const release='11111111-1111-4111-8111-111111111111';
function financialKnowledge():CcdKnowledgeDependencies {
 const definitions:Array<{key:string;topics:string[];basis:CcdKnowledgeEvidenceMetadata['basis_kinds'];units:NonNullable<CcdKnowledgeEvidenceMetadata['presentation_units']>}>= [
  {key:'first-opportunity',topics:['diagnostic','fees'],basis:['DOMAIN_CONFIRMATION'],units:[{key:'first',aspects:['first_attempt'],text:'La primera oportunidad de la prueba diagnóstica es gratuita.'}]},
  {key:'other-attempt',topics:['diagnostic','fees','retry_limits'],basis:['DOCUMENT_SOURCE'],units:[{key:'additional',aspects:['additional_fee'],text:'Otro intento requiere consultar el tipo de prueba y sus condiciones.'},{key:'retry',aspects:['retry_limits'],text:'La primera oportunidad gratuita no significa repeticiones gratuitas ni intentos ilimitados.'},{key:'limits',aspects:['fee_limits'],text:'La primera oportunidad no vuelve gratuitos todos los intentos.'},{key:'extra',aspects:['extraordinary_fee'],text:'La extraordinaria tiene tarifa propia para planes antiguos; confirma su aplicación.'},{key:'extemp',aspects:['extemporaneous_fee'],text:'La extemporánea tiene una tarifa propia para el periodo indicado.'}]},
  {key:'course-price',topics:['fees'],basis:['DOCUMENT_SOURCE'],units:[{key:'course',aspects:['course_fee'],text:'El curso tiene un precio de matrícula.'}]},
  {key:'diagnostic-purpose',topics:['diagnostic','purpose'],basis:['DOCUMENT_SOURCE'],units:[{key:'purpose',aspects:['purpose'],text:'La prueba diagnóstica identifica competencias y orienta la formación.'}]},
 ];
 const metadata=new Map<string,CcdKnowledgeEvidenceMetadata>(definitions.map(d=>[d.key,{claim_id:d.key,topics:d.topics,course:null,basis_kinds:d.basis,period:'fixture',reference_status:'adopted',presentation_units:d.units}]));
 const chunks:RetrievedDocumentChunk[]=definitions.map((d,i)=>({chunk_id:`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`,document_version_id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`,document_id:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,document_key:d.key,title:'Información de pruebas y formación',ordinal:0,content:`# Referencia\n\n${d.units[0]!.text}\n\nPERIODO: fixture`,chunk_locator:'section:1',page_start:null,page_end:null,source_path:`documents/${d.key}.md`,source_locator:'section:1',source_sha256:'b'.repeat(64),release_id:release,cosine_distance:0.2,cosine_similarity:0.8}));
 return {
  sql:{async query<T>(){return {rows:[{provider:'ollama',model:'qwen3-embedding:0.6b',model_revision:'c'.repeat(64),dimension:1024,distance_metric:'cosine',parameters:{runtime_version:'0.12.3',query:{dimensions:1024,truncate:false,input_prefix:null,normalization:'none',options:{num_ctx:4096}}}}] as T[]};}},
  query_embedding_client:{async embedQuery(){return [1,...Array<number>(1023).fill(0)];}},retrieve_chunks:async()=>chunks,
  generator_config:{provider:'ollama',model:'qwen3:4b-instruct',model_revision:'a'.repeat(64),runtime_version:'0.12.3',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}},
  generator_client:{async generate(){throw new Error('Financial extraction must not need generated rules');}},knowledge:{release_id:release,metadata},
 };
}

test('standalone diagnostic first-opportunity fees resolve without an antecedent and preserve provenance',async()=>{
 const deps=financialKnowledge();
 for(const query of ['¿La primera oportunidad diagnóstica es gratuita?','¿La primera prueba diagnóstica tiene costo?','¿Cobran la prueba diagnóstica la primera vez?','¿La primera oportunidad de las pruebas diagnósticas es gratis?','¿Cuál es el precio de la primera oportunidad diagnóstica?','¿Qué tarifa tiene la primera oportunidad diagnóstica?']){
  const answer=await generateCcdKnowledgeAnswer(deps,{release_id:release,query});
  assert.equal(answer.insufficient_evidence,false,query);assert.doesNotMatch(answer.content,/¿A qué curso, prueba o procedimiento te refieres/u);
  assert.match(answer.content,/primera oportunidad.*diagnóstica.*gratuita/u);assert.deepEqual(answer.supporting_claim_ids,['first-opportunity']);assert.deepEqual(answer.cited_claim_ids,['first-opportunity']);
  assert.equal(answer.citations.length,1);assert.equal(answer.citations[0]!.source_kind,'document');assert.equal(answer.citation_records[0]!.source_sha256,'b'.repeat(64));
  assert.deepEqual(answer.supporting_evidence?.[0]?.basis_kinds,['DOMAIN_CONFIRMATION']);
  assert.doesNotMatch(answer.content,/DOMAIN_CONFIRMATION|DOCUMENT_SOURCE|first-opportunity|[a-f0-9]{64}|documents\//u);
 }
});

test('diagnostic fees do not make second attempts, repetitions or special tests universally free',async()=>{
 for(const query of ['¿La segunda oportunidad diagnóstica es gratuita?','¿Puedo repetir gratis la prueba diagnóstica?','¿Todos los intentos son gratuitos?','¿La prueba extraordinaria es gratis?','¿La prueba extemporánea es gratis?']){
  const answer=await generateCcdKnowledgeAnswer(financialKnowledge(),{release_id:release,query});
  if(answer.insufficient_evidence){assert.equal(answer.citations.length,0);continue;}
  assert.match(answer.content,/condiciones|no significa|no vuelve|tarifa/u,query);
  assert.ok(!answer.supporting_claim_ids?.includes('first-opportunity'),query);
 }
});

test('fees alone and an unanchored first-time follow-up still require clarification',async()=>{
 for(const query of ['¿Es gratis?','¿Cuánto cuesta?','¿Y la primera vez?']){
  const answer=await generateCcdKnowledgeAnswer(financialKnowledge(),{release_id:release,query});
  assert.equal(answer.insufficient_evidence,true);assert.match(answer.content,/¿A qué curso, prueba o procedimiento te refieres/u);assert.deepEqual(answer.citations,[]);
 }
});

test('diagnostic context supports a fee follow-up; a course antecedent cannot establish an opportunity benefit',async()=>{
 const deps=financialKnowledge(),query='¿Y la primera oportunidad es gratuita?';
 const first=await generateCcdKnowledgeAnswer(deps,{release_id:release,query:'¿Para qué sirven las pruebas diagnósticas?'});
 const diagnostic=await generateCcdKnowledgeAnswer(deps,{release_id:release,query,history:[{role:'user',content:'¿Para qué sirven las pruebas diagnósticas?'},{role:'assistant',content:first.content}]});
 assert.deepEqual(diagnostic.supporting_claim_ids,['first-opportunity']);assert.match(diagnostic.content,/primera oportunidad.*gratuita/u);
 const history=[{role:'user' as const,content:'¿Cuánto cuesta un curso?'},{role:'assistant' as const,content:'El curso tiene un precio de matrícula.'}];
 const ambiguous=await generateCcdKnowledgeAnswer(deps,{release_id:release,query,history});assert.equal(ambiguous.insufficient_evidence,true);assert.deepEqual(ambiguous.citations,[]);
 const explicit=await generateCcdKnowledgeAnswer(deps,{release_id:release,query:'¿La primera oportunidad diagnóstica es gratuita?',history});assert.deepEqual(explicit.supporting_claim_ids,['first-opportunity']);assert.doesNotMatch(explicit.content,/matrícula/u);
 const courseFollowup=await generateCcdKnowledgeAnswer(deps,{release_id:release,query:'¿Y es gratis?',history});assert.deepEqual(courseFollowup.supporting_claim_ids,['course-price']);
});
