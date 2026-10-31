import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Pool} from 'pg';
import {CATEGORIES,POLICY,plannedFixtureIdentity,type DemoApproval} from '../../src/oe2/pipeline/projection.js';
import type {Oe2Category} from '../../src/oe2/types.js';
import {docker,dockerAsync,exportWorkflows,workflowHash,waitN8n,guardContainer,root} from '../oe2-automation/n8n-control.js';

guardContainer();
const pgContainer='banuchat-oe6-local-postgres-synthetic-1',n8n='banuchat-unified-n8n';
const rootDirectory=new URL('infra/local/oe2-pipeline-02/',root),stamp=Date.now().toString(36),directory=new URL('run-'+stamp+'/',rootDirectory);
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('result.json',directory))],{stdio:'ignore'});
await mkdir(directory,{recursive:true});
const inputs=new URL('inputs/',directory),outputs=new URL('outputs/',directory),bundle=new URL('bundle/',directory);
await Promise.all([mkdir(new URL('fixtures/',inputs),{recursive:true}),mkdir(outputs),mkdir(bundle)]);
const initialPg=JSON.parse(docker(['inspect',pgContainer]))[0];assert.equal(initialPg.HostConfig.NetworkMode,'host');
assert.ok(initialPg.Mounts.some((m:{Name:string})=>m.Name==='banuchat-schema-test_pgvector_data'));
if(!initialPg.State.Running)await dockerAsync(['start',pgContainer]);
const restorePgStopped=!initialPg.State.Running||process.argv.includes('--restore-synthetic-stop');
const image=JSON.parse(docker(['inspect',n8n]))[0].Config.Image as string;
const pgInspect=JSON.parse(docker(['inspect',pgContainer]))[0];
const pgUser=(pgInspect.Config.Env as string[]).find(e=>e.startsWith('POSTGRES_USER='))!.slice('POSTGRES_USER='.length);
assert.match(pgUser,/^[a-zA-Z0-9_]+$/u);
function psql(sql:string,database='postgres'){
 return execFileSync('docker',['exec','-i',pgContainer,'psql','-X','-v','ON_ERROR_STOP=1','-U',pgUser,'-d',database,'-At'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:8*1024*1024});
}
const parsePsql=(sql:string,database='postgres')=>JSON.parse(psql(sql,database).trim());
async function baselineFingerprint(){
 const names=parsePsql("SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='banuchat';",'banuchat_schema_test') as string[];
 const rows:Record<string,unknown>={};for(const name of names){assert.match(name,/^[a-z_]+$/u);rows[name]=parsePsql(`SELECT json_build_object('count',count(*),'hash',md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]'))) FROM banuchat.${name} t;`,'banuchat_schema_test');}return rows;
}
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
const observer=new Pool({host:'127.0.0.1',port:55463,database:'banuchat_unified',user:cfg.runtime_user,password:cfg.runtime_password,options:'-c default_transaction_read_only=on'});observer.on('error',()=>{});
async function protectedFingerprint(){const names=(await observer.query<{schema:string;name:string}>("SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('banuchat','banuchat_aux','banuchat_auth') AND c.relkind='r' AND has_table_privilege(c.oid,'SELECT') ORDER BY 1,2")).rows;
 const rows:Record<string,unknown>={};for(const {schema,name}of names){assert.match(schema,/^banuchat(?:_aux|_auth)?$/u);assert.match(name,/^[a-z_]+$/u);rows[schema+'.'+name]=(await observer.query(`SELECT count(*)::int n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM "${schema}"."${name}" t`)).rows[0];}return rows;}
