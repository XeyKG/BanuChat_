/** Fixed-budget runner. No raw HTTP bodies, credentials, SQL or corpus text in reports. */
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,open,stat,realpath} from 'node:fs/promises';
import {resolve,isAbsolute,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import type {LatencyTrace} from './unified-latency-observer.mjs';

const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const BASE=resolve(process.env.LOCALAPPDATA??ROOT,'BanuChat/diagnostics/OE1-OE6-LATENCY-DIAG-01');
const questions=[
 ['D1','¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'],
 ['D2','¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'],
 ['D3','¿Qué temas se estudian en el curso de Analítica y Ciencia de Datos?'],
 ['D4','¿Qué temas se estudian en el curso de Creación de Contenidos Digitales?'],
 ['D5','¿Cuál es el costo documentado de un curso CCD en 2026 y qué se sabe de 2027?'],
 ['D6','¿Cuál es el horario de atención confirmado del CCD para el domingo de 2030?'],
] as const;
type Row=Record<string,unknown>;
type Snapshot={files:Record<string,string>;tables:Record<string,string>;foreign:Record<string,string>;oe2:string;n8n:string;identities:string;models:string;artifacts:string;current:string};
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
function fail(code:string):never {throw new Error(code);}
const isRow=(v:unknown):v is Row=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):string=>typeof v==='string'?v:fail('invalid_technical_value');
function command(program:string,args:string[],input?:string):string{
 const env={...process.env};if(program==='powershell')delete env.PSModulePath;
 try{return execFileSync(program,args,{cwd:ROOT,env,...(input===undefined?{}:{input}),encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:16*1024*1024});}catch{return fail('local_dependency_command_failed');}
}
const docker=(args:string[],input?:string)=>command('docker',args,input);
async function saved(dir:string,name:string,value:unknown,exclusive=false){await writeFile(resolve(dir,name),JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});}
async function protect(dir:string){
 if(process.platform!=='win32'||!process.env.LOCALAPPDATA||!dir.startsWith(BASE+sep))fail('private_directory_rejected');
 await mkdir(dir,{recursive:true});const physical=await realpath(dir),local=await realpath(process.env.LOCALAPPDATA);
 const r=relative(local,physical);if(!r||r.startsWith('..')||isAbsolute(r)||physical.startsWith(ROOT+sep))fail('private_custody_rejected');
 const sid=command('whoami',['/user','/fo','csv','/nh']).match(/S-1-[0-9-]+/)?.[0];if(!sid)fail('custodian_missing');
 command('icacls',[dir,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)(F)']);
}
async function residency(){
 const r=await fetch('http://127.0.0.1:11434/api/ps',{signal:AbortSignal.timeout(10000)});
 if(!r.ok)fail('model_residency_unavailable');const body:unknown=await r.json();
 if(!isRow(body)||!Array.isArray(body.models))fail('model_residency_invalid');
 return body.models.map((v:unknown)=>{if(!isRow(v))return {};return {name:v.name,size:v.size,size_vram:v.size_vram,expires_at:v.expires_at};});
}
function inspection(name:string):Row {
 const d=JSON.parse(docker(['inspect',name]))[0] as Row;
 const state=d.State as Row,mounts=d.Mounts as Row[],config=d.Config as Row,host=d.HostConfig as Row;
 const volume=name==='banuchat-unified-postgres'?'banuchat-unified-data':name==='banuchat-unified-n8n'?'banuchat-unified-n8n-data':'banuchat-schema-test_pgvector_data';
 if(d.Name!=='/'+name||state.Running!==true||mounts.length!==1||mounts[0]?.Name!==volume)fail('source_identity_rejected');
 return {id:d.Id,image:d.Image,started:state.StartedAt,restarts:d.RestartCount,volume,network:host.NetworkMode,ports:host.PortBindings,
  ...(name==='banuchat-unified-postgres'?{admin_env:config.Env}:{})};
}
async function context(){
 const cfg=JSON.parse(await readFile(resolve(ROOT,'infra/local/unified/application.json'),'utf8')) as Row;
 if(cfg.database!=='banuchat_unified'||cfg.database_port!==55463||cfg.api_port!==3004)fail('unified_configuration_rejected');
 const inspected=inspection('banuchat-unified-postgres');
 const env=Object.fromEntries((inspected.admin_env as string[]).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
 const db=new Pool({host:'127.0.0.1',port:55463,database:'banuchat_unified',user:env.POSTGRES_USER,password:env.POSTGRES_PASSWORD,
  max:1,connectionTimeoutMillis:5000,statement_timeout:15000,options:'-c default_transaction_read_only=on'});
 const accounts=await demoAccounts(),account=accounts[0];if(!account)fail('existing_demo_account_missing');
 const owner=(await db.query<{id:string}>('SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid=$1',[account.uid])).rows[0]?.id;
 if(!owner)fail('demo_principal_missing');
 return {db,cfg,account,owner};
}
async function snapshot(db:Pool,owner:string):Promise<Snapshot>{
 const files:Record<string,string>={};
 const tracked=command('git',['ls-files']).trim().split(/\r?\n/);
 for(const path of [...tracked,'infra/local/unified/application.json','infra/local/unified/oe2-reader.json','infra/local/oe6/n8n-conversation.env']){
  files[path]=sha(await readFile(resolve(ROOT,path)));
 }
 const tables:Record<string,string>={};
 const names=(await db.query<{schema:string;name:string}>(`SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN('banuchat','banuchat_aux') AND c.relname NOT IN('conversations','messages','message_citations','turn_sources') ORDER BY 1,2`)).rows;
 for(const t of names){
  if(!/^[a-z_]+$/.test(t.schema+t.name))fail('table_identity_rejected');
  tables[t.schema+'.'+t.name]=text((await db.query<{hash:string}>(`SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]'),'UTF8')),'hex') hash FROM "${t.schema}"."${t.name}" t`)).rows[0]?.hash);
 }
 const foreign:Record<string,string>={};
 const filters:Record<string,string>={
  'banuchat_auth.sessions':'principal_id<>$1::uuid',
  'banuchat_auth.accounts':'id<>$1::uuid',
  'banuchat_auth.conversation_owners':'principal_id<>$1::uuid',
  'banuchat_auth.refresh_tokens':'session_id NOT IN(SELECT id FROM banuchat_auth.sessions WHERE principal_id=$1)',
  'banuchat.conversations':'id NOT IN(SELECT conversation_id FROM banuchat_auth.conversation_owners WHERE principal_id=$1)',
  'banuchat.messages':'conversation_id NOT IN(SELECT conversation_id FROM banuchat_auth.conversation_owners WHERE principal_id=$1)',
  'banuchat.message_citations':'message_id NOT IN(SELECT m.id FROM banuchat.messages m JOIN banuchat_auth.conversation_owners o ON o.conversation_id=m.conversation_id WHERE o.principal_id=$1)',
  'banuchat_aux.turn_sources':'message_id NOT IN(SELECT m.id FROM banuchat.messages m JOIN banuchat_auth.conversation_owners o ON o.conversation_id=m.conversation_id WHERE o.principal_id=$1)',
 };
 for(const [table,where]of Object.entries(filters))foreign[table]=text((await db.query<{hash:string}>(`SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]'),'UTF8')),'hex') hash FROM ${table} t WHERE ${where}`,[owner])).rows[0]?.hash);
 const docs=(await db.query<{source_path:string;source_sha256:string}>(`SELECT v.source_path,v.source_sha256 FROM banuchat.document_versions v JOIN banuchat.datasets d ON d.current_release_id=v.dataset_release_id`)).rows;
 const artifactHashes:string[]=[];
 for(const doc of docs){if(!/^documents\/artifacts\/[a-z0-9_-]+\.md$/.test(doc.source_path))fail('artifact_reference_invalid');const b=await readFile(resolve(ROOT,'data/ccd/local/product-knowledge-v2',doc.source_path));if(sha(b)!==doc.source_sha256)fail('current_artifact_mismatch');artifactHashes.push(sha(b));}
 const other=inspection('banuchat-oe6-local-postgres-synthetic-1');
 const n8n=inspection('banuchat-unified-n8n');
 const n8nHash=docker(['exec','banuchat-unified-n8n','node','-e',`const {DatabaseSync}=require('node:sqlite');const {createHash}=require('node:crypto');const d=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});d.exec('BEGIN');const x=[d.prepare('SELECT id,active,versionId,activeVersionId,nodes,connections,settings FROM workflow_entity ORDER BY id').all(),d.prepare('SELECT versionId,workflowId,nodes,connections FROM workflow_history ORDER BY versionId').all()];d.exec('ROLLBACK');d.close();process.stdout.write(createHash('sha256').update(JSON.stringify(x)).digest('hex'));`]).trim();
 const oe2Inspect=JSON.parse(docker(['inspect','banuchat-oe6-local-postgres-synthetic-1']))[0] as {Config:{Env:string[]}};
 const oe2User=oe2Inspect.Config.Env.find(s=>s.startsWith('POSTGRES_USER='))?.slice(14);if(!oe2User)fail('oe2_reader_unavailable');
 const oe2Tables=['scope','datasets','releases','sources','origins','announcements','programming'];
 const oe2Sql="BEGIN READ ONLY;SELECT jsonb_build_array("+oe2Tables.map(n=>`(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]'),'UTF8')),'hex') FROM public.oe2_pipeline_${n} t)`).join(',')+");ROLLBACK;";
 const oe2=sha(docker(['exec','-i','banuchat-oe6-local-postgres-synthetic-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',oe2User,'-d','postgres'],oe2Sql));
 const source=inspection('banuchat-unified-postgres');delete source.admin_env;
 const tags=await fetch('http://127.0.0.1:11434/api/tags').then(r=>r.json()) as {models:Array<{name:string;digest:string}>};
 const current=(await db.query('SELECT d.current_release_id,r.manifest_sha256 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id')).rows;
 return {files,tables,foreign,oe2,n8n:n8nHash,identities:JSON.stringify([source,other,n8n]),models:JSON.stringify(tags.models.map(m=>[m.name,m.digest]).sort()),artifacts:sha(artifactHashes.sort().join('')),current:JSON.stringify(current)};
}
export function statistics(values:number[]){
 // HTTP samples are recorded to microseconds. Sum integer ticks before display rounding.
 const sorted=values.map(v=>Math.round(v*1000)).sort((a,b)=>a-b),n=sorted.length;
 return {n,mean_ms:n?sorted.reduce((a,b)=>a+b,0)/n/1000:null,
  median_ms:n?(n%2?sorted[Math.floor(n/2)]!:((sorted[n/2-1]??0)+(sorted[n/2]??0))/2)/1000:null,
  max_ms:n?sorted.at(-1)!/1000:null};
}
export function summarizedTrace(trace:LatencyTrace){
 const group=(names:string[])=>{const spans=trace.spans.filter(s=>names.includes(s.stage));return {calls:spans.length,wall_ms:Math.round(spans.reduce((n,s)=>n+s.duration_ms,0)*1000)/1000};};
 return {server_ms:trace.server_ms,timings:{
  router:group(['router']),embedding_inclusive:group(['embedding']),embedding_verification_subset:group(['embedding_verify']),
  reference_guard_and_retrieval_rpc:group(['sql_retrieval','sql_guard']),generator_inclusive:group(['generator']),
  generator_verification_subset:group(['generator_verify']),persist_rpc:group(['sql_persist']),
  evidence_preparation:'NOT_MEASURED',answer_validation:'NOT_MEASURED',complete_query_resolution:'NOT_MEASURED',pool_acquisition:'NOT_MEASURED'},
  verification_http_calls:trace.spans.filter(s=>s.endpoint&&['/api/version','/api/tags','/api/show'].includes(s.endpoint)).length,
  inference_calls:trace.spans.filter(s=>s.endpoint==='/api/embed'||s.endpoint==='/api/chat').map(s=>({endpoint:s.endpoint,wall_ms:s.duration_ms,reported:s.metrics??{}}))};
}
export async function main(args:string[]){
 const mode=args[0];if(!['--prepare','--measure','--publish'].includes(mode??'')||args.length!==(mode==='--prepare'?1:2))fail('explicit_mode_required');
 const run=mode==='--prepare'?randomUUID():args[1]!;if(!/^[a-f0-9-]{36}$/.test(run))fail('invalid_run_id');
 const dir=resolve(BASE,run);
 if(mode==='--prepare'){
  await protect(dir);const c=await context();
  try{
   const initialResidency=await residency(),before=await snapshot(c.db,c.owner);
   const plan={run,at:new Date().toISOString(),protocol_sha256:sha(await readFile(resolve(ROOT,'eval/oe6/latency-diagnostic-protocol.md'))),
    observer_sha256:sha(await readFile(resolve(ROOT,'backend/api/scripts/unified-latency-observer.mts'))),document_limit:6,control_limit:2,order:['C1',...questions.map(q=>q[0]),'C2'],initial_residency:initialResidency,
    configuration:{generator_model:c.cfg.generator_model,generator_revision:c.cfg.generator_model_revision,generator_runtime:c.cfg.generator_runtime_version,embedding:'qwen3-embedding:0.6b',dimension:1024},before};
   await saved(dir,'plan-private.json',plan,true);console.log(JSON.stringify({status:'PLAN_READY',run,order:plan.order,initial_residency:initialResidency}));
  }finally{await c.db.end();}
  return;
 }
 const plan=JSON.parse(await readFile(resolve(dir,'plan-private.json'),'utf8')) as {run:string;protocol_sha256:string;observer_sha256:string;before:Snapshot};
 if(plan.run!==run||plan.protocol_sha256!==sha(await readFile(resolve(ROOT,'eval/oe6/latency-diagnostic-protocol.md')))||plan.observer_sha256!==sha(await readFile(resolve(ROOT,'backend/api/scripts/unified-latency-observer.mts'))))fail('fixed_plan_changed');
 if(mode==='--publish'){
  const report=JSON.parse(await readFile(resolve(dir,'measurement-private.json'),'utf8')) as {results:Array<{qid:string;http_ms:number;status:number;trace?:LatencyTrace}>;preservation:Record<string,boolean>;error?:string};
  const documents=report.results.filter(r=>r.qid.startsWith('D')),controls=report.results.filter(r=>r.qid.startsWith('C'));
  const publicReport={task:'OE1-OE6-LATENCY-DIAG-01',run,configuration:JSON.parse(await readFile(resolve(dir,'plan-private.json'),'utf8')).configuration,
   results:report.results.map(({trace,...r})=>({...r,...(trace?summarizedTrace(trace):{})})),aggregate:{documentary:statistics(documents.map(r=>r.http_ms)),controls:statistics(controls.map(r=>r.http_ms))},preservation:report.preservation,error:report.error??null,
   status:'ANALYSIS_PENDING',limits:{documentary_maximum:6,controls_maximum:2,retries:0,concurrency:1}};
  await writeFile(resolve(ROOT,'eval/oe6/results/unified-latency-2026-10-31.json'),JSON.stringify(publicReport,null,2)+'\n');
  console.log(JSON.stringify({status:'RESULTS_EXPORTED_FOR_ANALYSIS',documents:documents.length,controls:controls.length,preservation:report.preservation}));
  return;
 }
 const marker=await open(resolve(dir,'measurement.started'),'wx');await marker.close();
 const c=await context();let token='',lastConversation:string|undefined;
 const results:Array<Record<string,unknown>>=[],administrative:Array<Record<string,unknown>>=[];
 const report:{results:typeof results;administrative:typeof administrative;preservation:Record<string,boolean>;error?:string;residency:Array<Record<string,unknown>>}={results,administrative,preservation:{},residency:[]};
 const request=async(qid:string,path:string,expected:number,method='GET',body?:unknown)=>{
  const start=performance.now();let status=0;
  try{
   const response=await fetch('http://127.0.0.1:3004'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),'User-Agent':'BanuChat-Latency/'+run+'/'+qid},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});
   status=response.status;const data:unknown=status===204?null:await response.json();
   const row={qid,status,expected,http_ms:Math.round((performance.now()-start)*1000)/1000};
   (/^(D[1-6]|C[12])$/.test(qid)?results:administrative).push(row);
   if(status!==expected)fail('unexpected_http_status');
   return data;
  }catch(error){
   if(![...results,...administrative].some(r=>r.qid===qid))(/^(D[1-6]|C[12])$/.test(qid)?results:administrative).push({qid,status,expected,http_ms:performance.now()-start,error:'transport_error'});
   throw error;
  }
 };
 const chat=async(qid:string,content:string)=>{
  const created=await request('create_'+qid,'/api/v2/conversations',201,'POST',{});
  if(!isRow(created))fail('conversation_creation_failed');lastConversation=text(created.conversation_id);
  await saved(dir,'own-resource-bookkeeping.json',{last_conversation:lastConversation},false);
  const answer=await request(qid,'/api/v2/conversations/'+lastConversation+'/messages',201,'POST',{content});
  if(!isRow(answer)||!isRow(answer.assistant_message))fail('response_metadata_invalid');
  const message=answer.assistant_message,citations=Array.isArray(message.citations)?message.citations:[];
  Object.assign(results.at(-1)!,{insufficient_evidence:message.insufficient_evidence,citations:citations.length,document_citations:citations.filter(v=>isRow(v)&&v.source_kind==='document').length});
 };
 try{
  if((await stat(resolve(dir,'trace.jsonl'))).size!==0)fail('trace_not_empty_before_pass');
  report.residency.push({qid:'BEFORE',models:await residency()});
  const login=await request('login','/api/v2/auth/login',200,'POST',{synthetic_uid:c.account.uid,password:c.account.password});
  if(!isRow(login))fail('login_failed');token=text(login.access_token);
  await request('C1','/api/v2/me/progress',200);
  for(const [qid,query]of questions){await chat(qid,query);report.residency.push({qid,models:await residency()});}
  await chat('C2','¿Qué puedes hacer?');
 }catch(error){
  report.error=error instanceof Error&&/^[a-z0-9_]+$/.test(error.message)?error.message:'measurement_failed';
  if(token&&lastConversation){try{const history=await request('inspect_uncertain_history','/api/v2/conversations/'+lastConversation,200);if(isRow(history)&&Array.isArray(history.messages))await saved(dir,'uncertain-count.json',{messages:history.messages.length});}catch{/* No retry. */}}
 }finally{
  if(token){try{await request('logout','/api/v2/auth/logout',204,'POST');token='';}catch{report.error??='logout_failed';}}
  const after=await snapshot(c.db,c.owner);report.preservation=Object.fromEntries(Object.keys(plan.before).map(k=>[k,JSON.stringify(plan.before[k as keyof Snapshot])===JSON.stringify(after[k as keyof Snapshot])]));
  await c.db.end();
  // File reads wait for observation flush only; no HTTP/model request is repeated.
  let traces:LatencyTrace[]=[];
  for(let i=0;i<20;i++){const raw=await readFile(resolve(dir,'trace.jsonl'),'utf8');traces=raw.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l) as LatencyTrace);if(traces.length>=results.length)break;await new Promise(r=>setTimeout(r,50));}
  for(const result of results){const trace=traces.find(t=>t.qid===result.qid);if(trace)result.trace=trace;else report.error??='trace_missing';}
  if(traces.length!==results.length)report.error??='correlation_count_mismatch';
  if(Object.values(report.preservation).some(v=>!v))report.error??='protected_state_changed';
  await saved(dir,'measurement-private.json',report);
 }
 console.log(JSON.stringify({status:report.error?'MEASUREMENT_PARTIAL':'MEASURED',run,requests:results.map(({trace,...r})=>r),preservation:report.preservation,error:report.error??null}));
 if(report.error)process.exitCode=1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main(process.argv.slice(2)).catch(()=>{console.error('{"status":"LATENCY_DIAG_PARTIAL","reason":"diagnostic_step_failed"}');process.exitCode=1;});
