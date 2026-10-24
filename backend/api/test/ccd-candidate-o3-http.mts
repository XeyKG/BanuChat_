/** O3 selected HTTP integration: controlled writes go only to the restored candidate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {candidateEnvironment,candidatePool} from './ccd-candidate-o3/environment.js';
import {demoAccounts} from './auth-i1b/accounts.js';
import {environment,fingerprint,root} from './auth-i1b/environment.js';

const apiPort=Number(process.env.BANUCHAT_O3_API_PORT??'3013');assert.equal(apiPort,3013);
const base=`http://127.0.0.1:${apiPort}/api/v2`,candidate=await candidateEnvironment(),i1b=await environment(),fixtures=await demoAccounts();
assert.equal(candidate.port,55453);assert.equal(i1b.port,55443);assert.ok(fixtures.length>=2);
const candidateDb=candidatePool(candidate,'admin',true),i1bDb=new (await import('pg')).Pool({host:'127.0.0.1',port:i1b.port,database:i1b.database,user:i1b.admin,password:i1b.adminPassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
const state=(name:string)=>{const x=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))[0];return{running:x.State.Running,started_at:x.State.StartedAt,pid:x.State.Pid,mounts:x.Mounts.map((m:any)=>m.Name),networks:Object.keys(x.NetworkSettings.Networks)};};
const digestRows=async(db:any,ids:string[])=>{if(!ids.length)return createHash('sha256').update('').digest('hex');const r=await db.query(`SELECT row_text FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c WHERE c.id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m WHERE m.conversation_id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])) q ORDER BY row_text`,[ids]);return createHash('sha256').update(JSON.stringify(r.rows)).digest('hex');};
const json=async(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const response=await fetch(base+path,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});return{status:response.status,body:response.status===204?null:await response.json() as any};};
const login=async(account:(typeof fixtures)[number])=>{const r=await json('/auth/login',undefined,{synthetic_uid:account.uid,password:account.password});assert.equal(r.status,200);return r.body.access_token as string;};
const report:any={checkpoint:'BANUCHAT-O3',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('.',root),encoding:'utf8'}).trim(),configuration:{api_port:apiPort,database_port:candidate.port,database:candidate.database,container:candidate.name,ollama:'local-existing'},checks:{},created:{conversations:0,messages:0,citations:0}};
let tokenA:string|undefined,tokenB:string|undefined;
try{
 const i1bStateBefore=state(i1b.name),candidateStateBefore=state(candidate.name);assert.equal(i1bStateBefore.running,true);assert.equal(candidateStateBefore.running,true);
 const candidateIds=(await candidateDb.query('SELECT id FROM banuchat.conversations ORDER BY id')).rows.map((r:any)=>r.id as string);
 const i1bIds=(await i1bDb.query('SELECT id FROM banuchat.conversations ORDER BY id')).rows.map((r:any)=>r.id as string);
 const before={corpus:await fingerprint(candidateDb,true),candidateHistory:await digestRows(candidateDb,candidateIds),i1bHistory:await digestRows(i1bDb,i1bIds)};
 const scope=(await candidateDb.query('SELECT deployment_id,database_name FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0];assert.equal(scope.database_name,candidate.database);assert.equal(scope.deployment_id,candidate.deployment);
 assert.equal((await json('/auth/me')).status,401);assert.equal((await json('/conversations')).status,401);report.checks.unauthorized_rejected=true;
 tokenA=await login(fixtures[0]!);tokenB=await login(fixtures[1]!);
 const meA=await json('/auth/me',tokenA),meB=await json('/auth/me',tokenB);assert.equal(meA.status,200);assert.equal(meB.status,200);assert.equal(meA.body.synthetic_uid,fixtures[0]!.uid);assert.notEqual(meA.body.principal_id,meB.body.principal_id);report.checks.authentication_and_session=true;
 const created=await json('/conversations',tokenA,{});assert.equal(created.status,201);const chat=String(created.body.conversation_id);report.created.conversations++;
 assert.equal((await json('/conversations/'+chat,tokenB)).status,404);assert.equal((await json('/conversations/'+chat+'/messages',tokenB,{content:'Consulta ficticia ajena'})).status,404);
 const listB=await json('/conversations',tokenB);assert.equal(listB.status,200);assert.ok(!listB.body.conversations.some((c:any)=>c.conversation_id===chat));report.checks.account_isolation=true;
 const ambiguous=await json('/conversations/'+chat+'/messages',tokenA,{content:'Busco la asignatura para aprender a dar instrucciones a modelos que crean texto e imágenes.'});assert.equal(ambiguous.status,201);assert.equal(ambiguous.body.assistant_message.insufficient_evidence,true);assert.deepEqual(ambiguous.body.assistant_message.citations,[]);report.created.messages+=2;
 const grounded=await json('/conversations/'+chat+'/messages',tokenA,{content:'IA Generativa'});assert.equal(grounded.status,201);assert.equal(grounded.body.assistant_message.insufficient_evidence,false);assert.ok(grounded.body.assistant_message.citations.some((c:any)=>c.locator==='unit:M02:DOC-101'));report.created.messages+=2;report.created.citations+=grounded.body.assistant_message.citations.length;
 const detail=await json('/conversations/'+chat,tokenA);assert.equal(detail.status,200);assert.equal(detail.body.messages.length,4);assert.deepEqual(detail.body.messages,[ambiguous.body.user_message,ambiguous.body.assistant_message,grounded.body.user_message,grounded.body.assistant_message]);
 const listA=await json('/conversations',tokenA);assert.equal(listA.status,200);assert.ok(listA.body.conversations.some((c:any)=>c.conversation_id===chat&&c.message_count===4));
 const citation=grounded.body.assistant_message.citations[0];const artifact=await fetch(`http://127.0.0.1:${apiPort}${citation.artifact_url}`,{headers:{Authorization:'Bearer '+tokenA},signal:AbortSignal.timeout(15000)});assert.equal(artifact.status,200);assert.ok((await artifact.arrayBuffer()).byteLength>0);assert.equal((await fetch(`http://127.0.0.1:${apiPort}${citation.artifact_url}`,{signal:AbortSignal.timeout(15000)})).status,401);
 const persisted=(await candidateDb.query(`SELECT o.principal_id,count(DISTINCT m.id)::int messages,count(mc.*)::int citations,bool_and(mc.source_sha256=v.source_sha256 AND mc.source_locator=dc.locator AND mc.dataset_release_id=dc.dataset_release_id) provenance_ok FROM banuchat_auth.conversation_owners o JOIN banuchat.messages m ON m.conversation_id=o.conversation_id LEFT JOIN banuchat.message_citations mc ON mc.message_id=m.id LEFT JOIN banuchat.document_versions v ON v.id=mc.document_version_id LEFT JOIN banuchat.document_chunks dc ON dc.id=mc.chunk_id WHERE o.conversation_id=$1 GROUP BY o.principal_id`,[chat])).rows[0];assert.equal(persisted.principal_id,meA.body.principal_id);assert.equal(persisted.messages,4);assert.equal(persisted.citations,report.created.citations);assert.equal(persisted.provenance_ok,true);report.checks.f2_grounded_rag_history_citations_document=true;report.checks.ownership=true;
 const abstentionChat=await json('/conversations',tokenA,{});assert.equal(abstentionChat.status,201);report.created.conversations++;
 const abstention=await json('/conversations/'+abstentionChat.body.conversation_id+'/messages',tokenA,{content:'Describe el mantenimiento de motores de aeronaves.'});assert.equal(abstention.status,201);assert.equal(abstention.body.assistant_message.insufficient_evidence,true);assert.deepEqual(abstention.body.assistant_message.citations,[]);report.created.messages+=2;assert.equal((await json('/conversations/not-a-uuid',tokenA)).status,400);report.checks.error_and_abstention=true;
 assert.equal(await fingerprint(candidateDb,true),before.corpus);assert.equal(await digestRows(candidateDb,candidateIds),before.candidateHistory);assert.equal(await digestRows(i1bDb,i1bIds),before.i1bHistory);
 const i1bStateAfter=state(i1b.name);assert.deepEqual(i1bStateAfter,i1bStateBefore);report.checks.corpus_unchanged=true;report.checks.previous_candidate_history_unchanged=true;report.checks.i1b_history_and_runtime_unchanged=true;report.checks.candidate_identity={started_at:candidateStateBefore.started_at,volume:candidateStateBefore.mounts,network:candidateStateBefore.networks};
 report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error instanceof Error?error.name:'UNKNOWN';process.exitCode=1;}
finally{
 for(const token of [tokenA,tokenB])if(token)await json('/auth/logout',token,undefined,'POST').catch(()=>undefined);
 await Promise.all([candidateDb.end(),i1bDb.end()]);
 await writeFile(new URL('eval/auth/results/banuchat-o3-candidate-http.json',root),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,checks:report.checks,created:report.created,failure:report.failure??null}));
}