const report:Record<string,any>={at:new Date().toISOString(),scope:'fixture-only existing empty postgres database in synthetic container; no new database/schema; no CCD or users copied',phases:[],result:'RUNNING'};
const helper='banuchat-oe2-pipeline-demo-'+stamp,ids=CATEGORIES.map((_,i)=>'BchOe2P02'+i+stamp);
let helperStarted=false,published=false,beforeWorkflows:Array<Record<string,any>>=[],phase='bootstrap';
async function n8nExecutions(includeData=false){
 const code=`const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});const rows=d.prepare('SELECT e.*${includeData?',x.data':''} FROM execution_entity e ${includeData?'JOIN execution_data x ON x.executionId=e.id':''} WHERE e.workflowId IN (?,?,?) ORDER BY e.id').all(...${JSON.stringify(ids)});${includeData?"const parse=require(require.resolve('flatted',{paths:['/usr/local/lib/node_modules/n8n']})).parse;for(const r of rows)r.data=parse(r.data);":''}d.close();process.stdout.write(JSON.stringify(rows));`;
 return JSON.parse(await dockerAsync(['exec',n8n,'node','-e',code])) as Record<string,any>[];
}
async function inspect(){return JSON.parse(await dockerAsync(['exec',helper,'node','-e',"fetch('http://127.0.0.1:3033/internal/oe2-pipeline/inspect',{headers:{Authorization:'Bearer '+process.env.OE2_PIPELINE_TOKEN}}).then(async r=>{if(!r.ok)process.exitCode=1;process.stdout.write(JSON.stringify(await r.json()));})"]));}
async function save(){await writeFile(new URL('result.json',directory),JSON.stringify(report,null,2)+'\n');}
const files=['academic-offer.json','calls.json','news.json'];
const initial={} as Record<Oe2Category,Buffer>,changed={} as Record<Oe2Category,Buffer>;
for(let i=0;i<CATEGORIES.length;i++){
 const value=JSON.parse(await readFile(new URL('eval/oe2/fixtures/'+files[i],root),'utf8'));
 for(const record of value.records)record.source_version='fixture-pipeline-02-'+stamp+'-v1';
 initial[CATEGORIES[i]!]=Buffer.from(JSON.stringify(value,null,2)+'\n');changed[CATEGORIES[i]!]=initial[CATEGORIES[i]!]!;
}
const news=JSON.parse(initial.news.toString());news.records[0].title+=' — actualizada por scheduler';news.records[0].source_version='fixture-pipeline-02-'+stamp+'-v2';
news.records=[news.records[0],{...news.records[1],id:'NEWS-003',title:'Novedad añadida ficticia',published_at:'2026-10-08T14:00:00-05:00',source_version:'fixture-pipeline-02-'+stamp+'-v2'}];changed.news=Buffer.from(JSON.stringify(news,null,2)+'\n');
const approve=(sha:string,label:string):DemoApproval=>({scope:'fictional_auxiliary_only',policy:POLICY,candidate_sha256:sha,approval_ref:'OE2-PIPELINE-02/'+label});
const approvalsPath=new URL('approvals.json',inputs);
try{
 assert.equal(parsePsql("SELECT row_to_json(x) FROM (SELECT d.name,r.manifest->'synthetic' AS synthetic FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id WHERE d.id=1)x;",'banuchat_schema_test').synthetic,true);
 report.baseline_before=await baselineFingerprint();report.protected_before=await protectedFingerprint();
 const marker=psql("SELECT coalesce(to_regclass('public.oe2_pipeline_scope')::text,'');").trim();
 let keys:{writer:string;reader:string};const keysPath=new URL('demo-keys.json',rootDirectory);
 if(!marker){
  try{keys=JSON.parse(await readFile(keysPath,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
   keys={writer:randomBytes(32).toString('base64url'),reader:randomBytes(32).toString('base64url')};await writeFile(keysPath,JSON.stringify(keys),{flag:'wx'});}
  assert.match(keys.writer,/^[a-zA-Z0-9_-]{43}$/u);assert.match(keys.reader,/^[a-zA-Z0-9_-]{43}$/u);
  const embedding=psql('SELECT r.embedding_config_id FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id WHERE d.id=1;','banuchat_schema_test').trim();assert.match(embedding,/^[a-f0-9-]{36}$/u);
  let schema=await readFile(new URL('../../src/oe2/pipeline/isolated-schema.sql',import.meta.url),'utf8');
  schema=schema.replace('CREATE TABLE public.oe2_pipeline_scope',`CREATE ROLE banuchat_oe2_pipeline_writer LOGIN PASSWORD '${keys.writer}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE banuchat_oe2_pipeline_reader LOGIN PASSWORD '${keys.reader}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE TABLE public.oe2_pipeline_scope`);
  schema=schema.replace('COMMIT;',`INSERT INTO public.oe2_pipeline_scope VALUES(true,'fictional-oe2-pipeline-demo-02','${embedding}');
GRANT CONNECT ON DATABASE postgres TO banuchat_oe2_pipeline_writer,banuchat_oe2_pipeline_reader;
GRANT USAGE ON SCHEMA public TO banuchat_oe2_pipeline_writer,banuchat_oe2_pipeline_reader;
GRANT SELECT ON public.oe2_pipeline_scope,public.oe2_pipeline_datasets,public.oe2_pipeline_releases,public.oe2_pipeline_sources,public.oe2_pipeline_origins,public.oe2_pipeline_announcements,public.oe2_pipeline_programming TO banuchat_oe2_pipeline_writer,banuchat_oe2_pipeline_reader;
GRANT INSERT ON public.oe2_pipeline_releases,public.oe2_pipeline_sources,public.oe2_pipeline_origins,public.oe2_pipeline_announcements,public.oe2_pipeline_programming TO banuchat_oe2_pipeline_writer;
GRANT UPDATE(current_release_id) ON public.oe2_pipeline_datasets TO banuchat_oe2_pipeline_writer;
GRANT UPDATE(status,published_at) ON public.oe2_pipeline_releases TO banuchat_oe2_pipeline_writer;
COMMIT;`);psql(schema);report.bootstrapped_new_fixture_tables=true;
 }else{keys=JSON.parse(await readFile(keysPath,'utf8'));assert.equal(psql('SELECT marker FROM public.oe2_pipeline_scope;').trim(),'fictional-oe2-pipeline-demo-02');report.bootstrapped_new_fixture_tables=false;}
 const token=randomBytes(32).toString('base64url');
 await writeFile(new URL('runtime.env',directory),['PGHOST=127.0.0.1','PGDATABASE=postgres','OE2_PIPELINE_WRITER_PASSWORD='+keys.writer,'OE2_PIPELINE_READER_PASSWORD='+keys.reader,'OE2_PIPELINE_TOKEN='+token].join('\n')+'\n',{flag:'wx'});
 for(let i=0;i<CATEGORIES.length;i++)await writeFile(new URL('fixtures/'+files[i],inputs),initial[CATEGORIES[i]!]!);
 const initialApproval=approve(plannedFixtureIdentity(initial),'operator-v1-'+stamp),nextApproval=approve(plannedFixtureIdentity(changed),'operator-v2-'+stamp);
 await writeFile(approvalsPath,JSON.stringify({approved_candidates:[initialApproval]},null,2)+'\n');
 await writeFile(new URL('operator-plan.json',directory),JSON.stringify({initial:initialApproval,planned_change:nextApproval,automatic_approval:false},null,2)+'\n');
 phase='bundle';
 const require=createRequire(import.meta.url),esbuild=require('esbuild') as {build:(o:Record<string,unknown>)=>Promise<unknown>};
 // jsonc-parser's UMD factory aliases require; its equivalent ESM entry bundles
 // without leaving relative runtime requires outside the isolated artifact.
 for(const file of ['runtime','checks','read-check'])await esbuild.build({entryPoints:[fileURLToPath(new URL(file+'.ts',import.meta.url))],outfile:fileURLToPath(new URL(file+'.mjs',bundle)),bundle:true,platform:'node',format:'esm',target:'node24',
  alias:{'jsonc-parser':fileURLToPath(new URL('../../node_modules/jsonc-parser/lib/esm/main.js',import.meta.url))},
  banner:{js:"import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);"},logLevel:'silent'});
 phase='fixture_runtime';
 await dockerAsync(['run','-d','--name',helper,'--label','banuchat.scope=oe2-pipeline-fixture-only','--network','host','--env-file',fileURLToPath(new URL('runtime.env',directory)),
  '--mount','type=bind,source='+fileURLToPath(bundle)+',target=/bundle,readonly','--mount','type=bind,source='+fileURLToPath(inputs)+',target=/inputs,readonly',
  '--mount','type=bind,source='+fileURLToPath(outputs)+',target=/outputs','--entrypoint','node',image,'/bundle/runtime.mjs']);helperStarted=true;
 for(let n=0;;n++){try{await inspect();break;}catch{if(n===30)throw new Error('fixture_runtime_not_ready');await new Promise(r=>setTimeout(r,500));}}
 phase='scheduler_setup';
 beforeWorkflows=exportWorkflows();await writeFile(new URL('workflows-before.json',directory),JSON.stringify(beforeWorkflows,null,2)+'\n');
 assert.ok(!beforeWorkflows.some(w=>ids.includes(w.id)));
 const credentialId='BchOe2P02Credential'+stamp;
 const credentials=[{id:credentialId,name:'BanuChat OE2 PIPELINE02 fixture service '+stamp,type:'httpHeaderAuth',data:{name:'Authorization',value:'Bearer '+token}}];
 const credentialPath=new URL('credential.json',directory);await writeFile(credentialPath,JSON.stringify(credentials));
 docker(['cp',fileURLToPath(credentialPath),n8n+':/tmp/oe2-pipeline-credential.json']);docker(['exec',n8n,'n8n','import:credentials','--input=/tmp/oe2-pipeline-credential.json']);
 docker(['exec','--user','0',n8n,'node','-e',"require('fs').unlinkSync('/tmp/oe2-pipeline-credential.json')"]);
 const workflows=[];
 for(let i=0;i<CATEGORIES.length;i++){
  const w=JSON.parse(await readFile(new URL('n8n/workflows/oe2-'+(CATEGORIES[i]==='academic_offer'?'academic-offer':CATEGORIES[i])+'-fixture-v1.json',root),'utf8'));
  w.id=ids[i];w.name='BanuChat OE2 PIPELINE02 TEST '+CATEGORIES[i]+' '+stamp;w.versionId=randomUUID();
  const trigger=w.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.scheduleTrigger');trigger.name='Test Scheduler 10 Seconds';trigger.parameters.rule.interval=[{field:'seconds',secondsInterval:10}];w.connections[trigger.name]=w.connections['Every 6 Hours'];delete w.connections['Every 6 Hours'];
  w.nodes.find((n:{name:string})=>n.name==='Fixture Configuration').parameters.assignments.assignments.find((a:{name:string})=>a.name==='base_url').value='http://172.17.0.1:3031';
  for(const node of w.nodes)if(node.credentials)node.credentials.httpHeaderAuth={id:credentialId,name:credentials[0]!.name};
  const node=structuredClone(w.nodes.find((n:{name:string})=>n.name==='Run Fixture Flow Once'));node.id='project-approved-demo';node.name='Publish Only Approved Demo Candidate';node.parameters.url='http://172.17.0.1:3033/internal/oe2-pipeline/publish';node.parameters.body='{}';node.position=[1450,100];node.onError='stopWorkflow';w.nodes.push(node);
  w.connections['Run Fixture Flow Once'].main[0]=[{node:node.name,type:'main',index:0}];workflows.push(w);
 }
 const workflowPath=new URL('workflows-test.json',directory);await writeFile(workflowPath,JSON.stringify(workflows));docker(['cp',fileURLToPath(workflowPath),n8n+':/tmp/oe2-pipeline-workflows.json']);docker(['exec',n8n,'n8n','import:workflow','--input=/tmp/oe2-pipeline-workflows.json']);
 published=true;for(const id of ids)await dockerAsync(['exec',n8n,'n8n','publish:workflow','--id='+id]);await dockerAsync(['restart',n8n]);await waitN8n();
 async function waitFor(name:string,predicate:(status:Record<string,any>)=>boolean){const started=performance.now();for(let n=0;n<90;n++){
  const status=await inspect();if(predicate(status)){report.phases.push({name,status:'PASS',duration_ms:Math.round(performance.now()-started),inspection:status});await save();console.log(JSON.stringify({phase:name,status:'PASS',current:status.current}));return status;}
  await new Promise(r=>setTimeout(r,500));}throw new Error('phase_timeout_'+name);}
 phase='scheduler_observation';
 const first=await waitFor('scheduler_to_approved_publication_v1',s=>s.events.some((e:Record<string,unknown>)=>e.outcome==='published'&&e.content_sha256===initialApproval.candidate_sha256));
 const before=await inspect();
 await writeFile(new URL('fixtures/news.next',inputs),changed.news);await rename(new URL('fixtures/news.next',inputs),new URL('fixtures/news.json',inputs));
 const pending=await waitFor('changed_snapshot_requires_separate_approval',s=>s.events.some((e:Record<string,unknown>)=>e.outcome==='awaiting_approval'&&e.candidate_sha256===nextApproval.candidate_sha256));assert.equal(pending.current,before.current);
 await writeFile(new URL('approvals.next',inputs),JSON.stringify({approved_candidates:[initialApproval,nextApproval]},null,2)+'\n');await rename(new URL('approvals.next',inputs),approvalsPath);
 const second=await waitFor('scheduler_change_to_publication_and_services_v2',s=>s.events.some((e:Record<string,unknown>)=>e.outcome==='published'&&e.content_sha256===nextApproval.candidate_sha256));assert.notEqual(second.current,first.current);
 assert.equal(second.announcements.announcements.length,4);assert.ok(second.announcements.announcements.some((a:{title:string})=>a.title.includes('actualizada por scheduler')));
 await new Promise(r=>setTimeout(r,500));
 report.workflow_ids=ids;report.scheduler_executions=await n8nExecutions(true);assert.ok(report.scheduler_executions.every((e:Record<string,any>)=>e.mode==='trigger'));
 for(const e of second.events.filter((e:Record<string,any>)=>e.outcome==='published')){assert.ok(report.scheduler_executions.some((x:Record<string,any>)=>String(x.id)===e.operation_id&&x.mode==='trigger'));}
 for(const id of ids)await dockerAsync(['exec',n8n,'n8n','unpublish:workflow','--id='+id]);await dockerAsync(['restart',n8n]);await waitN8n();published=false;
 const count=(await n8nExecutions()).length;await new Promise(r=>setTimeout(r,12_000));assert.equal((await n8nExecutions()).length,count);report.scheduler_inactive=true;
 phase='database_checks';
 await dockerAsync(['exec',helper,'node','/bundle/checks.mjs']);
 await dockerAsync(['exec',helper,'node','/bundle/read-check.mjs']);
 report.database_checks=JSON.parse(await readFile(new URL('checks.json',outputs),'utf8'));assert.equal(report.database_checks.result,'PASS');
 report.final_inspection=await inspect();report.scheduler_executions=await n8nExecutions(true);
 report.baseline_after=await baselineFingerprint();report.protected_after=await protectedFingerprint();assert.deepEqual(report.baseline_after,report.baseline_before);assert.deepEqual(report.protected_after,report.protected_before);
 report.protected_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';report.failure='isolated_pipeline_check_failed';report.failure_phase=phase;process.exitCode=1;
 await writeFile(new URL('failure-private.txt',directory),String(error instanceof Error?error.stack:error)+'\n'+String((error as {stderr?:unknown})?.stderr??''));}
finally{
 if(published){try{for(const id of ids)await dockerAsync(['exec',n8n,'n8n','unpublish:workflow','--id='+id]);await dockerAsync(['restart',n8n]);await waitN8n();report.scheduler_inactive=true;}catch{report.cleanup_failure='test_schedules_require_inspection';}}
 if(beforeWorkflows.length){const after=exportWorkflows(),prior=beforeWorkflows.find(w=>w.id==='BanuChatOe4Conversation1')!;report.conversation_unchanged=workflowHash(after.find(w=>w.id===prior.id)!)===workflowHash(prior);if(!report.conversation_unchanged){report.result='FAIL';process.exitCode=1;}}
 if(helperStarted){await dockerAsync(['stop',helper]);const state=JSON.parse(docker(['inspect',helper]))[0].State;
  report.fixture_runtime_stopped=!state.Running;report.fixture_runtime_exit_code=state.ExitCode;
  if(state.ExitCode!==0){report.result='FAIL';process.exitCode=1;}}
 if(restorePgStopped)await dockerAsync(['stop',pgContainer]);report.synthetic_postgres_restored_stopped=restorePgStopped;
 await observer.end();await save();console.log(JSON.stringify({result:report.result,failure:report.failure,cleanup_failure:report.cleanup_failure,scheduler_inactive:report.scheduler_inactive,conversation_unchanged:report.conversation_unchanged,directory:fileURLToPath(directory)}));
}
