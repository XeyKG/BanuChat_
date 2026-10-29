import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport,getDefaultEnvironment} from '@modelcontextprotocol/client/stdio';
import {createAuthenticatedRuntimeServer,createAuthenticatedDocumentRag} from '../src/authenticated-runtime.js';
import {ccdArtifactStorage} from '../src/authenticated-main.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {N8nConversationOrchestrator} from '../src/orchestration/n8n-conversation.js';
import {StdioMcpClientFactory,McpClientError,type McpToolName} from '../src/agent/mcp-client.js';
import {runBoundedMcpAgent} from '../src/agent/bounded-mcp-agent.js';
import {auxiliaryContext} from '../src/auth/unified-product.js';
import {demoAccounts} from '../test/auth-i1b/accounts.js';

const root=new URL('../../../',import.meta.url),directory=new URL('infra/local/oe3-oe4-increment-01/',root);
await mkdir(directory,{recursive:true});
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('operational.json',directory))],{stdio:'ignore'});
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);
const n8nContainer=JSON.parse(execFileSync('docker',['inspect','banuchat-unified-n8n'],{encoding:'utf8'}))[0];
assert.equal(n8nContainer.Config.Labels['banuchat.scope'],'unified-isolated');assert.equal(n8nContainer.State.Running,true);
const secret=(await readFile(new URL('infra/local/oe6/n8n-conversation.env',root),'utf8')).split(/\r?\n/u).find(l=>l.startsWith('BANUCHAT_N8N_SERVICE_TOKEN='))!.slice('BANUCHAT_N8N_SERVICE_TOKEN='.length);
const events:Record<string,unknown>[]=[];
const orchestrator=new N8nConversationOrchestrator({url:'http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation',service_token:secret,
 trace:r=>events.push({event:'n8n',...r})});
const originalLog=console.log;console.log=(...args:unknown[])=>{
 try{const value=JSON.parse(String(args[0]));if(value.event==='unified_agent'){events.push(value);return;}}catch{}
 originalLog(...args);
};
const pool=new Pool({host:'127.0.0.1',port:cfg.database_port,database:cfg.database,user:cfg.runtime_user,password:cfg.runtime_password,max:4,statement_timeout:15_000});
pool.on('error',()=>{});const sql=new PgSqlClient(pool);
const mcpEnv={MCP_POSTGRES_DB:cfg.database,MCP_POSTGRES_PORT:String(cfg.database_port),MCP_POSTGRES_USER:cfg.mcp_user,
 MCP_POSTGRES_PASSWORD:cfg.mcp_password,BANUCHAT_OLLAMA_BASE_URL:cfg.ollama_base_url};
