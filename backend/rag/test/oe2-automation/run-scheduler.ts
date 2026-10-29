import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer,type Server} from 'node:http';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {createOe2FixtureService} from '../../src/oe2/main.js';
import {createOe2HttpServer} from '../../src/oe2/server.js';
import {extractOe2Fixture} from '../../src/oe2/flow.js';
import {categories,container,dockerAsync,executions,guardContainer,importTestWorkflows,root,stopTestSchedules,waitN8n,workflowHash} from './n8n-control.js';

guardContainer();
const directory=new URL('infra/local/oe2-oe4-automation-01/run-'+Date.now()+'/',root);
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('result.json',directory))],{stdio:'ignore'});
const fixtures=new URL('fixtures/',directory),state=new URL('state/',directory);
await Promise.all([mkdir(fixtures,{recursive:true}),mkdir(state,{recursive:true})]);
const files=['academic-offer.json','calls.json','news.json'];
const originals=await Promise.all(files.map(f=>readFile(new URL('eval/oe2/fixtures/'+f,root))));
const token=randomBytes(32).toString('base64url');
const service=createOe2FixtureService(fileURLToPath(fixtures),fileURLToPath(state));
const backend=createOe2HttpServer(service,token);
let phase='setup',fault:'none'|'status_unavailable'|'drop_run_response'='none';
interface RequestTrace {phase:string;operation_id:string;path:string;category:string;started_at:string;finished_at?:string;status?:number;delivered?:boolean;body?:unknown;duration_ms?:number}
const requests:RequestTrace[]=[];
const proxy=createServer((req,res)=>void(async()=>{
 if(req.headers.authorization!=='Bearer '+token){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error_code":"UNAUTHORIZED"}');return;}
 const started=performance.now();let bytes='';for await(const part of req){bytes+=String(part);if(Buffer.byteLength(bytes)>16*1024)throw new Error('test_proxy_body_limit');}
 const input=JSON.parse(bytes) as {category:string},path=req.url??'';
 const entry:RequestTrace={phase,operation_id:String(req.headers['x-banuchat-operation-id']??''),path,category:input.category,started_at:new Date().toISOString()};requests.push(entry);
 try{
  if(fault==='status_unavailable'&&path.endsWith('/status')){
   entry.status=503;entry.body={error_code:'TEST_DEPENDENCY_UNAVAILABLE'};entry.delivered=true;
   res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify(entry.body));return;
  }
  const response=await fetch('http://127.0.0.1:3011'+path,{method:'POST',signal:AbortSignal.timeout(10_000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,
   'X-BanuChat-Operation-Id':entry.operation_id},body:bytes});
  const raw=await response.text();entry.status=response.status;entry.body=JSON.parse(raw);
  if(fault==='drop_run_response'&&path.endsWith('/run')){entry.delivered=false;res.destroy();return;}
  entry.delivered=true;res.writeHead(response.status,{'Content-Type':'application/json'});res.end(raw);
 }finally{entry.finished_at=new Date().toISOString();entry.duration_ms=Math.round(performance.now()-started);}
})().catch(()=>{res.destroy();}));
async function listen(server:Server,port:number){await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}
async function close(server:Server){if(server.listening){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}}
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);
const observer=new Pool({host:'127.0.0.1',port:cfg.database_port,database:cfg.database,user:cfg.runtime_user,password:cfg.runtime_password,options:'-c default_transaction_read_only=on',statement_timeout:10_000});
observer.on('error',()=>{});
async function fingerprint(){
 const tables=(await observer.query<{schema:string;table:string}>("SELECT n.nspname AS schema,c.relname AS table FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('banuchat','banuchat_aux','banuchat_auth') AND c.relkind='r' AND has_table_privilege(c.oid,'SELECT') ORDER BY 1,2")).rows;
 const result:Record<string,unknown>={};
 for(const {schema,table}of tables){assert.match(schema,/^banuchat(?:_aux|_auth)?$/u);assert.match(table,/^[a-z_]+$/u);
  result[schema+'.'+table]=(await observer.query(`SELECT count(*)::int AS rows,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) AS hash FROM "${schema}"."${table}" t`)).rows[0];
 }
 return result;
}
const report:Record<string,any>={at:new Date().toISOString(),scope:'Authorized local fixtures; real Unified N8N scheduler at 10 seconds; no institutional acquisition or SQL publication.',requests,stages:[],result:'RUNNING'};
let ids:string[]=[],beforeWorkflows:Array<Record<string,any>>=[],cleanupNeeded=false;
const save=()=>writeFile(new URL('result.json',directory),JSON.stringify(report,null,2)+'\n');
const snapshotBytes=async()=>Promise.all(categories.map(c=>readFile(new URL(c+'.json',state),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;})));
const hashes=(values:(string|null)[])=>values.map(v=>v===null?null:createHash('sha256').update(v).digest('hex'));
const variant=(i:number,version:number)=>{
 const data=JSON.parse(originals[i]!.toString('utf8'));
 data.records[0].title+=' — cambio controlado '+version;data.records[0].source_version='fixture-automation-'+version;
 const added={...data.records[1],id:data.records[1].id+'-ADDED',title:'Registro añadido de demostración',source_version:'fixture-automation-'+version};
 data.records=[data.records[0],added];return data;
};
const setSources=async(data:unknown[])=>{
 phase='transition';
 for(let i=0;i<files.length;i++){const temporary=new URL(files[i]+'.next',fixtures),target=new URL(files[i]!,fixtures);
  await writeFile(temporary,JSON.stringify(data[i],null,2)+'\n');await rename(temporary,target);}
};
async function observe(name:string,expected:'success'|'error',options:{noRun?:boolean;preserve?:boolean;changes?:Record<string,number>;dropped?:boolean;initial?:boolean}={}){
 const previous=options.initial?[null,null,null]:await snapshotBytes(),seen=new Set(options.initial?[]:executions(ids).map(e=>String(e.id))),started=performance.now();phase=name;
 const rows:Record<string,any>[]=[];
 for(let attempt=0;attempt<55;attempt++){
  await new Promise(r=>setTimeout(r,1000));
  const completed=executions(ids).filter(e=>!seen.has(String(e.id))&&e.stoppedAt&&requests.some(r=>r.phase===name&&r.operation_id===String(e.id)));
  if(ids.every(id=>completed.some(e=>e.workflowId===id))){rows.push(...completed);break;}
 }
 assert.ok(rows.length>=3,'scheduler_did_not_execute_each_category');
 for(const execution of rows){
  assert.equal(execution.mode,'trigger');assert.equal(execution.status,expected);assert.equal(execution.retryOf,null);
  const trace=requests.filter(r=>r.operation_id===String(execution.id));
  assert.ok(trace[0]!.path.endsWith('/status'));
  const runs=trace.filter(r=>r.path.endsWith('/run'));assert.equal(runs.length,options.noRun?0:1);
  if(expected==='error'&&!options.noRun)assert.ok(trace.at(-1)!.path.endsWith('/status'),'failure_not_reconciled');
  if(options.changes)assert.deepEqual((runs[0]!.body as {changes:unknown}).changes,options.changes);
  if(options.dropped){assert.equal(runs[0]!.status,200);assert.equal(runs[0]!.delivered,false);assert.equal(trace.at(-1)!.status,200);}
 }
 const after=await snapshotBytes();if(options.preserve)assert.deepEqual(after,previous);
 // Independently compare transformed fixture fields, not just record counts.
 if(expected==='success'||options.dropped)for(let i=0;i<categories.length;i++){
  const sourceId=['fixture-academic-offer-v1','fixture-calls-v1','fixture-news-v1'][i]!;
  const records=extractOe2Fixture(await readFile(new URL(files[i]!,fixtures)),categories[i]!,sourceId);
  assert.deepEqual(JSON.parse(after[i]!).records,records);
 }
 const entry={name,status:'PASS',expected_execution_status:expected,execution_ids:rows.map(e=>String(e.id)),executions:rows.map(e=>({id:String(e.id),workflow_id:e.workflowId,mode:e.mode,status:e.status,started_at:e.startedAt,stopped_at:e.stoppedAt,retry_of:e.retryOf})),duration_ms:Math.round(performance.now()-started),snapshot_hashes_before:hashes(previous),snapshot_hashes_after:hashes(after)};
 report.stages.push(entry);await save();console.log(JSON.stringify({stage:name,status:'PASS',executions:rows.length,duration_ms:entry.duration_ms}));
}
try{
 for(let i=0;i<files.length;i++)await writeFile(new URL(files[i]!,fixtures),originals[i]!,{flag:'wx'});
 report.protected_before=await fingerprint();
 assert.ok(Object.keys(report.protected_before).some(t=>t==='banuchat.dataset_releases'));
 const current=(await observer.query("SELECT r.id,r.dataset_schema_version,r.manifest_sha256 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id WHERE d.id=1")).rows[0];
 assert.equal(current.dataset_schema_version,'ccd-1.4.0');report.protected_release=current;
 await listen(backend,3011);await listen(proxy,3014);
 // Attest container-to-loopback reachability before activating anything.
 const reachable=JSON.parse(await dockerAsync(['exec',container,'node','-e',"fetch('http://host.docker.internal:3014/internal/oe2/status',{method:'POST',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json','X-BanuChat-Operation-Id':'preflight'},body:JSON.stringify({category:'news'})}).then(async r=>process.stdout.write(JSON.stringify({status:r.status,body:await r.json()})))"]));
 assert.equal(reachable.status,401);
 assert.equal((await fetch('http://127.0.0.1:3011/internal/oe2/status',{method:'POST'})).status,401);
 const imported=await importTestWorkflows(directory,token,'http://host.docker.internal:3014');ids=imported.ids;beforeWorkflows=imported.before;
 report.workflow_ids=ids;cleanupNeeded=true;
 assert.deepEqual(await snapshotBytes(),[null,null,null]);phase='initial_acquisition';
 for(const id of ids)await dockerAsync(['exec',container,'n8n','publish:workflow','--id='+id]);
 await dockerAsync(['restart',container]);await waitN8n();
 await observe('initial_acquisition','success',{initial:true,changes:{created:2,modified:0,deleted:0,unchanged:0}});
 await observe('repeated_unchanged','success',{preserve:true,changes:{created:0,modified:0,deleted:0,unchanged:2}});
 await setSources(categories.map((_,i)=>variant(i,1)));
 await observe('created_modified_deleted','success',{changes:{created:1,modified:1,deleted:1,unchanged:0}});
 await setSources(categories.map((_,i)=>{const v=variant(i,1);v.records.push(v.records[0]);return v;}));
 await observe('duplicate_records','error',{preserve:true});
 await setSources(categories.map((category)=>({schema_version:'oe2-fixture-1',category,records:[]})));
 await observe('empty_source','error',{preserve:true});
 await setSources(categories.map((_,i)=>{const v=variant(i,1);v.records[0].published_at='2026-02-30T10:00:00-05:00';return v;}));
 await observe('invalid_calendar_date','error',{preserve:true});
 phase='transition';for(const file of files)await rename(new URL(file,fixtures),new URL(file+'.offline',fixtures));
 await observe('temporary_source_unavailable','error',{preserve:true});
 await setSources(categories.map((_,i)=>variant(i,1)));
 fault='status_unavailable';await observe('status_dependency_unavailable','error',{noRun:true,preserve:true});fault='none';
 await setSources(categories.map((_,i)=>variant(i,2)));
 fault='drop_run_response';await observe('lost_response_reconciled','error',{dropped:true});fault='none';
 await observe('recovery_after_state_check','success',{preserve:true,changes:{created:0,modified:0,deleted:0,unchanged:2}});
 phase='transition';for(const c of categories)await writeFile(new URL(c+'.lock',state),JSON.stringify({test_hold:true}),{flag:'wx'});
 try{await observe('busy_state_no_automatic_recovery','error',{noRun:true,preserve:true});}
 finally{for(const c of categories)await unlink(new URL(c+'.lock',state));}
 report.executions=executions(ids,true);
 assert.ok(report.executions.every((e:Record<string,any>)=>e.mode==='trigger'));
 report.protected_after=await fingerprint();assert.deepEqual(report.protected_after,report.protected_before);
 report.protected_data_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error instanceof assert.AssertionError?{type:'assertion',message:error.message.slice(0,200)}:{type:'operation_failed'};process.exitCode=1;}
