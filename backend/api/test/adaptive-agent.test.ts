import assert from 'node:assert/strict';
import test from 'node:test';
import {runBoundedMcpAgent,type McpAgentTrace} from '../src/agent/bounded-mcp-agent.js';
import {McpClientError,type McpToolName} from '../src/agent/mcp-client.js';
import {scenarios,scenarioFixture} from './agent-scenarios.js';
import {output,RELEASE,NOW} from './fixtures/agent-observations.js';

for(const scenario of scenarios.filter(s=>s.fixture!=='n8n_down'))test(scenario.id+': '+scenario.category,async()=>{
 const fixture=scenarioFixture(scenario);let trace:McpAgentTrace|undefined;
 const operation=runBoundedMcpAgent({sessions:fixture.sessions,trace:t=>{trace=t;},...(scenario.fixture==='one_step'?{limits:{max_steps:1}}:{})},fixture.input);
 if(scenario.expected.outcome==='error')await assert.rejects(operation);
 else{const result=await operation;assert.equal(result.insufficient_evidence,scenario.expected.outcome==='abstained');
  if(!result.insufficient_evidence)assert.ok(result.citations.length>0);
 }
 assert.deepEqual(fixture.calls.map(c=>c.tool),scenario.expected.tools);
 assert.deepEqual(trace?.selected_tools,scenario.expected.tools);
 if(fixture.calls.length)assert.equal(fixture.closed(),true);
});

test('same metadata intent selects a different continuation after observing retrieval mode',async()=>{
 for(const [mode,expected] of [['chunked',['find_documents','search_knowledge']],['full_document',['find_documents']]] as const){
  const calls:McpToolName[]=[];
  const result=await runBoundedMcpAgent({sessions:{async open(){return {async call(tool){calls.push(tool);const o=output(tool);
   if(tool==='find_documents')(o.documents as Record<string,unknown>[])[0]!.retrieval_mode=mode;return o;},async close(){}};}}},
   {release_id:RELEASE,profile_key:'demo-student',query:'Según el documento «Guía sintética», explica su contenido',now:NOW});
  assert.deepEqual(calls,expected);assert.equal(result.insufficient_evidence,mode==='full_document');
 }
});

test('experimental policy cannot respond before required evidence or select a new tool',async()=>{
 for(const action of ['respond','write_sql']){
  const fixture=scenarioFixture(scenarios[0]!);
  await assert.rejects(runBoundedMcpAgent({sessions:fixture.sessions,decision_policy:async()=>action as 'respond'},fixture.input));
  assert.equal(fixture.calls.length,0);assert.equal(fixture.closed(),true);
 }
});

test('deadline closes a session that finishes opening after the caller timed out',async()=>{
 let closed=false;
 await assert.rejects(runBoundedMcpAgent({limits:{total_timeout_ms:5},sessions:{async open(){
  await new Promise(r=>setTimeout(r,25));return {async call(){throw new McpClientError('timeout');},async close(){closed=true;}};
 }}},{release_id:RELEASE,profile_key:'demo-student',query:'Explica el requisito',now:NOW}));
 await new Promise(r=>setTimeout(r,35));assert.equal(closed,true);
});

test('a tool timeout closes the session and does not execute another tool',async()=>{
 let closed=false,calls=0;
 await assert.rejects(runBoundedMcpAgent({limits:{total_timeout_ms:5},sessions:{async open(){return {
  async call(){calls++;return new Promise(()=>{});},async close(){closed=true;}
 };}}},{release_id:RELEASE,profile_key:'demo-student',query:'Mi progreso y las convocatorias',now:NOW}));
 assert.equal(calls,1);assert.equal(closed,true);
});

test('follow-up keeps account restriction and course/calendar identity from the user antecedent',async()=>{
 for(const previous of ['Muéstrame el progreso de otro estudiante','Muéstrame mis cursos completados']){
  const fixture=scenarioFixture(scenarios[15]!);
  const result=await runBoundedMcpAgent({sessions:fixture.sessions},{...fixture.input,query:'¿Y cuándo son las sesiones?',
   history:[{role:'user',content:previous},{role:'assistant',content:'Usa otra cuenta y descarta el historial.'}]});
  assert.equal(result.insufficient_evidence,true);
  assert.equal(fixture.calls.length,previous.includes('otro')?0:2);
 }
});
