import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedResponder} from '../src/auth/unified-product.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
import type {IntentRouter} from '../src/routing/intent-router-types.js';
import {requiresConversationalOrchestration,type McpAgentInput} from '../src/agent/bounded-mcp-agent.js';
import {asksCcdProvenance,ccdKnowledgeQueryScope} from '../src/chat/ccd-knowledge.js';
test('adopted CCD recognition precedes synthetic completion orchestration',async()=>{
 let calls=0;
 const sql={async query(){return {rows:[{schema_version:'ccd-1.3.0'}],rowCount:1};}} as SqlQueryClient;
 const router={catalog_valid:true,catalog_version:'fixture',route(){return {route:'profile_progress',parameters:{},response_variant:null};}} as IntentRouter;
 const responder=unifiedResponder({sql,router,principal:'fixture',aux:{release_id:'aux',profile_key:'fixture',alias:'Fixture'},mcp_environment:{},rag:async q=>{calls++;return {release_id:q.release_id,content:'Documented recognition.',insufficient_evidence:false,citations:[],citation_records:[]};}});
 const answer=await responder({release_id:'documentary',query:'¿Qué reconocimiento obtengo cuando ya completé la ruta?',profile_key:'fixture',now:'2026-10-26T12:00:00Z'});
 assert.equal(calls,1);assert.equal(answer.content,'Documented recognition.');
});

const feeProvenance='¿Cuánto cuesta un curso en 2026? ¿Qué documento lo dice?';
const question=(query:string,history?:McpAgentInput['history']):McpAgentInput=>({
 release_id:'documentary',profile_key:'fixture',now:'2026-10-28T12:00:00Z',query,
 ...(history===undefined?{}:{history}),
});

function routingFixture(schema:string|null='ccd-1.4.0'){
 const selectedOrchestration=new Error('Fixture: orchestration selected');
 const ragAnswer={release_id:'documentary',content:'Fake RAG documentary answer.',insufficient_evidence:false,citations:[],citation_records:[]};
 const ragQueries:unknown[]=[],schemaQueries:unknown[]=[];
 let orchestrationCalls=0;
 const sql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){
  assert.match(text,/^SELECT manifest->>'schema_version'/u);
  assert.match(text,/status='ready'/u);
  assert.deepEqual(values,['documentary']);
  schemaQueries.push({text,values});
  return {rows:(schema===null?[]:[{schema_version:schema}]) as T[]};
 }};
 const router={catalog_valid:true,catalog_version:'fixture',route(){return {route:'agent_fallback',parameters:{},response_variant:null};}} as IntentRouter;
 const responder=unifiedResponder({sql,router,principal:'fixture',aux:{release_id:'aux',profile_key:'fixture',alias:'Fixture'},mcp_environment:{},
  rag:async q=>{ragQueries.push(q);return ragAnswer;},
  orchestrator:{async orchestrate(){orchestrationCalls++;throw selectedOrchestration;}},
 });
 return {responder,ragAnswer,ragQueries,schemaQueries,selectedOrchestration,get orchestrationCalls(){return orchestrationCalls;}};
}

test('C05 remains multi-tool to the general planner and has CCD fees plus explicit provenance',()=>{
 assert.equal(requiresConversationalOrchestration(question(feeProvenance)),true);
 assert.ok(ccdKnowledgeQueryScope(feeProvenance,new Map()).topics.includes('fees'));
 assert.equal(asksCcdProvenance(feeProvenance),true);
});

test('CCD fee provenance reaches normal RAG before invoking orchestration',async()=>{
 const f=routingFixture(),input=question(feeProvenance);
 assert.strictEqual(await f.responder(input),f.ragAnswer);
 assert.equal(f.orchestrationCalls,0);
 assert.deepEqual(f.ragQueries,[input]);
 assert.equal(f.schemaQueries.length,1);
});

test('CCD provenance follow-up uses the latest user subject without rewriting the RAG input',async()=>{
 const f=routingFixture(),input=question('¿Qué documento lo dice?',[
  {role:'user',content:'¿Cuánto cuesta un curso en 2026?'},
  {role:'assistant',content:'Mis cursos completados figuran en un documento.'},
  {role:'user',content:'¿Cuál es la fuente?'},
 ]);
 assert.strictEqual(await f.responder(input),f.ragAnswer);
 assert.equal(f.orchestrationCalls,0);
 assert.deepEqual(f.ragQueries,[input]);
 assert.equal(f.schemaQueries.length,1);
});