finally{
 phase='cleanup';fault='none';
 if(cleanupNeeded){try{
  const after=await stopTestSchedules(ids);cleanupNeeded=false;
  const conversationBefore=beforeWorkflows.find(w=>w.id==='BanuChatOe4Conversation1')!,conversationAfter=after.find(w=>w.id==='BanuChatOe4Conversation1')!;
  assert.equal(workflowHash(conversationAfter),workflowHash(conversationBefore));assert.equal(conversationAfter.active,true);
  report.conversation_workflow_unchanged=true;report.test_schedules_inactive=ids.every(id=>after.find(w=>w.id===id)?.active===false);
  report.executions=executions(ids,true);
  const count=executions(ids).length;await new Promise(r=>setTimeout(r,12_000));assert.equal(executions(ids).length,count);report.no_execution_after_deactivation=true;
 }catch{report.cleanup_failure='test_schedule_deactivation_or_protected_workflow_check_failed';report.result='FAIL';process.exitCode=1;}}
 await Promise.all([close(proxy),close(backend)]);await observer.end();
 report.test_services_stopped=!proxy.listening&&!backend.listening;
 report.final_n8n_health=(await fetch('http://127.0.0.1:15679/healthz').catch(()=>undefined))?.status;
 report.final_api_anonymous_status=(await fetch('http://127.0.0.1:3004/api/v2/auth/me').catch(()=>undefined))?.status;
 await save();console.log(JSON.stringify({result:report.result,failure:report.failure,cleanup_failure:report.cleanup_failure,stages_passed:report.stages.length,test_schedules_inactive:report.test_schedules_inactive,conversation_workflow_unchanged:report.conversation_workflow_unchanged,directory:fileURLToPath(directory)}));
}
