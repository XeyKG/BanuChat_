/** F2 HTTP: new chats and existing F1 fixtures only; no POST retry or operator sessions. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {environment,pool,root,storage,accounts,integrityGuard,evidence} from './auth-i1b-f2-implementation/environment.js';
import {createAuthenticatedDocumentRag,createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {GeneratorClientError,loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
const e=await environment(),fixtures=await accounts(),guard=await integrityGuard(e),db=pool(e),runtime=pool(e,'runtime');
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B-F2 implementation',at:new Date().toISOString(),turns:[]},privateTurns:any[]=[];
const capacityOnly=process.argv.includes('--capacity-only');
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined,token:string|undefined;
let request:((path:string,body?:unknown,method?:string)=>Promise<{status:number;body:any}>)|undefined;
let trace:any,inject=false;
try{
 const expected=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-f1-http.json',root),'utf8')).generator;
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:expected.model,BANUCHAT_GENERATOR_MODEL_REVISION:expected.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:expected.runtime_version});
 const generator=new OllamaGeneratorClient(config.base_url,30000),embedding=new OllamaQueryEmbeddingClient(config.base_url,120000);
 const rag=await createAuthenticatedDocumentRag({sql:new PgSqlClient(runtime),generator_config:config.generator,query_embedding_client:embedding,generator_client:{async generate(input,recipe){
  trace.generation_calls++;trace.selected=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);
  if(inject){trace.generator='INJECTED_TYPED_CAPACITY_FAILURE';throw new GeneratorClientError('generator_context_capacity_exceeded');}
  trace.generator='REAL_OLLAMA';try{const result=await generator.generate(input,recipe);trace.done_reason=result.done_reason;trace.prompt_eval_count=result.prompt_eval_count;return result;}catch(error){if(error instanceof GeneratorClientError)trace.internal_reason=error.reason;throw error;}
 }}},'ccd_local');
 server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',artifacts:storage,document_rag:rag});
 await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/v2`;
 request=async(path,body,method=body===undefined?'GET':'POST')=>{const response=await fetch(base+path,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});return{status:response.status,body:response.status===204?null:await response.json()};};
 const login=await request('/auth/login',{synthetic_uid:fixtures[0]!.uid,password:fixtures[0]!.password});assert.equal(login.status,200);token=login.body.access_token;
 const cases=[
  {id:'f2_then_identified',questions:['Busco la asignatura para aprender a dar instrucciones a modelos que crean texto e imágenes.','IA Generativa'],generations:[0,1],sources:[[],['unit:M02:DOC-101']]},
  {id:'f1_exact',questions:['¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'],generations:[1],sources:[['unit:M02:DOC-101']]},
  {id:'two_courses',questions:['Compara los temas de IA Generativa y Marca Personal Digital.'],generations:[1],sources:[['unit:M02:DOC-101','unit:M02:DOC-103']]},
  {id:'broad_topics',questions:['Explica los contenidos de todos los cursos disponibles.'],generations:[0],sources:[[]]},
  {id:'outside',questions:['Describe el mantenimiento de motores de aeronaves.'],generations:[0],sources:[[]]},
 ];
 for(const c of capacityOnly?[]:cases){
  const created=await request('/conversations',{});assert.equal(created.status,201);const id=created.body.conversation_id;const expectedHistory:any[]=[];
  for(const [i,content] of c.questions.entries()){
   assert.deepEqual((await request('/conversations/'+id)).body.messages,expectedHistory);trace={generation_calls:0,selected:[],generator:'NOT_EXECUTED'};
   let sent:{status:number;body:any};try{sent=await request('/conversations/'+id+'/messages',{content});}catch{const reconciled=await request('/conversations/'+id);report.uncertain={case:c.id,history_status:reconciled.status,message_count:reconciled.body?.messages?.length??null};throw Error('UNCERTAIN_POST_NO_RETRY');}
   const history=await request('/conversations/'+id);assert.equal(sent.status,201);assert.equal(history.status,200);expectedHistory.push(sent.body.user_message,sent.body.assistant_message);assert.deepEqual(history.body.messages,expectedHistory);
   assert.equal(trace.generation_calls,c.generations[i]);const answer:any=sent.body.assistant_message;assert.deepEqual(answer.citations.map((x:any)=>x.locator).sort(),[...c.sources[i]!].sort());assert.equal(answer.insufficient_evidence,c.generations[i]===0);
   if(c.id==='f2_then_identified'&&i===0)assert.match(answer.content,/nombre|identificar/u);if(c.id==='broad_topics')assert.match(answer.content,/delimitar/u);
   if(answer.citations.length){const check=(await db.query('SELECT bool_and(mc.source_sha256=v.source_sha256 AND mc.source_locator=c.locator AND mc.dataset_release_id=c.dataset_release_id) ok FROM banuchat.message_citations mc JOIN banuchat.document_versions v ON v.id=mc.document_version_id JOIN banuchat.document_chunks c ON c.id=mc.chunk_id WHERE mc.message_id=$1',[answer.message_id])).rows[0];assert.equal(check.ok,true);}
   const summary={case:c.id,turn:i+1,status:201,persisted_messages:expectedHistory.length,insufficient_evidence:answer.insufficient_evidence,citations:answer.citations.map((x:any)=>x.locator),...trace};report.turns.push(summary);privateTurns.push({case:c.id,turn:i+1,result:sent.body});console.log(JSON.stringify(summary));
  }
 }
 const failed=await request('/conversations',{});assert.equal(failed.status,201);inject=!capacityOnly;trace={generation_calls:0,selected:[]};
 const content=capacityOnly?'Compara IA Generativa, Marca Personal Digital, Interacción Digital, Creación de Contenidos Digitales, Cuidado y bienestar digital, Marco Legal Digital y Habilidades en Analítica Digital.':'Describe IA Generativa.';
 const rejected=await request('/conversations/'+failed.body.conversation_id+'/messages',{content});assert.equal(rejected.status,503);assert.equal(rejected.body.error.code,'DEPENDENCY_UNAVAILABLE');assert.deepEqual((await request('/conversations/'+failed.body.conversation_id)).body.messages,[]);
 if(capacityOnly)assert.equal(trace.internal_reason,'generator_context_capacity_exceeded');
 report.capacity_atomicity={http:503,code:'DEPENDENCY_UNAVAILABLE',internal_reason:'generator_context_capacity_exceeded',generator:capacityOnly?'REAL_OLLAMA':'INJECTED_TYPED_FAILURE_NOT_REAL_OLLAMA',selected:trace.selected,partial_messages:0};report.passed=true;
 await evidence('http-turns',privateTurns,true);
}catch{report.passed=false;report.failure='ASSERTION_OR_DEPENDENCY_NO_AUTOMATIC_POST_RETRY';process.exitCode=1;}
finally{
 try{if(token&&request){const logout=await request('/auth/logout',undefined,'POST');assert.equal(logout.status,204);report.fixture_logout=204;}report.integrity=await guard.verify();}
 finally{server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await Promise.all([runtime.end(),db.end()]);await evidence(capacityOnly?'http-capacity':'http',report);console.log(JSON.stringify({passed:report.passed,turns:report.turns.length,capacity_atomicity:report.capacity_atomicity,integrity:report.integrity}));}
}
