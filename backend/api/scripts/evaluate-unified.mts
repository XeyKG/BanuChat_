import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {spawn,execFileSync,type ChildProcess} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createServer as createPortProbe} from 'node:net';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import {root,fingerprint} from '../test/auth-i1b/environment.js';
import {AuthSession} from '../../../mobile/src/auth/auth-session.js';
import {buildReminderCandidates} from '../../../mobile/src/notifications/model.js';
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);assert.equal(cfg.api_port,3004);
await new Promise<void>((resolve,reject)=>{const probe=createPortProbe();probe.once('error',()=>reject(new Error('unified_api_port_in_use')));probe.listen(3004,'127.0.0.1',()=>probe.close(()=>resolve()));});
const credentials=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8'));
const admin=new Pool({host:'127.0.0.1',port:cfg.database_port,database:cfg.database,user:credentials.admin,password:credentials.adminPassword});
admin.on('error',()=>{});
const canonical=new Pool({host:'127.0.0.1',port:55453,database:credentials.database,user:credentials.admin,password:credentials.adminPassword,options:'-c default_transaction_read_only=on'});
if(process.argv.includes('--reset-test-limits')){
 const isolated=JSON.parse(execFileSync('docker',['inspect','banuchat-unified-postgres'],{encoding:'utf8'}))[0];
 assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);assert.equal(isolated.Config.Labels['banuchat.scope'],'unified-isolated');
 // Explicit test preparation, never called in the product or against canonical storage.
 await admin.query("DELETE FROM banuchat_auth.auth_rate_limits WHERE expires_at>clock_timestamp()");
}
const base='http://127.0.0.1:3004/api/v2',accounts=await demoAccounts();
let server:ChildProcess|undefined,n8nCalls=0;
const waitFor=async(url:string,status:number)=>{for(let n=0;n<80;n++){try{if((await fetch(url)).status===status)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error('service_not_ready');};
const start=async()=>{server=spawn(process.execPath,['--import','tsx','scripts/start-unified.mts'],{cwd:fileURLToPath(new URL('backend/api/',root)),windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout?.on('data',b=>{n8nCalls+=(String(b).match(/unified_n8n/gu)??[]).length;});server.stderr?.on('data',()=>{});await waitFor(base+'/auth/me',401);};
const stop=async()=>{if(!server)return;const child=server;if(child.exitCode===null)await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill();});server=undefined;};
await start();
process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';
let saved:string|null=null;
const client=new AuthSession({available:async()=>true,get:async()=>saved,set:async v=>{saved=v;},clear:async()=>{saved=null;}},()=>base);
const req=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>{
 const response=await client.resource(base+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 return {status:response.status,body:response.status===204?null:await response.json()};
};
const report:{baseline:string;at:string;environment:string;tests:Record<string,unknown>;result?:string;failure?:string}={
 baseline:'555c5e71c1a7506ccd01958c871dc18bb2b87c37',at:new Date().toISOString(),environment:'REST v2 + isolated PostgreSQL + real Ollama + real stdio MCP + real N8N; AuthSession storage adapter is in-memory, not native SecureStore',tests:{}};
report.tests.isolated_rate_limit_preparation=process.argv.includes('--reset-test-limits');
try{
 const before=await fingerprint(canonical,true,true),corpus=await fingerprint(canonical,true);
 await client.login(accounts[0]!.uid,accounts[0]!.password);
 const me=client.getSnapshot().me!;assert.equal(me.evidence_mode,'ccd_local');assert.equal(me.capabilities.length,6);report.tests.T01={status:'PASS'};
 const created=await req('/conversations',{});assert.equal(created.status,201);const id=created.body.conversation_id;
 const rag=await req('/conversations/'+id+'/messages',{content:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'});assert.equal(rag.status,201);assert.equal(rag.body.assistant_message.insufficient_evidence,false);
 const citation=rag.body.assistant_message.citations.find((c:any)=>c.source_kind==='document'&&c.locator==='unit:M02:DOC-101');assert.ok(citation);report.tests.T02={status:'PASS'};
 const artifact=await client.resource('http://127.0.0.1:3004'+citation.artifact_url);assert.equal(artifact.status,200);assert.ok((await artifact.arrayBuffer()).byteLength>0);report.tests.T03={status:'PASS'};
 const progress=await req('/me/progress?statuses=completed');assert.equal(progress.status,200);assert.ok(progress.body.courses.length>0);assert.notEqual(progress.body.release_id,me.release_id);report.tests.T04={status:'PASS',independent_source_release:true};
 const calendar=await req('/calendar/events?date_from=2026-10-01&date_to=2026-11-30');assert.equal(calendar.status,200);assert.ok(calendar.body.events.length>0);report.tests.T05={status:'PASS'};
 const news=await req('/announcements?temporal_status=all');assert.equal(news.status,200);assert.ok(news.body.announcements.length>0);report.tests.T06={status:'PASS'};
 const candidates=buildReminderCandidates({calendarEvents:calendar.body.events,announcements:news.body.announcements,principalId:me.principal_id,releaseId:calendar.body.release_id,now:Date.parse('2026-10-25T00:00:00Z')});
 assert.ok(candidates.length>0);assert.ok(candidates.every(c=>c.data.recipient_scope===me.principal_id));report.tests.T07={status:'INTEGRATED_REMINDER_PLAN_PASS',candidates:candidates.length,native_scheduling:'NOT_EXECUTED_device_required'};
 const detail=await req('/conversations/'+id);assert.equal(detail.status,200);assert.deepEqual(detail.body.messages[1].citations,rag.body.assistant_message.citations);report.tests.T08={status:'PASS'};
 const multi=await req('/conversations/'+id+'/messages',{content:'Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?'});assert.equal(multi.status,201);
 assert.ok(multi.body.assistant_message.citations.some((c:any)=>c.source_kind==='profile_course'));assert.ok(multi.body.assistant_message.citations.some((c:any)=>c.source_kind==='announcement'));
 assert.ok(multi.body.assistant_message.citations.every((c:any)=>c.release_id===progress.body.release_id));report.tests.T09={status:'PASS',transport:'real MCP stdio'};
 assert.ok(n8nCalls>0);report.tests.T10={status:'PASS',correlated_webhook_completions:n8nCalls,trace_event:'unified_n8n'};
 await stop();execFileSync('docker',['restart','banuchat-unified-postgres'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,1500));await start();
 const restored=new AuthSession({available:async()=>true,get:async()=>saved,set:async v=>{saved=v;},clear:async()=>{saved=null;}},()=>base);
 await restored.restore();assert.equal(restored.getSnapshot().phase,'authenticated');
 const restoredDetail=await restored.resource(base+'/conversations/'+id);assert.equal(restoredDetail.status,200);assert.equal((await restoredDetail.json()).messages.length,4);
 report.tests.T13={status:'PASS',postgres_and_api_restarted:true,refresh_rotation_and_history:true};
 const ownProfile=progress.body.profile.profile_key;await client.logout();await client.login(accounts[1]!.uid,accounts[1]!.password);
 assert.equal((await req('/conversations/'+id)).status,404);
 assert.notEqual((await req('/me/progress')).body.profile.profile_key,ownProfile);
 const list=await req('/conversations');assert.ok(!list.body.conversations.some((c:any)=>c.conversation_id===id));report.tests.T11={status:'PASS'};
 const old=await req('/conversations',{});const abstain=await req('/conversations/'+old.body.conversation_id+'/messages',{content:'¿Qué información debo incluir al reportar una incidencia en el Programa Demo de Aprendizaje Digital?'});assert.equal(abstain.status,201);assert.equal(abstain.body.assistant_message.insufficient_evidence,true);assert.deepEqual(abstain.body.assistant_message.citations,[]);
 assert.equal((await admin.query("SELECT count(*)::int n FROM banuchat.dataset_releases WHERE manifest->'synthetic'='true'::jsonb")).rows[0].n,0);report.tests.T12={status:'PASS',synthetic_document_releases:0};
 const invalid=await req('/conversations/not-a-uuid');assert.equal(invalid.status,400);
 const stale=await req('/conversations',{});const staleId=stale.body.conversation_id;
 const current=(await admin.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id;
 const previous=(await admin.query('SELECT id FROM banuchat.dataset_releases WHERE id<>$1 ORDER BY id LIMIT 1',[current])).rows[0].id;
 await admin.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[previous]);
 let releaseStatus:number;
 try{releaseStatus=(await req('/conversations/'+staleId+'/messages',{content:'mi progreso'})).status;assert.ok([403,409].includes(releaseStatus));}
 finally{await admin.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[current]);}
 const conflict=await req('/conversations',{}),conflictPath='/conversations/'+conflict.body.conversation_id+'/messages';
 const concurrent=await Promise.all([req(conflictPath,{content:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'}),req(conflictPath,{content:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'})]);
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
 const fault=await req('/conversations',{}),faultId=fault.body.conversation_id;
 const target=JSON.parse(execFileSync('docker',['inspect','banuchat-unified-n8n'],{encoding:'utf8'}))[0];assert.equal(target.Config.Labels['banuchat.scope'],'unified-isolated');
 execFileSync('docker',['stop','banuchat-unified-n8n'],{stdio:'ignore'});
 try{assert.equal((await req('/conversations/'+faultId+'/messages',{content:'Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?'})).status,503);
 assert.equal((await req('/conversations/'+faultId)).body.messages.length,0);}
 finally{execFileSync('docker',['start','banuchat-unified-n8n'],{stdio:'ignore'});await waitFor('http://127.0.0.1:15679/healthz',200);}
 report.tests.T14={status:'PASS',invalid_argument:400,document_release_change:releaseStatus!,concurrent_message:409,n8n_down:503,failed_turn_messages:0};
 assert.equal(await fingerprint(canonical,true,true),before);assert.equal(await fingerprint(canonical,true),corpus);
 report.tests.canonical_unchanged=true;
 report.result='PASS_WITH_EXPLICIT_PENDING';
}catch(error){report.result='FAIL';report.failure=error instanceof Error?error.message.slice(0,180):'unknown';process.exitCode=1;}
finally{await client.logout().catch(()=>{});await stop();await Promise.all([admin.end(),canonical.end()]);await mkdir(new URL('eval/unified/results/',root),{recursive:true});await writeFile(new URL('eval/unified/results/acceptance-2026-10-25.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

