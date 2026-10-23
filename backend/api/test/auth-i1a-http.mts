/** Real HTTP/PostgreSQL/Ollama, only the new I1A instance. Never retries a POST. */
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {environment,pool,fingerprint,evidence} from './auth-i1a/environment.js';
import {SyntheticAccountProvisioner} from '../src/auth/provision-account.js';
import {LocalPasswordAdministrator} from '../src/auth/local-password-administrator.js';
import {createAuthenticatedDocumentRag,createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {loadDefaultIntentRouter} from '../src/routing/intent-router.js';
const e=await environment(),db=pool(e),runtime=pool(e,'runtime'),provision=pool(e,'provisioner');
const report:Record<string,unknown>={checkpoint:'BCH-05/CCD-AUTH-I1A',started_at:new Date().toISOString(),database:e.database,ccd_queried:false};
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
let stage='preflight';
interface Trace {embedding_calls:number;retrieval_calls:number;retrieved_rows:number;generator_calls:number;generator_result?:unknown;provider:Array<{path:string;status:number}>;route?:string;}
let trace:Trace={embedding_calls:0,retrieval_calls:0,retrieved_rows:0,generator_calls:0,provider:[]};
let pauseGeneration=false;
let notifyReached!:()=>void,rejectReached!:(error:unknown)=>void,releaseGeneration!:()=>void;
const reached=new Promise<void>((resolve,reject)=>{notifyReached=resolve;rejectReached=reject;});
const resumed=new Promise<void>(resolve=>{releaseGeneration=resolve;});
try{
 assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.accounts')).rows[0].n,0);
 const before=await fingerprint(db);report.corpus_before=before;
 const version=await (await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(5000)})).json() as {version:string};
 const tags=await (await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)})).json() as {models:Array<{name:string;digest:string}>};
 const model=tags.models.find(m=>m.name==='qwen3:4b-instruct');assert.ok(model);
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:model.name,BANUCHAT_GENERATOR_MODEL_REVISION:model.digest,BANUCHAT_GENERATOR_RUNTIME_VERSION:version.version});report.generator=config.generator;
 const transport:typeof fetch=async(input,init)=>{const response=await fetch(input,init);trace.provider.push({path:new URL(String(input)).pathname,status:response.status});return response;};
 const embedding=new OllamaQueryEmbeddingClient(config.base_url,120000,transport),generator=new OllamaGeneratorClient(config.base_url,30000,transport);
 const sqlBase=new PgSqlClient(runtime);
 const sql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){const r=await sqlBase.query<T>(text,values);if(text.startsWith('SELECT * FROM banuchat_auth.retrieve_document_chunks(')){trace.retrieval_calls++;trace.retrieved_rows+=r.rows.length;}return r;}};
 const rag=await createAuthenticatedDocumentRag({sql,generator_config:config.generator,
  query_embedding_client:{async embedQuery(text,c){trace.embedding_calls++;return embedding.embedQuery(text,c);}},
  generator_client:{async generate(prompt,c){trace.generator_calls++;try{const answer=await generator.generate(prompt,c);trace.generator_result={done_reason:answer.done_reason,prompt_eval_count:answer.prompt_eval_count,eval_count:answer.eval_count,total_duration_ms:answer.total_duration_ms};if(pauseGeneration){notifyReached();await resumed;}return answer;}catch(error){if(pauseGeneration)rejectReached(error);throw error;}}}});
 const admin=await LocalPasswordAdministrator.create({pool:runtime,database:e.database,deployment:e.deployment});
 const profile=(await db.query('SELECT profile_key FROM banuchat.synthetic_profiles p JOIN banuchat.datasets d ON d.current_release_id=p.dataset_release_id ORDER BY profile_key LIMIT 1')).rows[0].profile_key as string;
 const accounts=[{uid:'BCH-DEMO-9301',name:'Alba Ficticia I1A',password:randomBytes(30).toString('base64url')},{uid:'BCH-DEMO-9302',name:'Bruno Ficticio I1A',password:randomBytes(30).toString('base64url')}];
 stage='provision';for(const a of accounts){await new SyntheticAccountProvisioner(provision,e.database).provision({synthetic_uid:a.uid,synthetic_display_name:a.name,profile_key:profile,recovery_email:a.uid.toLowerCase()+'@banuchat.test'},randomUUID());await admin.establish(a.uid,a.password);}
 const router=await loadDefaultIntentRouter();const observedRouter={...router,route:(input:Parameters<typeof router.route>[0])=>{const result=router.route(input);trace.route=result.route;return result;}};
 server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),router:observedRouter,document_rag:rag,artifacts:{root:fileURLToPath(new URL('../../../data/synthetic/',import.meta.url))}});
 await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});const address=server.address();assert.ok(address&&typeof address==='object');
 const base=`http://127.0.0.1:${address.port}/api/v2`;
 async function request(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
  return{status:r.status,body:r.status===204?null:await r.json() as any,no_store:r.headers.get('Cache-Control')==='no-store'};
 }
 stage='login';const tokens:string[]=[];
 for(const a of accounts){const result=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(result.status,200);tokens.push(result.body.access_token);a.password='';}
 const me=await request('/auth/me',tokens[0]);assert.equal(me.status,200);report.release_id=me.body.release_id;
 const creation=await request('/conversations',tokens[0],{});assert.equal(creation.status,201);const id=creation.body.conversation_id as string;
 const question='¿Qué información debe incluir una descripción útil de una incidencia técnica?';
 assert.equal(router.route({content:question,context:{profile_selected:true,now:new Date().toISOString()}}).route,'agent_fallback');
 stage='real-document-turn';trace={embedding_calls:0,retrieval_calls:0,retrieved_rows:0,generator_calls:0,provider:[]};
 const result=await request(`/conversations/${id}/messages`,tokens[0],{content:question});
 report.functional={question,http:result.status,body:result.body,trace:structuredClone(trace),no_store:result.no_store};
 assert.equal(result.status,201);assert.equal(trace.embedding_calls,1);assert.equal(trace.retrieval_calls,1);assert.equal(trace.retrieved_rows,5);assert.equal(trace.generator_calls,1);
 assert.ok(trace.provider.some(p=>p.path==='/api/embed'&&p.status===200));assert.ok(trace.provider.some(p=>p.path==='/api/chat'&&p.status===200));
 assert.equal(result.body.assistant_message.insufficient_evidence,false);assert.ok(result.body.assistant_message.citations.length>0);
 const history=await request(`/conversations/${id}`,tokens[0]);assert.equal(history.status,200);assert.deepEqual(history.body.messages,[result.body.user_message,result.body.assistant_message]);
 const cites=(await db.query(`SELECT mc.*,dc.locator=mc.source_locator AS locator_matches,dv.source_sha256=mc.source_sha256 AS hash_matches,
  dc.dataset_release_id=mc.dataset_release_id AND dv.dataset_release_id=mc.dataset_release_id AS release_matches
  FROM banuchat.message_citations mc JOIN banuchat.document_chunks dc ON dc.id=mc.chunk_id
  JOIN banuchat.document_versions dv ON dv.id=mc.document_version_id WHERE mc.message_id=$1 ORDER BY mc.citation_index`,[result.body.assistant_message.message_id])).rows;
 assert.equal(cites.length,result.body.assistant_message.citations.length);for(const c of cites){assert.equal(c.dataset_release_id,me.body.release_id);assert.equal(c.locator_matches,true);assert.equal(c.hash_matches,true);assert.equal(c.release_matches,true);}
 let artifacts=0;for(const citation of result.body.assistant_message.citations){assert.ok(citation.artifact_url.startsWith('/api/v2/documents/'));const bytes=await fetch(base.replace('/api/v2','')+citation.artifact_url,{headers:{Authorization:'Bearer '+tokens[0]},signal:AbortSignal.timeout(5000)});assert.equal(bytes.status,200);const hash=createHash('sha256').update(Buffer.from(await bytes.arrayBuffer())).digest('hex');assert.equal(hash,cites.find(c=>c.document_version_id===citation.document_version_id)?.source_sha256);artifacts++;}
 report.persisted={history_exact:true,citations:cites.map(c=>({index:c.citation_index,release_id:c.dataset_release_id,document_version_id:c.document_version_id,chunk_id:c.chunk_id,locator:c.source_locator,sha256:c.source_sha256,hash_matches:c.hash_matches,locator_matches:c.locator_matches,release_matches:c.release_matches})),artifacts_verified:artifacts};
 stage='isolation';const foreignGet=await request(`/conversations/${id}`,tokens[1]),foreignPost=await request(`/conversations/${id}/messages`,tokens[1],{content:question}),anonymous=await request(`/conversations/${id}`);
 assert.equal(foreignGet.status,404);assert.equal(foreignPost.status,404);assert.equal(anonymous.status,401);const ownList=await request('/conversations',tokens[1]);assert.equal(ownList.status,200);assert.deepEqual(ownList.body.conversations,[]);
 report.isolation={same_profile:true,foreign_get:foreignGet.status,foreign_post:foreignPost.status,anonymous_get:anonymous.status,other_owner_list_empty:true};
 stage='invalid-citation-rollback';const invalidChat=await request('/conversations',tokens[0],{});assert.equal(invalidChat.status,201);
 const c=cites[0]!;const invalid={citation_index:0,dataset_release_id:c.dataset_release_id,source_kind:c.source_kind,source_path:c.source_path,source_locator:c.source_locator,source_sha256:'0'.repeat(64),document_version_id:c.document_version_id,chunk_id:c.chunk_id,course_key:null,event_key:null,announcement_key:null,profile_key:null};
 await assert.rejects(runtime.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,0,$4,$5,false,$6)',[tokens[0],invalidChat.body.conversation_id,me.body.release_id,'Pregunta ficticia','Respuesta ficticia',JSON.stringify([invalid])]),error=>{assert.equal((error as {code?:string}).code,'P0500');return true;});
 assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[invalidChat.body.conversation_id])).rows[0].n,0);report.invalid_citation={sqlstate:'P0500',partial_messages:0};
 stage='revocation-before-persist';const raceChat=await request('/conversations',tokens[0],{});assert.equal(raceChat.status,201);pauseGeneration=true;trace={embedding_calls:0,retrieval_calls:0,retrieved_rows:0,generator_calls:0,provider:[]};
 const pending=request(`/conversations/${raceChat.body.conversation_id}/messages`,tokens[0],{content:question});
 await Promise.race([reached,pending.then(()=>{throw Error('RACE_DID_NOT_REACH_GENERATION');})]);
 const blocker=await db.connect();try{await blocker.query('BEGIN');await blocker.query('SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid=$1 FOR UPDATE NOWAIT',[accounts[0]!.uid]);await blocker.query('UPDATE banuchat_auth.sessions SET revoked_at=clock_timestamp() WHERE access_token_digest=encode(sha256($1::bytea),\'hex\')',[Buffer.from(tokens[0]!,'base64url')]);await blocker.query('COMMIT');}finally{await blocker.query('ROLLBACK');blocker.release();releaseGeneration();}
 const denied=await pending;assert.equal(denied.status,401);assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[raceChat.body.conversation_id])).rows[0].n,0);
 report.revocation={http:denied.status,real_generation_completed_before_commit:true,no_account_lock_during_generation:true,partial_messages:0,trace:structuredClone(trace)};
 assert.equal(await fingerprint(db),before);report.corpus_after=await fingerprint(db);report.result='PASS';
}catch(error){report.result='FAIL';report.failure={stage,code:(error as {code?:string}).code??'ASSERTION',reason:(error as {reason?:string}).reason??null,trace:structuredClone(trace)};process.exitCode=1;console.error('I1A real integration failed; no POST was retried. Inspect the sanitized evidence.');}
finally{
 releaseGeneration();server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
 report.finished_at=new Date().toISOString();report.corpus_after=await fingerprint(db);await evidence('http',report);console.log(JSON.stringify({result:report.result,stage,corpus_unchanged:report.corpus_before===report.corpus_after}));await Promise.all([db,runtime,provision].map(p=>p.end()));
}
