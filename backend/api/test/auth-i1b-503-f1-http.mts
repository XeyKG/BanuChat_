/** Controlled F1 HTTP test; no operator accounts, migrations, original databases or POST retries. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {environment,pool,root,evidence,f1Accounts,auditF1} from './auth-i1b-f1/environment.js';
import {storage} from './auth-i1b/environment.js';
import {createAuthenticatedDocumentRag,createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {selectCcdEvidence} from '../src/chat/document-evidence.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
const e=await environment(),db=pool(e),runtime=pool(e,'runtime');
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B-503-F1',started_at:new Date().toISOString(),turns:[]};
let trace:any;
try{
 await new PgAuthStore(runtime).assertRuntime(e.database,'ccd_local');
 const expected=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:expected.model,BANUCHAT_GENERATOR_MODEL_REVISION:expected.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:expected.runtime_version});
 const version=await(await fetch(config.base_url+'/api/version')).json() as any;assert.equal(version.version,expected.runtime_version);
 const current=(await db.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id;assert.equal(current,'3d6cedac-0e86-40c8-909b-d3ff6e8ab741');
 const accounts=await f1Accounts();report.integrity_before=await auditF1(e);report.database=e.database;report.generator=config.generator;
 const metadata=(await db.query('SELECT v.title,c.locator AS chunk_locator FROM banuchat.document_chunks c JOIN banuchat.document_versions v ON v.id=c.document_version_id WHERE c.dataset_release_id=$1',[current])).rows as RetrievedDocumentChunk[];
 const historical=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-selector-audit.json',root),'utf8'));
 report.selection_before=historical.cases;report.selection_after=['IA Generativa','Inteligencia Artificial Generativa','¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'].map(query=>({selected:selectCcdEvidence(metadata,query,[]).map(c=>c.chunk_locator)}));
 assert.ok(report.selection_after.every((r:any)=>JSON.stringify(r.selected)==='["unit:M02:DOC-101"]'));
 const transport:typeof fetch=async(input,init)=>{const r=await fetch(input,init);trace?.provider.push({path:new URL(String(input)).pathname,status:r.status});return r;};
 const embedding=new OllamaQueryEmbeddingClient(config.base_url,120000,transport),generator=new OllamaGeneratorClient(config.base_url,30000,transport);
 const rag=await createAuthenticatedDocumentRag({sql:new PgSqlClient(runtime),generator_config:config.generator,query_embedding_client:embedding,
  generator_client:{async generate(input,recipe){trace.selected=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);trace.prompt_utf8_bytes=Buffer.byteLength(input.system_prompt+input.user_prompt);const result=await generator.generate(input,recipe);trace.generated={done_reason:result.done_reason,prompt_eval_count:result.prompt_eval_count,eval_count:result.eval_count};return result;}}},'ccd_local');
 server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',artifacts:storage,document_rag:rag});
 await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const addr=server.address();assert.ok(addr&&typeof addr==='object');const base=`http://127.0.0.1:${addr.port}/api/v2`;
 async function request(path:string,token:string|undefined,body?:unknown,method=body===undefined?'GET':'POST'){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});return{status:r.status,body:r.status===204?null:await r.json() as any};}
 const tokens=[];for(const a of accounts){const r=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(r.status,200);tokens.push(r.body.access_token as string);}
 const a=tokens[0]!,b=tokens[1]!,privateTurns:any[]=[];const created:string[]=[];
 for(const [index,question] of ['Describe los temas del curso IA Generativa.','Describe el temario de Inteligencia Artificial Generativa.','¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'].entries()){
  const creation=await request('/conversations',a,{});assert.equal(creation.status,201);const id=creation.body.conversation_id;created.push(id);let expectedHistory:any[]=[];
  for(const [turn,content] of (index===1?[question,'¿Y qué temas tiene?']:[question]).entries()){
   const before=await request('/conversations/'+id,a);assert.equal(before.status,200);assert.deepEqual(before.body.messages,expectedHistory);
   trace={provider:[],selected:[]};let sent:any;try{sent=await request('/conversations/'+id+'/messages',a,{content});}catch{const history=await request('/conversations/'+id,a);report.uncertain={history_status:history.status,message_count:history.body?.messages?.length??null};throw Error('UNCERTAIN_POST_NO_RETRY');}
   const history=await request('/conversations/'+id,a);assert.equal(history.status,200);assert.equal(sent.status,201);expectedHistory=[...expectedHistory,sent.body.user_message,sent.body.assistant_message];assert.deepEqual(history.body.messages,expectedHistory);
   const answer=sent.body.assistant_message;assert.deepEqual(trace.selected,['unit:M02:DOC-101']);
   if(!answer.insufficient_evidence)assert.deepEqual(answer.citations.map((c:any)=>c.locator),['unit:M02:DOC-101']);else assert.deepEqual(answer.citations,[]);
   const checked=(await db.query(`SELECT count(*)::int n,bool_and(mc.source_sha256=v.source_sha256 AND mc.source_locator=c.locator AND mc.dataset_release_id=c.dataset_release_id) ok FROM banuchat.message_citations mc JOIN banuchat.document_versions v ON v.id=mc.document_version_id JOIN banuchat.document_chunks c ON c.id=mc.chunk_id WHERE mc.message_id=$1`,[answer.message_id])).rows[0];if(checked.n)assert.equal(checked.ok,true);
   const summary={case:index,turn:turn+1,status:sent.status,persisted_messages:history.body.messages.length,insufficient_evidence:answer.insufficient_evidence,citations:checked.n,...trace};report.turns.push(summary);privateTurns.push({case:index,turn:turn+1,result:sent.body});console.log(JSON.stringify(summary));
  }
 }
 assert.equal((await request('/conversations/'+created[0],b)).status,404);assert.equal((await request('/conversations/'+created[0]+'/messages',b,{content:'Consulta ajena de ensayo'})).status,404);
 const ownB=await request('/conversations',b,{});assert.equal(ownB.status,201);assert.equal((await request('/conversations/'+ownB.body.conversation_id,a)).status,404);assert.equal((await request('/conversations/'+ownB.body.conversation_id,b,undefined,'DELETE')).status,204);
 for(const token of tokens)assert.equal((await request('/auth/logout',token,undefined,'POST')).status,204);
 report.isolation={a_to_b:404,b_to_a_get:404,b_to_a_post:404};report.passed=true;await evidence('http-turns',privateTurns,true);
}catch(error){report.passed=false;report.failure={reason:['embedding_runtime_mismatch','embedding_unavailable','invalid_embedding_response','invalid_generator_response','generator_response_incomplete','generator_unavailable'].includes((error as {reason:string})?.reason)?(error as {reason:string}).reason:'assertion_or_dependency'};process.exitCode=1;console.error('F1 HTTP stopped; no raw error or automatic POST retry.');}
finally{server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));report.integrity_after=await auditF1(e);report.finished_at=new Date().toISOString();await evidence('http',report);console.log(JSON.stringify({passed:report.passed,turns:report.turns.length,integrity:report.integrity_after}));await Promise.all([db,runtime].map(p=>p.end()));}
