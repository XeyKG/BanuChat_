/** Isolated diagnostic harness using existing I1B composition/DI. No product instrumentation or fixes. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {environment,pool,root,local,evidence,fingerprint,storage} from './auth-i1b/environment.js';
import {SyntheticAccountProvisioner} from '../src/auth/provision-account.js';
import {LocalPasswordAdministrator} from '../src/auth/local-password-administrator.js';
import {createAuthenticatedRuntimeServer,createAuthenticatedDocumentRag} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {loadDefaultIntentRouter} from '../src/routing/intent-router.js';
const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
const preflight=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-preflight.json',root),'utf8'));
assert.ok(Object.values(preflight.matching).every(v=>v===true));
const db=pool(e),runtime=pool(e,'runtime'),provisioner=pool(e,'provisioner');
const reasons=new Set(['generator_runtime_mismatch','generator_unavailable','invalid_generator_response','generator_response_incomplete','embedding_runtime_mismatch','embedding_unavailable','invalid_embedding_response','embedding_config_invalid','release_not_available','invalid_database_result','invalid_argument']);
const reason=(error:unknown)=>reasons.has((error as {reason:string})?.reason)?(error as {reason:string}).reason:'unclassified';
const code=(error:unknown)=>/^(?:08[A-Z0-9]{3}|57P[0-9]{2}|42501|57014|P0[045][0-9]{2}|ECONNREFUSED|ECONNRESET|ETIMEDOUT)$/u.test((error as {code:string})?.code??'')?(error as {code:string}).code:'unclassified';
let events:Array<Record<string,unknown>>|undefined,providerPhase='none';
const emit=(event:Record<string,unknown>)=>events?.push(event);
runtime.on('connect',client=>{
 const original=client.query.bind(client);
 (client as any).query=(...args:any[])=>{
  const sql=typeof args[0]==='string'?args[0]:args[0]?.text??'';
  const stage=sql.includes('banuchat_auth.resource_context(')?'resource_authorization':sql.includes('AS recent_messages')?'conversation_context':sql.includes('banuchat_auth.persist_turn(')?'persist_turn':sql.startsWith('SELECT * FROM banuchat_auth.retrieve_document_chunks(')?'authenticated_retrieval':sql.includes('ec.parameters')?'embedding_configuration':sql.includes('banuchat_auth.')?'authentication_sql':'other_sql';
  const relevant=stage!=='other_sql',start=Date.now();if(relevant)emit({stage,event:'start'});
  const finish=(error:unknown,result?:any)=>{if(relevant)emit({stage,event:error?'error':'ok',duration_ms:Date.now()-start,...(error?{code:code(error)}:{rows:result?.rows?.length??0})});};
  const callback=args.at(-1);if(typeof callback==='function')args[args.length-1]=(error:unknown,result:unknown)=>{finish(error,result);callback(error,result);};
  const result=(original as any)(...args);
  if(typeof callback!=='function'&&result?.then)void result.then((r:any)=>finish(undefined,r),(error:unknown)=>finish(error));
  return result;
 };
});
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B/503 diagnosis',started_at:new Date().toISOString(),database:e.database,mode:'ccd_local',cases:[],product_changes:false,original_databases_accessed:false};
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
let access:string|undefined,base:string|undefined;let ownPrincipal:string|undefined;
const existing=(await db.query('SELECT id FROM banuchat.conversations ORDER BY id')).rows.map(r=>r.id);
async function oldHistoryDigest(){const result=await db.query(`SELECT md5(COALESCE(string_agg(row_text,E'\n' ORDER BY row_text),'')) AS digest FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c WHERE c.id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m WHERE m.conversation_id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])) t`,[existing]);return result.rows[0].digest;}
report.corpus_before=await fingerprint(db,true);report.existing_history_before=await oldHistoryDigest();
try{
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:preflight.generator.model,BANUCHAT_GENERATOR_MODEL_REVISION:preflight.generator.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:preflight.generator.runtime_version});report.generator=config.generator;
 const transport:typeof fetch=async(input,init)=>{
  const path=new URL(String(input)).pathname,start=Date.now();const r=await fetch(input,init);
  const event:any={stage:providerPhase,event:'ollama_response',path,status:r.status,duration_ms:Date.now()-start};
  try{
   const v=await r.clone().json() as any;
   if(typeof v.error==='string'){
    event.provider_error_category=/context.*(?:length|limit)|input.*(?:length|too long|context)/iu.test(v.error)?'context_limit':/memory|alloc/iu.test(v.error)?'memory':/not found/iu.test(v.error)?'model_missing':'unclassified_provider_error';
    event.provider_error_sha256=createHash('sha256').update(v.error).digest('hex');
   }
   if(path==='/api/chat')Object.assign(event,{done:v.done===true,done_reason:['stop','length','load','unload'].includes(v.done_reason)?v.done_reason:'other',content_nonblank:typeof v.message?.content==='string'&&v.message.content.trim().length>0,content_characters:typeof v.message?.content==='string'?v.message.content.length:0,thinking_nonempty:typeof v.message?.thinking==='string'&&v.message.thinking.length>0,...Object.fromEntries(['eval_count','prompt_eval_count'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]]))});
   if(path==='/api/embed')Object.assign(event,{embedding_count:Array.isArray(v.embeddings)?v.embeddings.length:0,dimension:Array.isArray(v.embeddings?.[0])?v.embeddings[0].length:0});
  }catch{event.metadata='not_parseable';}
  emit(event);return r;
 };
 const embedding=new OllamaQueryEmbeddingClient(config.base_url,120000,transport),generator=new OllamaGeneratorClient(config.base_url,30000,transport);
 const rag=await createAuthenticatedDocumentRag({sql:new PgSqlClient(runtime),generator_config:config.generator,
  query_embedding_client:{async embedQuery(text,expected){providerPhase='embedding';emit({stage:'embedding',event:'start'});try{const vector=await embedding.embedQuery(text,expected);emit({stage:'embedding',event:'ok',dimension:vector.length});return vector;}catch(error){emit({stage:'embedding',event:'error',reason:reason(error)});throw error;}}},
  generator_client:{async generate(input,expected){providerPhase='generation';emit({stage:'generation',event:'start',prompt_utf8_bytes:Buffer.byteLength(input.system_prompt+input.user_prompt),prompt_sha256:createHash('sha256').update(input.system_prompt+input.user_prompt).digest('hex'),evidence_fragments:[...input.user_prompt.matchAll(/Localizador: /gu)].length});try{const result=await generator.generate(input,expected);emit({stage:'generation',event:'validated'});return result;}catch(error){emit({stage:'generation',event:'error',reason:reason(error)});throw error;}}}},'ccd_local');
 const router=await loadDefaultIntentRouter();server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',artifacts:storage,
  router:{...router,route(input){const decision=router.route(input);emit({stage:'router',event:'decision',route:decision.route});return decision;}},
  document_rag:async input=>{emit({stage:'rag',event:'start'});try{const result=await rag(input);emit({stage:'rag',event:'validated',citations:result.citations.length,insufficient_evidence:result.insufficient_evidence});return result;}catch(error){emit({stage:'rag',event:'error',reason:reason(error)});throw error;}}});
 await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});const addr=server.address();assert.ok(addr&&typeof addr==='object');base=`http://127.0.0.1:${addr.port}/api/v2`;
 const uid='U08000004';assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.accounts WHERE synthetic_uid=$1',[uid])).rows[0].n,0,'Dedicated diagnostic fixture already exists; do not reuse or reset it automatically');
 const created=await new SyntheticAccountProvisioner(provisioner,e.database,'ccd_local').provision({synthetic_uid:uid,synthetic_display_name:'Cuenta Ficticia Diagnostico',profile_key:'ccd-local-demo',recovery_email:'diagnostico-u08000004@banuchat.test'},randomUUID());ownPrincipal=created.principal_id;
 // Credential is needed once for normal HTTP login, not a direct session or authorization bypass.
 const password=randomBytes(30).toString('base64url');
 await (await LocalPasswordAdministrator.create({pool:runtime,database:e.database,deployment:e.deployment,evidence_mode:'ccd_local'})).establish(uid,password);
 async function request(path:string,body?:unknown,token=access){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});return{status:response.status,body:response.status===204?null:await response.json() as any};}
 const login=await request('/auth/login',{synthetic_uid:uid,password});assert.equal(login.status,200);access=login.body.access_token;const me=await request('/auth/me');assert.equal(me.status,200);assert.equal(me.body.evidence_mode,'ccd_local');report.authentication={login:200,me:200,capabilities:me.body.capabilities};
 const privateState:any={principal:ownPrincipal,conversations:[]};await mkdir(new URL('diagnosis/',local),{recursive:true});
 for(const scenario of [{name:'course_short_title',question:'Describe los temas del curso IA Generativa.'},{name:'course_long_title',question:'Describe el temario de Inteligencia Artificial Generativa.'}]){
  const creation=await request('/conversations',{});assert.equal(creation.status,201);const id=creation.body.conversation_id;privateState.conversations.push(id);await writeFile(new URL('diagnosis/fixtures.json',local),JSON.stringify(privateState));
  const before=await request('/conversations/'+id);assert.equal(before.status,200);assert.equal(before.body.messages.length,0);
  const trace:any[]=[];events=trace;const started=Date.now();let result:any;
  try{result=await request('/conversations/'+id+'/messages',{content:scenario.question});}catch{result={status:null,uncertain:true};}
  events=undefined;const history=await request('/conversations/'+id);
  const summary={case:scenario.name,http_status:result.status,duration_ms:Date.now()-started,error_code:result.body?.error?.code??null,request_id:result.body?.error?.request_id??null,history_status:history.status,persisted_messages:history.body?.messages?.length??null,uncertain:result.uncertain??false,trace};report.cases.push(summary);console.log(JSON.stringify(summary));
  if(result.uncertain||history.status!==200){report.stop_reason='uncertain POST or reconciliation unavailable; no retry';break;}
 }
 if(access){const r=await fetch(base+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(15000)});report.logout=r.status;access=undefined;}
}catch(error){report.failure={reason:reason(error),code:code(error)};process.exitCode=1;console.error('Diagnostic stopped; no raw error or automatic POST retry.');}
finally{
 events=undefined;server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
 report.corpus_after=await fingerprint(db,true);report.corpus_unchanged=report.corpus_before===report.corpus_after;
 report.existing_history_after=await oldHistoryDigest();report.existing_history_unchanged=report.existing_history_before===report.existing_history_after;
 report.finished_at=new Date().toISOString();await evidence('503-reproduction',report);
 console.log(JSON.stringify({cases:report.cases.length,corpus_unchanged:report.corpus_unchanged,existing_history_unchanged:report.existing_history_unchanged,failure:report.failure??null}));await Promise.all([db,runtime,provisioner].map(p=>p.end()));
}
