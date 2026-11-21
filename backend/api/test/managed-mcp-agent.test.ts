import test from 'node:test';
import assert from 'node:assert/strict';
import {createManagedMcpResponder,usesManagedStructuredMcp} from '../src/agent/managed-mcp-agent.js';
import {output,RELEASE,NOW} from './fixtures/agent-observations.js';
import type {ConversationOrchestrator} from '../src/orchestration/n8n-conversation.js';
import type {McpAgentInput} from '../src/agent/bounded-mcp-agent.js';
const question=(query:string):McpAgentInput=>({release_id:RELEASE,profile_key:'demo-student',now:NOW,query});

for(const query of ['¿Cuáles pruebas debo hacer?','¿Cuánto cuesta el curso vacacional?','Según el documento, ¿qué convocatorias y cursos hay?','Hola']){
 test(`managed policy preserves current documentary/social path: ${query}`,()=>assert.equal(usesManagedStructuredMcp(question(query)),false));
}

test('managed policy admits an existing structured multifuente question',()=>{
 assert.equal(usesManagedStructuredMcp(question('Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?')),true);
});

test('a new explicit structured subject does not inherit an unrelated documentary topic',()=>{
 assert.equal(usesManagedStructuredMcp({...question('Mis cursos completados y convocatorias activas'),history:[{role:'user',content:'¿Cuáles pruebas debo hacer?'}]}),true);
});

test('a bare follow-up retains the documentary boundary from the previous user subject',()=>{
 assert.equal(usesManagedStructuredMcp({...question('¿Y cuáles?'),history:[{role:'user',content:'Según la guía, mis cursos y convocatorias'}]}),false);
});

function fixture(){
 const events:string[]=[];
 const operations:string[]=[];
 const routes:string[]=[];
 const operationId='a5e349d6-b543-4a79-9865-d103a9106dbb';
 const orchestrator:ConversationOrchestrator={async orchestrate(q){events.push('n8n');operations.push(q.operation_id);return {operation_id:q.operation_id,release_id:q.release_id,
  state:(q.required_sources??2)>2?'clarification_required':'authorized',directive:(q.required_sources??2)>2?'request_clarification':'invoke_bounded_mcp_agent',workflow:'oe4-conversation-v1'};}};
 const responder=createManagedMcpResponder({principal:'11111111-1111-4111-8111-111111111111',profile_key:'demo-student',deployment_id:RELEASE,
  environment:{},orchestrator,rag:async q=>{events.push('rag');return {release_id:q.release_id,content:'Existing RAG',insufficient_evidence:true,citations:[],citation_records:[]};},
  sessions:{async open(profile){assert.equal(profile,'demo-student');events.push('mcp-open');return {async call(tool){events.push(tool);return output(tool);},async close(){events.push('mcp-close');}};}},
  operationId,onRoute:route=>routes.push(route),trace:entry=>{operations.push(entry.operation_id);events.push('trace');}});
 return {responder,events,operations,routes,operationId};
}

test('n8n admission precedes bounded MCP tools and keeps normal evidence',async()=>{
 const {responder,events,operations,routes,operationId}=fixture();
 const answer=await responder(question('Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?'));
 assert.equal(answer.insufficient_evidence,false);
 assert.ok(answer.citations.length>0);
 assert.deepEqual(answer.citations.map(c=>c.label),['Progreso: Curso sintético','Anuncio: Convocatoria sintética']);
 assert.deepEqual(events.filter(e=>e!=='trace'),['n8n','mcp-open','get_profile_progress','get_announcements','mcp-close']);
 assert.equal(events.filter(e=>e==='trace').length,1);
 assert.deepEqual(operations,[operationId,operationId]);
 assert.deepEqual(routes,['structured_mcp']);
});

test('approved documentary responder remains the fallback without unnecessary MCP/n8n calls',async()=>{
 const {responder,events,routes}=fixture();
 const answer=await responder(question('¿Cuáles pruebas debo hacer?'));
 assert.equal(answer.content,'Existing RAG');assert.deepEqual(events,['rag']);
 assert.deepEqual(routes,['document_rag']);
});

test('mismatched profile cannot invoke orchestration or tools',async()=>{
 const {responder,events}=fixture();
 await assert.rejects(responder({...question('Mis cursos y convocatorias'),profile_key:'foreign-profile'}));
 assert.deepEqual(events,[]);
});

test('unavailable orchestration fails closed before any tool',async()=>{
 let opened=false;
 const responder=createManagedMcpResponder({principal:RELEASE,profile_key:'demo-student',deployment_id:RELEASE,environment:{},
  orchestrator:{async orchestrate(){throw Error('Unavailable');}},rag:async()=>{throw Error('No silent fallback');},
  sessions:{async open(){opened=true;throw Error('Must not open');}}});
 await assert.rejects(responder(question('Mis cursos completados y convocatorias activas')));
 assert.equal(opened,false);
});

test('three source request clarifies after admission without opening MCP',async()=>{
 const {responder,events}=fixture();
 const answer=await responder(question('Mis cursos completados, convocatorias y calendario'));
 assert.equal(answer.insufficient_evidence,true);assert.deepEqual(events,['n8n']);
});