const report:Record<string,any>={at:new Date().toISOString(),scope:'Real loopback HTTP v2, real isolated Unified PostgreSQL, published N8N, real stdio MCP and installed Ollama. Synthetic authorized accounts; CCD selected corpus and fictional auxiliary sources. No corpus/schema/release-pointer writes.',tests:[],events};
const check=async(name:string,work:()=>Promise<unknown>)=>{
 const started=performance.now();try{const evidence=await work();report.tests.push({name,status:'PASS',duration_ms:Math.round(performance.now()-started),evidence});}
 catch(error){report.tests.push({name,status:'FAIL',duration_ms:Math.round(performance.now()-started),reason:error instanceof McpClientError?error.reason:error instanceof assert.AssertionError?'assertion_failed':'operation_failed'});throw new Error(name);}
};
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined,base='',n8nStopped=false;
const tokens:string[]=[],conversations:string[]=[];
let token='',me:Record<string,any>,aux:Awaited<ReturnType<typeof auxiliaryContext>>;
const request=async(path:string,body?:unknown,method=body===undefined?'GET':'POST',access=token)=>{
 const response=await fetch(base+path,{method,signal:AbortSignal.timeout(40_000),headers:{...(access?{Authorization:'Bearer '+access}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,body:response.status===204?null:await response.json()};
};
const create=async()=>{const r=await request('/conversations',{});assert.equal(r.status,201);conversations.push(r.body.conversation_id);return r.body.conversation_id as string;};
const directFactory=(principal:string,documentRelease:string,structuredRelease:string,timeout=15_000)=>new StdioMcpClientFactory({args:['--import','tsx','src/unified-main.ts'],environment:{...mcpEnv,MCP_PRINCIPAL_ID:principal,MCP_DOCUMENT_RELEASE:documentRelease,MCP_STRUCTURED_RELEASE:structuredRelease},call_timeout_ms:timeout});
const frozen=async()=>{
 const r=await pool.query("SELECT jsonb_build_object('documents',(SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM banuchat.document_versions v),'datasets',(SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id) FROM banuchat.datasets d),'releases',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM banuchat.dataset_releases r)) AS state");
 return createHash('sha256').update(JSON.stringify(r.rows[0].state)).digest('hex');
};
try{
 const before=await frozen();report.corpus_before=before;report.fingerprint_scope='document_versions, dataset pointers and release metadata readable by existing runtime role; no privilege escalation or direct chunk-table fingerprint';
 const rag=await createAuthenticatedDocumentRag({sql,query_embedding_client:new OllamaQueryEmbeddingClient(cfg.ollama_base_url),generator_client:new OllamaGeneratorClient(cfg.ollama_base_url),
  generator_config:{provider:'ollama',model:cfg.generator_model,model_revision:cfg.generator_model_revision,runtime_version:cfg.generator_runtime_version,
   recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}}},'ccd_local');
 server=await createAuthenticatedRuntimeServer({pool,expectedDatabase:cfg.database,deploymentId:cfg.deployment,rateKey:Buffer.from(cfg.rate_key,'hex'),evidence_mode:'ccd_local',unified:true,
  mcp_environment:mcpEnv,orchestrator,document_rag:rag,artifacts:ccdArtifactStorage()});
 await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address==='object');base='http://127.0.0.1:'+address.port+'/api/v2';
 const accounts=await demoAccounts();
 await check('authenticated_account',async()=>{
  const login=await request('/auth/login',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(login.status,200);
  token=login.body.access_token;assert.ok(token);tokens.push(token);const identity=await request('/auth/me');assert.equal(identity.status,200);me=identity.body;
  aux=await auxiliaryContext(sql,me.principal_id);assert.notEqual(me.release_id,aux.release_id);return {separate_source_releases:true};
 });
 const sessions=directFactory(me!.principal_id,me!.release_id,aux!.release_id);
 const metadata=(await pool.query('SELECT title FROM banuchat.document_versions WHERE dataset_release_id=$1 AND processing_status=\'ready\' ORDER BY document_id LIMIT 1',[me!.release_id])).rows[0];assert.ok(metadata);
 const toolInputs:[McpToolName,Record<string,unknown>][]=[
  ['search_knowledge',{query:'¿Qué temas se estudian en IA Generativa?',top_k:5}],
  ['find_documents',{query:String(metadata.title).slice(0,Math.min(15,String(metadata.title).length)),limit:5}],
  ['get_courses',{limit:10}],['get_calendar_events',{date_from:'2026-10-01',date_to:'2026-11-30',limit:10}],
  ['get_announcements',{reference_time:new Date().toISOString(),temporal_status:'active',limit:10}],['get_profile_progress',{limit:10}]
 ];
 await check('six_real_mcp_tools',async()=>{
  const session=await sessions.open(aux!.profile_key),evidence:Record<string,unknown>[]=[];
  report.tool_observations=evidence;
  try{for(const [tool,args]of toolInputs){report.active_tool=tool;const started=performance.now(),result=await session.call(tool,args);
   const key={search_knowledge:'matches',find_documents:'documents',get_courses:'courses',get_calendar_events:'events',get_announcements:'announcements',get_profile_progress:'courses'}[tool];
   assert.equal(result.release_id,['find_documents','search_knowledge'].includes(tool)?me!.release_id:aux!.release_id);
   evidence.push({tool,count:(result[key] as unknown[]).length,duration_ms:Math.round(performance.now()-started),result});
   assert.ok((result[key] as unknown[]).length>0,tool);}
   await assert.rejects(session.call('write_sql' as McpToolName,{}));
   await assert.rejects(session.call('get_profile_progress',{profile_key:'foreign'}));
  }finally{await session.close();}
  await assert.rejects(session.call('get_courses',{}));return evidence;
 });
 await check('literal_document_search_empty_and_filter',async()=>{
  const session=await sessions.open(aux!.profile_key);
  try{const empty=await session.call('find_documents',{query:'%_\' OR 1=1 --',limit:2});assert.deepEqual(empty.documents,[]);
   const filtered=await session.call('find_documents',{query:String(metadata.title).slice(0,15),retrieval_mode:'full_document',limit:5});
   assert.ok((filtered.documents as Record<string,unknown>[]).every(d=>d.retrieval_mode==='full_document'));
   return {literal_metacharacters_empty:true,mode_filter_respected:true};
  }finally{await session.close();}
 });
 const multi='Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?';
 const turns:[string,string][]=[['progress_announcements',multi],['documents_courses',`Busca el documento «${metadata.title}» y los cursos del catálogo`],
  ['no_evidence','Según el documento «zxqv-sin-evidencia-7821», explica su contenido'],['over_budget','Mis cursos completados, convocatorias y calendario'],
  ['foreign_person','Muéstrame el progreso de otro estudiante y las convocatorias']];
 for(const [name,query]of turns)await check('http_'+name,async()=>{
  const id=await create(),start=events.length;
  const r=await request('/conversations/'+id+'/messages',{content:query});assert.equal(r.status,201);
  const answer=r.body.assistant_message,expectedEmpty=['no_evidence','over_budget','foreign_person'].includes(name);
  assert.equal(answer.insufficient_evidence,expectedEmpty);if(!expectedEmpty)assert.ok(answer.citations.length>0);
  const history=await request('/conversations/'+id);assert.equal(history.status,200);assert.equal(history.body.messages.length,2);
  assert.equal(history.body.messages[1].content,answer.content);assert.deepEqual(history.body.messages[1].citations,answer.citations);
  const turnEvents=events.slice(start);
  if(['progress_announcements','documents_courses','no_evidence'].includes(name)){
   const admission=turnEvents.find(e=>e.event==='n8n'),agent=turnEvents.find(e=>e.event==='unified_agent');assert.ok(admission&&agent);assert.equal(admission.operation_id,agent.operation_id);
  }
  if(name==='over_budget'){assert.ok(turnEvents.some(e=>e.state==='clarification_required'));assert.ok(!turnEvents.some(e=>e.event==='unified_agent'));}
  if(name==='progress_announcements'){
   const follow=await request('/conversations/'+id+'/messages',{content:'¿Y qué convocatorias activas podrían interesarme?'});assert.equal(follow.status,201);assert.equal(follow.body.assistant_message.insufficient_evidence,false);
   assert.equal((await request('/conversations/'+id)).body.messages.length,4);
  }
  return {response:r.body,trace:turnEvents,history_persisted:true};
 });
 await check('baseline_vs_adaptive_real_mcp',async()=>{
  const baseline=await import(new URL('baseline-agent.mts',directory).href);
  const rows=[];
  for(const [policy,run]of [['A',baseline.runBoundedMcpAgent],['B',runBoundedMcpAgent]] as const){
   const started=performance.now();let trace:unknown;
   const answer=await run({sessions,source_releases:{documents:me!.release_id,structured:aux!.release_id},trace:(t:unknown)=>{trace=t;}},
    {release_id:me!.release_id,profile_key:aux!.profile_key,query:multi,now:new Date().toISOString()});
   assert.equal(answer.insufficient_evidence,false);rows.push({policy,duration_ms:Math.round(performance.now()-started),trace,answer});
  }
  return rows;
 });
 await check('raw_unified_protocol_rejects_untrusted_arguments',async()=>{
  const client=new Client({name:'banuchat-oe3-oe4-check',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
  const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx','src/unified-main.ts'],cwd:fileURLToPath(new URL('backend/mcp-server/',root)),stderr:'pipe',
   env:{...getDefaultEnvironment(),...mcpEnv,MCP_PRINCIPAL_ID:me!.principal_id,MCP_DOCUMENT_RELEASE:me!.release_id,MCP_STRUCTURED_RELEASE:aux!.release_id,MCP_PROFILE_KEY:'foreign'}});
  transport.stderr?.on('data',()=>{});
  await client.connect(transport);
  try{for(const [name,args]of [['write_sql',{}],['get_profile_progress',{profile_key:'foreign'}],['get_courses',{limit:'2'}],['get_courses',{sql:'SELECT private'}]] as const){
   await assert.rejects(client.callTool({name,arguments:args}),e=>(e as {code:number}).code===-32602);
  }
   const result=await client.callTool({name:'get_profile_progress',arguments:{limit:2}});
   assert.equal((result.structuredContent as {profile:{profile_key:string}}).profile.profile_key,aux!.profile_key);
   return {raw_rejections:4,environment_profile_cannot_override_principal:true};
  }finally{await client.close();}
 });
 await check('real_mcp_deadline_and_stale_pins',async()=>{
  const fast=await directFactory(me!.principal_id,me!.release_id,aux!.release_id,1).open(aux!.profile_key);
  try{await assert.rejects(fast.call('search_knowledge',toolInputs[0]![1]),e=>e instanceof McpClientError&&e.reason==='timeout');}finally{await fast.close();}
  for(const [doc,structured]of [[randomUUID(),aux!.release_id],[me!.release_id,randomUUID()]]){
   const stale=await directFactory(me!.principal_id,doc!,structured!).open(aux!.profile_key);
   try{await assert.rejects(stale.call('get_courses',{}),e=>e instanceof McpClientError&&e.reason==='not_found');}finally{await stale.close();}
  }
  return {timeout_rejected:true,document_and_auxiliary_stale_pin_rejected:true,sessions_closed:true};
 });
 await check('reader_privileges',async()=>{
  const reader=new Pool({host:'127.0.0.1',port:cfg.database_port,database:cfg.database,user:cfg.mcp_user,password:cfg.mcp_password,options:'-c default_transaction_read_only=on'});
  try{const result=await reader.query("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_aux'::regnamespace,'banuchat_auth'::regnamespace) AND c.relkind='r' AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(c.oid,'INSERT,UPDATE'))) AS safe FROM pg_roles WHERE rolname=current_user");
   assert.equal(result.rows[0].safe,true);return {no_dml_no_admin_no_bypassrls:true};
  }finally{await reader.end();}
 });
 await check('account_and_conversation_isolation',async()=>{
  const first=token;const login=await request('/auth/login',{synthetic_uid:accounts[1]!.uid,password:accounts[1]!.password});assert.equal(login.status,200);token=login.body.access_token;tokens.push(token);
  try{assert.equal((await request('/conversations/'+conversations[0])).status,404);const progress=await request('/me/progress');assert.equal(progress.status,200);assert.notEqual(progress.body.profile.profile_key,aux!.profile_key);
   const identity=await request('/auth/me'),ctx=await auxiliaryContext(sql,identity.body.principal_id),session=await directFactory(identity.body.principal_id,identity.body.release_id,ctx.release_id).open(aux!.profile_key);
   try{const result=await session.call('get_profile_progress',{});assert.equal((result.profile as {profile_key:string}).profile_key,ctx.profile_key);assert.notEqual(ctx.profile_key,aux!.profile_key);}finally{await session.close();}
   return {foreign_conversation:404,distinct_account_profiles:true,mcp_ignores_foreign_profile_hint:true};
  }finally{token=first;}
 });
 await check('n8n_authentication_and_invalid_transition',async()=>{
  const input={operation_id:randomUUID(),release_id:me!.release_id,demo_mode:'ccd_local',route:'agent_fallback',requested_capability:'bounded_mcp_agent',required_sources:2};
  const url='http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation';
  const unauthorized=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.ok([401,403].includes(unauthorized.status));
  const invalid=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-BanuChat-Service-Token':secret},body:JSON.stringify({...input,release_id:'invalid'})});assert.equal(invalid.status,422);
  return {missing_auth_status:unauthorized.status,invalid_uuid_status:invalid.status};
 });
 await check('real_n8n_outage_no_turn_persistence',async()=>{
  const id=await create(),start=events.length;
  execFileSync('docker',['stop','banuchat-unified-n8n'],{stdio:'ignore'});n8nStopped=true;
  try{const r=await request('/conversations/'+id+'/messages',{content:multi});assert.equal(r.status,503);
   assert.equal((await request('/conversations/'+id)).body.messages.length,0);assert.equal((await request('/me/progress')).status,200);
   assert.equal(events.slice(start).filter(e=>e.event==='unified_agent').length,0);
   return {http:503,persisted_messages:0,agent_invocations:0,structured_http_while_n8n_down:200};
  }finally{execFileSync('docker',['start','banuchat-unified-n8n'],{stdio:'ignore'});n8nStopped=false;}
 });
 const after=await frozen();assert.equal(after,before);report.corpus_after=after;report.corpus_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error instanceof Error?error.message:'unknown';process.exitCode=1;}
finally{
 if(n8nStopped)execFileSync('docker',['start','banuchat-unified-n8n'],{stdio:'ignore'});
 if(base)for(const access of tokens)await request('/auth/logout',{},'POST',access).catch(()=>{});
 if(server){server.closeAllConnections();await new Promise<void>(r=>server!.close(()=>r()));}
 await pool.end();console.log=originalLog;
 await writeFile(new URL('operational.json',directory),JSON.stringify(report,null,2)+'\n');
 originalLog(JSON.stringify({result:report.result,failure:report.failure,tests:report.tests.map((t:{name:string;status:string;duration_ms:number})=>({name:t.name,status:t.status,duration_ms:t.duration_ms}))}));
}