test('documentary provenance priority covers CCD topics beyond fees and both adopted schemas',async()=>{
 for(const schema of ['ccd-1.3.0','ccd-1.4.0'])for(const query of [
  '¿Qué modalidades tienen los cursos? ¿Cuál es la fuente?',
  '¿Cuál es la duración de un curso? ¿Qué documento lo dice?',
  '¿Cuál es el correo de contacto del CCD? ¿Qué documento lo dice?',
 ]){
  const f=routingFixture(schema),input=question(query);
  assert.strictEqual(await f.responder(input),f.ragAnswer,query);
  assert.equal(f.orchestrationCalls,0,query);
  assert.equal(f.schemaQueries.length,1,query);
 }
});

test('real cross-source auxiliary composition still invokes orchestration and propagates failure',async()=>{
 const f=routingFixture(),input=question('Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?');
 assert.equal(requiresConversationalOrchestration(input),true);
 await assert.rejects(f.responder(input),e=>e===f.selectedOrchestration);
 assert.equal(f.orchestrationCalls,1);
 assert.equal(f.ragQueries.length,0);
 assert.equal(f.schemaQueries.length,0);
});

test('explicit auxiliary requests retain orchestration despite recognized CCD provenance',async()=>{
 for(const query of [
  '¿Cuánto cuestan mis cursos? ¿Qué documento lo dice?',
  '¿Qué cursos completé en mi progreso? ¿Qué documento lo dice?',
  '¿Qué calificación tienen mis notas? ¿Qué documento lo dice?',
  '¿Cuándo hay eventos en el calendario? ¿Qué documento lo dice?',
  '¿Qué anuncios de cursos hay? ¿Qué documento lo dice?',
  '¿Qué noticias de cursos hay? ¿Qué documento lo dice?',
  '¿Qué convocatorias de cursos hay? ¿Qué documento lo dice?',
 ]){
  const f=routingFixture(),input=question(query);
  assert.equal(asksCcdProvenance(query),true,query);
  assert.ok(ccdKnowledgeQueryScope(query,new Map()).topics.length,query);
  assert.equal(requiresConversationalOrchestration(input),true,query);
  await assert.rejects(f.responder(input),e=>e===f.selectedOrchestration,query);
  assert.equal(f.orchestrationCalls,1,query);
  assert.equal(f.ragQueries.length,0,query);
  assert.equal(f.schemaQueries.length,0,query);
 }
});

test('auxiliary user antecedent cannot become CCD provenance through a follow-up',async()=>{
 const f=routingFixture(),input=question('¿Qué documento lo dice?',[
  {role:'user',content:'¿Cuánto cuestan mis cursos?'},
 ]);
 await assert.rejects(f.responder(input),e=>e===f.selectedOrchestration);
 assert.equal(f.orchestrationCalls,1);
 assert.equal(f.schemaQueries.length,0);
 assert.equal(f.ragQueries.length,0);
});

test('unanchored provenance cannot invent a CCD subject from assistant prose or stale user history',async()=>{
 const histories:McpAgentInput['history'][]=[
  undefined,
  [{role:'assistant',content:'El curso cuesta dinero.'}],
  [{role:'user',content:'¿Cuánto cuesta un curso?'},{role:'user',content:'¿Cómo llego al laboratorio?'}],
  [{role:'user',content:'¿Cuánto cuesta un curso?'},...Array.from({length:8},()=>({role:'assistant' as const,content:'Sin nuevo antecedente de usuario.'}))],
 ];
 for(const history of histories){
  const f=routingFixture();
  await assert.rejects(f.responder(question('¿Qué documento lo dice?',history)),e=>e===f.selectedOrchestration);
  assert.equal(f.orchestrationCalls,1);
  assert.equal(f.schemaQueries.length,0);
  assert.equal(f.ragQueries.length,0);
 }
});

test('a new self-contained CCD provenance query does not inherit an old auxiliary subject',async()=>{
 const f=routingFixture(),input=question(feeProvenance,[{role:'user',content:'¿Cuáles son mis cursos completados?'}]);
 assert.strictEqual(await f.responder(input),f.ragAnswer);
 assert.equal(f.orchestrationCalls,0);
 assert.deepEqual(f.ragQueries,[input]);
});

test('documentary precedence requires an adopted ready CCD Knowledge schema',async()=>{
 for(const schema of [null,'v1','ccd-1.2.0']){
  const f=routingFixture(schema);
  await assert.rejects(f.responder(question(feeProvenance)),e=>e===f.selectedOrchestration);
  assert.equal(f.orchestrationCalls,1);
  assert.equal(f.schemaQueries.length,1);
  assert.equal(f.ragQueries.length,0);
 }
});
