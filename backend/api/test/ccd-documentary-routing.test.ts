import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedResponder} from '../src/auth/unified-product.js';
import {requiresConversationalOrchestration} from '../src/agent/bounded-mcp-agent.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
import type {IntentRouter} from '../src/routing/intent-router-types.js';

function fixture(schema='ccd-1.4.0'){
 const orchestration=new Error('synthetic_orchestration_selected');let ragCalls=0,orchestrationCalls=0;
 const sql:SqlQueryClient={async query<T>(){return {rows:[{schema_version:schema}] as T[]};}};
 const router={catalog_valid:true,catalog_version:'synthetic',route(){return {route:'agent_fallback',parameters:{},response_variant:null};}} as IntentRouter;
 const responder=unifiedResponder({sql,router,principal:'synthetic',aux:{release_id:'aux',profile_key:'synthetic',alias:'Synthetic'},mcp_environment:{},rag:async q=>{ragCalls++;return {release_id:q.release_id,content:'Contenido documental sintético.',insufficient_evidence:false,citations:[],citation_records:[]};},orchestrator:{async orchestrate(){orchestrationCalls++;throw orchestration;}}});
 const input=(query:string)=>({release_id:'documentary',profile_key:'synthetic',now:'2031-01-02T12:00:00Z',query});
 return {ask:(query:string,history?:Array<{role:'user'|'assistant';content:string}>)=>responder({...input(query),...(history?{history}:{})}),input,orchestration,get ragCalls(){return ragCalls;},get orchestrationCalls(){return orchestrationCalls;}};
}
test('archivos como contenido de un temario no exige localizar documentos más búsqueda de conocimiento',async()=>{
 const f=fixture(),query='Según el temario de Diseño de Objetos, ¿qué prácticas de archivos y respaldo incluye?';assert.equal(requiresConversationalOrchestration(f.input(query)),true);assert.match((await f.ask(query)).content,/documental sintético/u);assert.equal(f.ragCalls,1);assert.equal(f.orchestrationCalls,0);
});
test('mencionar un temario no desvía una solicitud multifuente de progreso o calendario',async()=>{
 for(const query of ['Según el temario de archivos, compara mis cursos completados y el contenido.','Según el syllabus de archivos, ¿qué eventos del calendario se relacionan?']){const f=fixture();await assert.rejects(f.ask(query),e=>e===f.orchestration);assert.equal(f.ragCalls,0);assert.equal(f.orchestrationCalls,1);}
});
test('la prioridad documental exige una publicación CCD reconocida',async()=>{const f=fixture('unknown');await assert.rejects(f.ask('Según el temario, ¿qué prácticas de archivos incluye?'),e=>e===f.orchestration);assert.equal(f.ragCalls,0);});
test('un seguimiento usa el temario del usuario sin adoptar un temario inventado por el asistente',async()=>{
 const f=fixture();await f.ask('¿Y qué archivos incluye?', [{role:'user',content:'¿Qué contenidos tiene el temario de Diseño de Objetos?'},{role:'assistant',content:'Mis cursos completados son datos del perfil.'}]);assert.equal(f.ragCalls,1);assert.equal(f.orchestrationCalls,0);
 const g=fixture();await assert.rejects(g.ask('Según la guía, ¿qué archivos contiene?', [{role:'assistant',content:'El temario describe objetos.'}]),e=>e===g.orchestration);assert.equal(g.ragCalls,0);
});
test('un cambio explícito de tema no hereda la prioridad del temario anterior',async()=>{const f=fixture();await assert.rejects(f.ask('Cambiando de tema: según la guía, ¿qué archivos hay?', [{role:'user',content:'¿Qué contenidos tiene el temario de Diseño de Objetos?'}]),e=>e===f.orchestration);assert.equal(f.ragCalls,0);});
