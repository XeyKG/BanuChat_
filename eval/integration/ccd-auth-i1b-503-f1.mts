/** F1: isolated fixture adaptation of BCH-03/5.3. CCD answers remain private/ignored. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {environment,pool,root,privateEvidence,fingerprint,evidence as originalEvidence,storage} from '../../backend/api/test/auth-i1b/environment.js';
import {f1Accounts as demoAccounts,auditF1} from '../../backend/api/test/auth-i1b-f1/environment.js';
const evidence=(name:string,value:unknown,privateOnly=false)=>originalEvidence('503-f1-'+name,value,privateOnly);
import {createAuthenticatedRuntimeServer,createAuthenticatedDocumentRag} from '../../backend/api/src/authenticated-runtime.js';
import {PgSqlClient} from '../../backend/api/src/data/pg-client.js';
import type {SqlQueryClient} from '../../backend/api/src/data/sql-client.js';
import {loadGeneratorRuntimeConfig} from '../../backend/api/src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../../backend/api/src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
import {hasUnbackedGuidanceClaim} from '../../backend/api/src/chat/document-evidence.js';
import {scenarioTurns,dependenciesSatisfied,scenarioMetrics,evaluationCheck,checkMetrics,type EvaluationCheck} from './conversation-evaluation.mjs';
const phase=process.argv[2]??'focal';assert.ok(['focal','full'].includes(phase));
if(phase==='full'){const focal=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-f1-focal.json',root),'utf8'));assert.equal(focal.operational_pass,true,'Full battery requires completed focal integration');}
const e=await environment(),db=pool(e),runtime=pool(e,'runtime'),accounts=await demoAccounts();
const baselineBytes=await readFile(new URL('data/ccd/evidence/increment-5/http-1792693227245.json',root)),baseline=JSON.parse(baselineBytes.toString());
const checks:EvaluationCheck[]=[],turns:any[]=[],scenarios:any[]=[];
const report:Record<string,any>={checkpoint:'BCH-05/CCD-AUTH-I1B-503-F1',phase,started_at:new Date().toISOString(),baseline_sha256:createHash('sha256').update(baselineBytes).digest('hex'),turns,scenarios,checks};
const check=(name:string,work?:()=>void,reason?:string)=>checks.push(evaluationCheck(name,work,reason));
let trace:any={embedding_calls:0,generator_calls:0,retrieval_calls:0,selected_locators:[],provider:[]};
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
let pause=false,notify!:()=>void,release!:()=>void,rejectReached!:(error:unknown)=>void;
const reached=new Promise<void>((resolve,reject)=>{notify=resolve;rejectReached=reject;}),resumed=new Promise<void>(resolve=>{release=resolve;});
const before=await fingerprint(db,true);report.corpus_before=before;
try{
 const priorGeneration=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:priorGeneration.model,BANUCHAT_GENERATOR_MODEL_REVISION:priorGeneration.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:priorGeneration.runtime_version});report.generator=config.generator;
 const transport:typeof fetch=async(input,init)=>{const response=await fetch(input,init);trace.provider.push({path:new URL(String(input)).pathname,status:response.status});return response;};
 const embedder=new OllamaQueryEmbeddingClient(config.base_url,120000,transport),generator=new OllamaGeneratorClient(config.base_url,30000,transport),sqlBase=new PgSqlClient(runtime);
 const sql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){const result=await sqlBase.query<T>(text,values);if(text.startsWith('SELECT * FROM banuchat_auth.retrieve_document_chunks(')){trace.retrieval_calls++;trace.retrieved_rows=result.rows.length;}return result;}};
 const rag=await createAuthenticatedDocumentRag({sql,generator_config:config.generator,
  query_embedding_client:{async embedQuery(text,c){trace.embedding_calls++;return embedder.embedQuery(text,c);}},
  generator_client:{async generate(input,c){trace.generator_calls++;trace.selected_locators=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);try{const result=await generator.generate(input,c);trace.generator_result={done_reason:result.done_reason,prompt_eval_count:result.prompt_eval_count,eval_count:result.eval_count,total_duration_ms:result.total_duration_ms};if(pause){notify();await resumed;}return result;}catch(error){trace.generator_failure=(error as {reason?:string}).reason??'unclassified';if(pause)rejectReached(error);throw error;}}}},'ccd_local');
 server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',document_rag:rag,artifacts:storage});
 await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`,base=origin+'/api/v2';
 async function request(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST'){
  try{const r=await fetch((path.startsWith('/api/')?origin:base)+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});return{status:r.status,body:r.status===204?null:await r.json() as any};}
  catch{return{status:null,body:null,uncertain:true};}
 }
 const login=async(index:number)=>{const a=accounts[index]!;const r=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(r.status,200);return r.body as {access_token:string;refresh_token:string};};
 let a=await login(0),b=await login(1);const me=await request('/auth/me',a.access_token);assert.equal(me.status,200);assert.equal(me.body.evidence_mode,'ccd_local');assert.deepEqual(me.body.capabilities,['chat','history','documents']);assert.equal(me.body.profile.profile_key,'ccd-local-demo');assert.equal(me.body.release_id,baseline.release_id);report.release_id=me.body.release_id;
 const oldAccess=a.access_token,refresh=await request('/auth/refresh',undefined,{refresh_token:a.refresh_token});assert.equal(refresh.status,200);a=refresh.body;assert.equal((await request('/auth/me',oldAccess)).status,401);report.auth={login:200,me:200,refresh:200,old_access:401,evidence_mode:me.body.evidence_mode,capabilities:me.body.capabilities};
 const beforeHistory=(await db.query('SELECT count(*)::int n FROM banuchat.conversations')).rows[0].n;report.previous_conversations=beforeHistory;
 const chosen=phase==='focal'?baseline.cases.filter((c:any)=>['REG','AMB','AMB_FRESH','T02','T07','T11'].includes(c.id)):baseline.cases;
 const created:string[]=[],assistantIds:string[]=[];
 for(const scenario of chosen){
  const creation=await request('/conversations',a.access_token,{});assert.equal(creation.status,201);const id=creation.body.conversation_id as string;created.push(id);
  const overrides=scenario.id==='REG'?{4:[1],5:[],6:[]}:scenario.id==='T12'?{4:[]}:{};
  const states=scenarioTurns(scenario.q,overrides),expected:any[]=[];let reliable=true;
  for(const state of states){
   trace={embedding_calls:0,generator_calls:0,retrieval_calls:0,selected_locators:[],provider:[]};let result:any={status:null,body:null};let persisted=false;
   if(!reliable||!dependenciesSatisfied(state,states)){state.state='not_evaluable';state.reason=reliable?'required antecedent incomplete':'history or POST uncertain';}
   else{
    const prior=await request(`/conversations/${id}`,a.access_token);
    if(prior.status!==200){state.state='not_evaluable';state.reason='prior history unavailable';reliable=false;}
    else{
     state.attempted=true;result=await request(`/conversations/${id}/messages`,a.access_token,{content:state.question});
     const history=await request(`/conversations/${id}`,a.access_token);reliable=history.status===200&&!result.uncertain;
     if(result.status===201&&history.status===200){try{assert.deepEqual(history.body.messages,[...expected,result.body.user_message,result.body.assistant_message]);persisted=true;expected.push(result.body.user_message,result.body.assistant_message);assistantIds.push(result.body.assistant_message.message_id);}catch{persisted=false;}}
     state.state=persisted?'completed':'failed';if(!persisted)state.reason=`HTTP ${result.status??'uncertain'} or persistence mismatch`;
    }
   }
   const key=scenario.id+'/'+state.turn;check(key+' HTTP',state.attempted?()=>assert.equal(result.status,201):undefined,state.reason);check(key+' persistence',result.status===201?()=>assert.equal(persisted,true):undefined,state.reason);
   const answer=result.body?.assistant_message;
   const content=(name:string,fn:()=>void)=>check(key+' '+name,answer?fn:undefined,state.reason);
   content('no unsupported guidance',()=>assert.equal(hasUnbackedGuidanceClaim(answer.content),false));content('private source protocol',()=>assert.doesNotMatch(answer.content,/FUENTES:/u));
   if(scenario.id==='T02')content('U03 useful',()=>{assert.equal(answer.insufficient_evidence,false);assert.ok(answer.citations.some((c:any)=>c.locator==='unit:U03'));});
   if(['T03','T05','T06','T09'].includes(scenario.id))content('U04 useful',()=>{assert.equal(answer.insufficient_evidence,false);assert.ok(answer.citations.some((c:any)=>c.locator==='unit:U04'));});
   if(scenario.id==='T07')content('T07 pertinent abstention',()=>{assert.deepEqual(answer.citations,[]);assert.equal(answer.insufficient_evidence,true);assert.doesNotMatch(answer.content,/Inform[aá]tica|transici[oó]n|reconocimientos?|homolog|pilar|202660|202560|202610|hist[oó]ric|vigencia|matr[ií]cula/iu);assert.doesNotMatch(answer.content,/\b(?:la ausencia|no asistir|no presentarse) (?:equivale|cuenta|se considera|significa).*reprob/iu);});
   if(scenario.id.startsWith('T10'))content('isolated clarification',()=>{assert.equal(answer.insufficient_evidence,true);assert.deepEqual(answer.citations,[]);assert.match(answer.content,/refieres|contexto/u);});
   if(scenario.id==='T08'&&state.turn===3)content('course failure distinction',()=>{assert.doesNotMatch(answer.content,/no (?:se requiere|es necesario|debes|tienes que|necesitas).*present/iu);assert.match(answer.content,/confirm|verific|comprobar/iu);});
   if((scenario.id==='T12'&&state.turn===4)||(scenario.id==='REG'&&state.turn===6))content('M12 scoped contact',()=>{assert.equal(answer.insufficient_evidence,false);assert.deepEqual(answer.citations.map((c:any)=>c.locator),['unit:M12']);assert.match(answer.content,/vigencia actual no está ratificada/u);});
   if(scenario.id==='REG'&&[2,3,4,5].includes(state.turn))content('REG correct source',()=>assert.deepEqual(answer.citations.map((c:any)=>c.locator),[state.turn===4?'unit:M02:DOC-103':state.turn===5?'unit:TEST_ORIENTATION':'unit:M02:DOC-101']));
   if((scenario.id==='AMB'&&state.turn===2)||scenario.id==='AMB_FRESH')content('ambiguity before retrieval',()=>{assert.equal(answer.insufficient_evidence,true);assert.deepEqual(answer.citations,[]);assert.equal(trace.embedding_calls,0);assert.equal(trace.generator_calls,0);assert.equal(trace.retrieval_calls,0);assert.match(answer.content,/contexto|cuál curso/u);});
   turns.push({scenario:scenario.id,turn:state.turn,question:state.question,state:state.state,depends_on:state.depends_on,result,persisted,...trace});
   console.log(JSON.stringify({phase,case:key,status:result.status,state:state.state,embedding:trace.embedding_calls,generation:trace.generator_calls}));
  }
  const final=await request(`/conversations/${id}`,a.access_token);check(scenario.id+' exact history',()=>{assert.equal(final.status,200);assert.deepEqual(final.body.messages,expected);});scenarios.push({id:scenario.id,metrics:scenarioMetrics(states)});
 }
 const foreign=await request(`/conversations/${created[0]}`,b.access_token),foreignPost=await request(`/conversations/${created[0]}/messages`,b.access_token,{content:'¿Y qué temas tiene?'});assert.equal(foreign.status,404);assert.equal(foreignPost.status,404);assert.deepEqual((await request('/conversations',b.access_token)).body.conversations,[]);assert.equal((await request(`/conversations/${created[0]}`)).status,401);
 for(const path of ['/me/progress','/calendar/events?date_from=2026-10-23&date_to=2026-10-23','/announcements'])assert.equal((await request(path,a.access_token)).status,403);
 assert.equal((await request('/api/v1/profiles')).status,404);assert.equal((await request('/api/v1/conversations',undefined,{profile_key:'ccd-local-demo'})).status,404);
 assert.equal((await request('/conversations',a.access_token,{evidence_mode:'synthetic',profile_key:'student_001'})).status,400);
 const legacy=(await db.query("INSERT INTO banuchat.conversations(dataset_release_id,profile_key) VALUES('5834fc47-57c5-498b-98fc-4190330155e4','ccd-local-demo') RETURNING id")).rows[0].id;
 assert.equal((await request(`/conversations/${legacy}`,a.access_token)).status,404);
 report.authorization={foreign_get:404,foreign_post:404,anonymous_get:401,other_owner_list_empty:true,unsupported_resources:403,anonymous_v1:404,client_scope_override:400,legacy_unowned:404};
 const citations=(await db.query(`SELECT mc.*,dc.locator=mc.source_locator AS locator_matches,dv.source_sha256=mc.source_sha256 AS hash_matches,
  dc.dataset_release_id=mc.dataset_release_id AND dv.dataset_release_id=mc.dataset_release_id AS release_matches FROM banuchat.message_citations mc JOIN banuchat.document_chunks dc ON dc.id=mc.chunk_id JOIN banuchat.document_versions dv ON dv.id=mc.document_version_id WHERE mc.message_id=ANY($1::uuid[]) ORDER BY mc.message_id,mc.citation_index`,[assistantIds])).rows;
 assert.ok(citations.every(c=>c.hash_matches&&c.locator_matches&&c.release_matches&&c.dataset_release_id===baseline.release_id));report.citations=citations;
 const versions=(await db.query('SELECT id,source_sha256 FROM banuchat.document_versions ORDER BY id')).rows;for(const v of versions){const response=await fetch(base+`/documents/${v.id}/artifact`,{headers:{Authorization:'Bearer '+a.access_token},signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),v.source_sha256);}report.artifacts_verified=versions.length;
 if(phase==='focal'){
  const race=await request('/conversations',a.access_token,{});assert.equal(race.status,201);pause=true;trace={embedding_calls:0,generator_calls:0,retrieval_calls:0,selected_locators:[],provider:[]};const pending=request(`/conversations/${race.body.conversation_id}/messages`,a.access_token,{content:baseline.cases.find((c:any)=>c.id==='T02').q[0]});
  await Promise.race([reached,pending.then(()=>{throw Error('RACE_DID_NOT_REACH_GENERATION');})]);const lock=await db.connect();try{await lock.query('BEGIN');await lock.query('SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid=$1 FOR UPDATE NOWAIT',[accounts[0]!.uid]);await lock.query("UPDATE banuchat_auth.sessions SET revoked_at=clock_timestamp() WHERE access_token_digest=encode(sha256($1::bytea),'hex')",[Buffer.from(a.access_token,'base64url')]);await lock.query('COMMIT');}finally{await lock.query('ROLLBACK');lock.release();release();}
  const denied=await pending;assert.equal(denied.status,401);assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[race.body.conversation_id])).rows[0].n,0);report.revocation={http:401,partial_messages:0,no_account_lock_during_external_generation:true,trace:structuredClone(trace)};pause=false;
  a=await login(0);
 }
 assert.equal((await request('/auth/logout',b.access_token,undefined,'POST')).status,204);assert.equal((await request('/auth/me',b.access_token)).status,401);assert.equal((await request('/auth/logout',a.access_token,undefined,'POST')).status,204);report.auth.logout=204;
 assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.synthetic_profiles')).rows[0].n,0);assert.equal(await fingerprint(db,true),before);report.corpus_after=await fingerprint(db,true);
 report.turn_metrics={planned:turns.length,attempted:turns.filter(t=>t.result.status!==null).length,completed:turns.filter(t=>t.state==='completed').length,failed:turns.filter(t=>t.state==='failed').length,not_evaluable:turns.filter(t=>t.state==='not_evaluable').length};
 report.check_metrics=checkMetrics(checks);report.operational_pass=scenarios.every(s=>s.metrics.script_complete)&&report.turn_metrics.failed===0;report.automatic_controls_pass=report.check_metrics.failed===0&&report.check_metrics.not_evaluable===0;
 report.semantic_note='Technical controls do not grant semantic A/B/C. BCH-03/5.3 rubrics unchanged; T11 remains pending academic evaluation, including generic abstentions.';
 if(!report.operational_pass||!report.automatic_controls_pass)process.exitCode=1;
}catch(error){report.operational_pass=false;report.failure={code:(error as {code?:string}).code??'ASSERTION',reason:(error as {reason?:string}).reason??null};process.exitCode=1;console.error('I1B integration stopped; private evidence retained, no POST retry.');}
finally{
 release();server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));report.integrity=await auditF1(e);report.finished_at=new Date().toISOString();report.corpus_after=await fingerprint(db,true);
 await evidence(phase+'-'+Date.now(),report,true);await evidence(phase,{checkpoint:report.checkpoint,phase,started_at:report.started_at,finished_at:report.finished_at,operational_pass:report.operational_pass,automatic_controls_pass:report.automatic_controls_pass,turn_metrics:report.turn_metrics,check_metrics:report.check_metrics,authorization:report.authorization,artifacts_verified:report.artifacts_verified,citations_verified:report.citations?.length??0,corpus_before:report.corpus_before,corpus_after:report.corpus_after,private_report_directory:'data/ccd/evidence/auth-i1b',integrity:report.integrity,semantic_note:report.semantic_note,failure:report.failure??null,revocation:report.revocation?{http:report.revocation.http,partial_messages:report.revocation.partial_messages}:null});
 console.log(JSON.stringify({phase,operational_pass:report.operational_pass,automatic_controls_pass:report.automatic_controls_pass,turn_metrics:report.turn_metrics}));await Promise.all([db,runtime].map(p=>p.end()));
}
