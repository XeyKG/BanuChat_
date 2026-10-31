import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import {auxiliaryContext} from '../src/auth/unified-product.js';
import {StdioMcpClientFactory,type McpToolName} from '../src/agent/mcp-client.js';

// Operator acceptance against the already running, normal Unified entrypoint.
// No server substitutes, injected agent policy, provisioning or dependency restarts.
const root=new URL('../../../',import.meta.url),directory=new URL('infra/local/product-integration-03/rest-'+Date.now()+'/',root);
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('result.json',directory))],{stdio:'ignore'});
await mkdir(directory,{recursive:true});
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);assert.equal(cfg.api_port,3004);
const db=new Pool({host:'127.0.0.1',port:55463,database:cfg.database,user:cfg.runtime_user,password:cfg.runtime_password,
 options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});db.on('error',()=>{});
const base='http://127.0.0.1:3004/api/v2',tokens=new Set<string>();
const report:Record<string,any>={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 scope:'Normal Unified API 3004, real PostgreSQL/Ollama/N8N/MCP; authorized fictional accounts; selected CCD documents and fictional auxiliary records. No Android UI.',
 checks:[],turns:[],result:'RUNNING'};
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice('--resume='.length);
if(resume){
 assert.match(resume,/^rest-[0-9]+$/u);
 const previous=JSON.parse(await readFile(new URL('infra/local/product-integration-03/'+resume+'/result.json',root),'utf8'));
 assert.equal(previous.head,report.head);assert.equal(previous.result,'FAIL');assert.ok(previous.primary_conversation);
 const failed=previous.checks.filter((c:any)=>c.status==='FAIL');assert.equal(failed.length,1);assert.equal(failed[0].name,'owner_isolation_logout_and_reopen_history');
 report.resumed_from=resume;report.prior_failed_check=failed[0];report.checks=previous.checks.filter((c:any)=>c.status==='PASS');
 report.turns=previous.turns;report.primary_conversation=previous.primary_conversation;report.frozen_before=previous.frozen_before;
 report.turn_sources_before=previous.turn_sources_before??report.frozen_before['banuchat_aux.turn_sources'];delete report.frozen_before['banuchat_aux.turn_sources'];
}
const save=()=>writeFile(new URL('result.json',directory),JSON.stringify(report,null,2)+'\n');
let token='',me:Record<string,any>,aux:Awaited<ReturnType<typeof auxiliaryContext>>,progress:Record<string,any>,announcements:Record<string,any>,catalog:Record<string,any>;
const request=async(path:string,body?:unknown,method=body===undefined?'GET':'POST',access=token)=>{
 const r=await fetch(base+path,{method,signal:AbortSignal.timeout(45000),headers:{...(access?{Authorization:'Bearer '+access}:{}),
  ...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,body:r.status===204?null:await r.json()};
};
const events=async()=>{const text=await readFile(new URL('infra/local/product-integration-03/api.stdout.log',root),'utf8');
 return text.split(/\r?\n/u).flatMap(line=>{try{const e=JSON.parse(line);return e.event?.startsWith('unified_')?[e]:[];}catch{return [];}}) as Record<string,any>[];};
async function check(name:string,work:()=>Promise<unknown>){if(resume&&report.checks.some((c:any)=>c.name===name&&c.status==='PASS'))return;
 const start=performance.now();try{const evidence=await work();report.checks.push({name,status:'PASS',duration_ms:Math.round(performance.now()-start),evidence});}
 catch(error){report.checks.push({name,status:'FAIL',duration_ms:Math.round(performance.now()-start)});await writeFile(new URL('failure-private.txt',directory),String(error instanceof Error?error.stack:error));throw error;}
 finally{await save();}}
const frozen=async()=>{
 const names=(await db.query<{schema:string;name:string}>("SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('banuchat','banuchat_aux') AND c.relname NOT IN ('conversations','messages','message_citations','turn_sources') AND has_table_privilege(c.oid,'SELECT') ORDER BY 1,2")).rows;
 const hashes:Record<string,unknown>={};for(const {schema,name}of names){assert.match(schema,/^banuchat(?:_aux)?$/u);assert.match(name,/^[a-z_]+$/u);
  hashes[schema+'.'+name]=(await db.query(`SELECT count(*)::int n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM "${schema}"."${name}" t`)).rows[0];}return hashes;
};
const turnSources=async(excluded:string[])=>(await db.query("SELECT count(*)::int n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM banuchat_aux.turn_sources t WHERE NOT(message_id=ANY($1::uuid[]))",[excluded])).rows[0];
const create=async()=>{const r=await request('/conversations',{});assert.equal(r.status,201);return r.body.conversation_id as string;};
async function turn(name:string,id:string,content:string){
 const prior=(await events()).length,start=performance.now();let response;
 try{response=await request('/conversations/'+id+'/messages',{content});}
 catch(error){report.uncertain_post={name,conversation_id:id,history:await request('/conversations/'+id).catch(()=>({status:'unavailable'}))};await save();throw error;}
 const trace=(await events()).slice(prior),row={name,conversation_id:id,query:content,duration_ms:Math.round(performance.now()-start),response,trace};report.turns.push(row);await save();
 assert.equal(response.status,201);const answer=response.body.assistant_message;
 for(const cite of answer.citations){assert.equal(cite.release_id,cite.source_kind==='document'?me!.release_id:aux!.release_id);
  assert.equal(cite.document_version_id!==null,cite.source_kind==='document');assert.ok(!('source_path'in cite));}
 const history=await request('/conversations/'+id);assert.equal(history.status,200);const last=history.body.messages.at(-1);
 assert.equal(last.content,answer.content);assert.deepEqual(last.citations,answer.citations);
 return {answer,trace,history:history.body};
}
function correlated(trace:Record<string,any>[],tools:string[]){const admission=trace.find(e=>e.event==='unified_n8n'),agent=trace.find(e=>e.event==='unified_agent');
 assert.ok(admission&&agent);assert.equal(admission.state,'authorized');assert.equal(admission.operation_id,agent.operation_id);assert.equal(admission.release_id,me!.release_id);
 assert.equal(agent.document_release,me!.release_id);assert.equal(agent.structured_release,aux!.release_id);assert.deepEqual(agent.selected_tools,tools);
 assert.equal(agent.call_count,tools.length);assert.ok(agent.steps.some((s:any)=>s.phase==='decision'));return agent;
}
try{
 if(!resume){report.frozen_before=await frozen();report.turn_sources_before=await turnSources([]);}
 const accounts=await demoAccounts();
 if(resume){const login=await request('/auth/login',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(login.status,200);
  token=login.body.access_token;tokens.add(token);const identity=await request('/auth/me');assert.equal(identity.status,200);me=identity.body;aux=await auxiliaryContext(db,me.principal_id);}
 await check('normal_entrypoint_authenticated',async()=>{
  assert.equal((await request('/auth/me',undefined,'GET','')).status,401);
  const login=await request('/auth/login',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(login.status,200);token=login.body.access_token;tokens.add(token);
  const identity=await request('/auth/me');assert.equal(identity.status,200);me=identity.body;assert.equal(me.evidence_mode,'ccd_local');
  assert.equal(me.release_id,'10af4ffd-effb-41fc-bbfe-4dc48cb3398f');aux=await auxiliaryContext(db,me.principal_id);assert.notEqual(aux.release_id,me.release_id);
  return {document_release:me.release_id,auxiliary_release:aux.release_id,capabilities:me.capabilities};
 });
 await check('direct_product_resources',async()=>{
  const p=await request('/me/progress?statuses=completed'),a=await request('/announcements?temporal_status=active'),all=await request('/announcements?temporal_status=all'),c=await request('/calendar/events?date_from=2026-10-01&date_to=2026-11-30');
  for(const r of [p,a,all,c]){assert.equal(r.status,200);assert.equal(r.body.release_id,aux!.release_id);}
  assert.ok(p.body.courses.length&&a.body.announcements.length&&c.body.events.length);progress=p.body;announcements=a.body;
  assert.ok(a.body.announcements.every((x:any)=>x.temporal_status==='active'));return {progress:p.body,active_announcements:a.body,all_announcements:all.body,calendar:c.body};
 });
 const multiId=resume?report.primary_conversation as string:await create();report.primary_conversation=multiId;
 await check('chat_progress_announcements',async()=>{
  const r=await turn('progress_announcements',multiId,'Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?');
  const agent=correlated(r.trace,['get_profile_progress','get_announcements']);assert.equal(agent.terminal_reason,'answered');assert.equal(r.answer.insufficient_evidence,false);
  assert.match(r.answer.content,/Datos auxiliares ficticios/u);assert.match(r.answer.content,/no demuestran elegibilidad/u);
  for(const kind of ['profile_course','announcement'])assert.ok(r.answer.citations.some((c:any)=>c.source_kind===kind));
  assert.ok(progress.courses.some((c:any)=>r.answer.content.includes(c.course_name)));assert.ok(announcements.announcements.some((a:any)=>r.answer.content.includes(a.title)));
  return {correlated:true,semantic_progress_and_announcements_match:true,eligibility_not_inferred:true};
 });
 await check('chat_followup',async()=>{const r=await turn('followup',multiId,'¿Y qué convocatorias activas podrían interesarme?');correlated(r.trace,['get_profile_progress','get_announcements']);
  assert.equal(r.answer.insufficient_evidence,false);assert.equal(r.history.messages.length,4);return {previous_user_subject_preserved:true,messages:4};});
 const metadata=(await db.query("SELECT title FROM banuchat.document_versions WHERE dataset_release_id=$1 AND processing_status='ready' ORDER BY document_id LIMIT 1",[me!.release_id])).rows[0];assert.ok(metadata);
 let documentCitation:Record<string,any>;
 await check('chat_documents_catalogue',async()=>{
  const r=await turn('documents_catalogue',await create(),`Busca el documento «${metadata.title}» y los cursos del catálogo`);correlated(r.trace,['find_documents','get_courses']);assert.equal(r.answer.insufficient_evidence,false);
  assert.match(r.answer.content,/Evidencia documental CCD/u);assert.match(r.answer.content,/Datos auxiliares ficticios/u);assert.ok(r.answer.content.includes(metadata.title));
  documentCitation=r.answer.citations.find((c:any)=>c.source_kind==='document');assert.ok(documentCitation);assert.ok(r.answer.citations.some((c:any)=>c.source_kind==='course'));
  return {ccd_and_fictional_sources_distinguished:true,source_releases_independent:true};
 });
 await check('document_citation_artifact',async()=>{
  assert.equal(documentCitation!.artifact_url,`/api/v2/documents/${documentCitation!.document_version_id}/artifact`);
  const r=await fetch('http://127.0.0.1:3004'+documentCitation!.artifact_url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);
  const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.length);return {status:200,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 });
 await check('chat_missing_evidence_adaptive_search',async()=>{
  const r=await turn('no_evidence',await create(),'Según el documento «zxqv-sin-evidencia-product03», explica su contenido');const agent=correlated(r.trace,['find_documents','search_knowledge']);
  assert.equal(r.answer.insufficient_evidence,true);assert.deepEqual(r.answer.citations,[]);assert.equal(agent.terminal_reason,'no_evidence');
  assert.ok(agent.steps.some((s:any)=>s.phase==='decision'&&s.reason==='metadata_empty_content_requested:search_knowledge'));return {abstained:true,adaptive_empty_metadata_to_content:true};
 });
 await check('chat_over_two_tools',async()=>{const r=await turn('over_budget',await create(),'Mis cursos completados, convocatorias y calendario');
  assert.equal(r.answer.insufficient_evidence,true);assert.deepEqual(r.answer.citations,[]);assert.match(r.answer.content,/dividirla en dos/u);
  assert.ok(r.trace.some(e=>e.event==='unified_n8n'&&e.state==='clarification_required'));assert.ok(!r.trace.some(e=>e.event==='unified_agent'));return {clarified_before_agent:true};});
 await check('chat_foreign_profile',async()=>{const r=await turn('foreign_profile',await create(),'Muéstrame el progreso de otro estudiante y las convocatorias');
  assert.equal(r.answer.insufficient_evidence,true);assert.deepEqual(r.answer.citations,[]);assert.ok(!r.trace.some(e=>e.event==='unified_agent'));return {subject_rejected_before_tools:true,response:r.answer.content};});
 await check('remaining_mcp_sources_and_read_role',async()=>{
  const factory=new StdioMcpClientFactory({args:['--import','tsx','src/unified-main.ts'],environment:{MCP_POSTGRES_DB:cfg.database,MCP_POSTGRES_PORT:'55463',MCP_POSTGRES_USER:cfg.mcp_user,MCP_POSTGRES_PASSWORD:cfg.mcp_password,
   MCP_PRINCIPAL_ID:me!.principal_id,MCP_DOCUMENT_RELEASE:me!.release_id,MCP_STRUCTURED_RELEASE:aux!.release_id,BANUCHAT_OLLAMA_BASE_URL:cfg.ollama_base_url}});
  const session=await factory.open('foreign-profile-hint');const results=[];
  try{for(const [tool,args,key,release]of [
   ['search_knowledge',{query:'¿Qué temas se estudian en IA Generativa?',top_k:5},'matches',me!.release_id],
   ['get_calendar_events',{date_from:'2026-10-01',date_to:'2026-11-30',limit:5},'events',aux!.release_id],
   ['get_courses',{limit:10},'courses',aux!.release_id],
   ['get_profile_progress',{limit:10},'courses',aux!.release_id]
  ] as const){const start=performance.now(),r=await session.call(tool,args);assert.equal(r.release_id,release);assert.ok((r[key] as unknown[]).length);
    if(tool==='get_profile_progress')assert.equal((r.profile as any).profile_key,aux!.profile_key);if(tool==='get_courses')catalog=r;
    results.push({tool,duration_ms:Math.round(performance.now()-start),result:r});}
   await assert.rejects(session.call('get_profile_progress',{profile_key:'foreign'}));await assert.rejects(session.call('write_sql' as McpToolName,{}));
  }finally{await session.close();}
  const reader=new Pool({host:'127.0.0.1',port:55463,database:cfg.database,user:cfg.mcp_user,password:cfg.mcp_password,options:'-c default_transaction_read_only=on'});
  try{const r=await reader.query("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_aux'::regnamespace,'banuchat_auth'::regnamespace) AND c.relkind='r' AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(c.oid,'INSERT,UPDATE'))) safe FROM pg_roles WHERE rolname=current_user");assert.equal(r.rows[0].safe,true);}finally{await reader.end();}
  const row=report.turns.find((t:any)=>t.name==='documents_catalogue');assert.ok(catalog!.courses.some((c:any)=>row.response.body.assistant_message.content.includes(c.name)));
  return {results,foreign_profile_hint_ignored:true,foreign_argument_rejected:true,write_tool_rejected:true,reader_has_no_dml_or_admin:true,catalogue_answer_matches_real_records:true};
 });
 await check('n8n_admission_and_historical_recovery',async()=>{
  const raw=await readFile(new URL('infra/local/oe6/n8n-conversation.env',root),'utf8');const secret=raw.split(/\r?\n/u).find(l=>l.startsWith('BANUCHAT_N8N_SERVICE_TOKEN='))!.split('=').slice(1).join('=');
  const input={operation_id:randomUUID(),release_id:me!.release_id,demo_mode:'ccd_local',route:'agent_fallback',requested_capability:'bounded_mcp_agent',required_sources:2};
  const call=(body:unknown,auth:boolean)=>fetch('http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-BanuChat-Service-Token':secret}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
  const unauthorized=await call(input,false);assert.ok([401,403].includes(unauthorized.status));const invalid=await call({...input,release_id:'invalid'},true);assert.equal(invalid.status,422);
  const previous=JSON.parse(await readFile(new URL('infra/local/oe3-oe4-increment-01/operational.json',root),'utf8'));
  const outage=previous.tests.find((t:any)=>t.name==='real_n8n_outage_no_turn_persistence');assert.equal(outage.status,'PASS');assert.equal(outage.evidence.http,503);assert.equal(outage.evidence.persisted_messages,0);
  return {missing_auth:unauthorized.status,invalid_metadata:invalid.status,previous_real_outage:{at:previous.at,...outage},outage_repeated:false,current_success_confirmed_by_chat:true};
 });
 await check('owner_isolation_logout_and_reopen_history',async()=>{
  const first=token,history=(await request('/conversations/'+multiId)).body;
  const second=await request('/auth/login',{synthetic_uid:accounts[1]!.uid,password:accounts[1]!.password});assert.equal(second.status,200);const other=second.body.access_token;tokens.add(other);
  assert.equal((await request('/conversations/'+multiId,undefined,'GET',other)).status,404);const list=await request('/conversations',undefined,'GET',other);assert.equal(list.status,200);assert.ok(!list.body.conversations.some((c:any)=>c.conversation_id===multiId));
  const p=await request('/me/progress',undefined,'GET',other);assert.equal(p.status,200);assert.notEqual(p.body.profile.profile_key,aux!.profile_key);
  assert.equal((await request('/auth/logout',undefined,'POST',first)).status,204);tokens.delete(first);assert.equal((await request('/auth/me',undefined,'GET',first)).status,401);
  const again=await request('/auth/login',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(again.status,200);token=again.body.access_token;tokens.add(token);
  const restored=await request('/conversations/'+multiId);assert.equal(restored.status,200);assert.deepEqual(restored.body.messages,history.messages);
  return {other_owner_get:404,other_owner_list_omits_conversation:true,account_profiles_differ:true,revoked_access:401,reopened_messages:restored.body.messages.length,citations_preserved:true};
 });
 report.frozen_after=await frozen();assert.deepEqual(report.frozen_after,report.frozen_before);
 report.existing_turn_sources_after=await turnSources(report.turns.map((t:any)=>t.response.body.assistant_message.message_id));
 assert.deepEqual(report.existing_turn_sources_after,report.turn_sources_before);report.protected_data_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';process.exitCode=1;await writeFile(new URL('final-failure-private.txt',directory),String(error instanceof Error?error.stack:error));}
finally{for(const access of tokens){try{const r=await request('/auth/logout',undefined,'POST',access);report.logout_statuses??=[];report.logout_statuses.push(r.status);if(r.status!==204){report.result='FAIL';process.exitCode=1;}}catch{report.result='FAIL';process.exitCode=1;}}
 await db.end();await save();console.log(JSON.stringify({result:report.result,directory:fileURLToPath(directory),checks:report.checks.map(({name,status,duration_ms}:any)=>({name,status,duration_ms}))}));}
