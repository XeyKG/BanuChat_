/** New empty fixture conversations only; no operator account, setup, generation or message retries. */
import assert from 'node:assert/strict';
import {access,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {environment,pool,root,storage,fingerprint} from './auth-i1b/environment.js';
import {f1Accounts} from './auth-i1b-f1/environment.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B-OPS',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim(),test_type:'HTTP/PostgreSQL; generator forbidden',checks:[]};
async function main(){
 const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
 // Existing F1 provisioned fixtures only; explicitly prevent the helper's setup branch.
 await access(new URL('infra/local/auth-i1b/f1/accounts.dpapi',root));
 const accounts=await f1Accounts(),runtime=pool(e,'runtime');
 const admin=new Pool({host:'127.0.0.1',port:55443,database:e.database,user:e.admin,password:e.adminPassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
 let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
 let request:((path:string,token?:string,body?:unknown,method?:string)=>Promise<{status:number;body:any}>)|undefined;
 const live=new Set<string>();let before:string|undefined,previous:string|undefined;let existing:string[]=[];
 const history=async()=> (await admin.query(`SELECT md5(COALESCE(string_agg(row_text,E'\n' ORDER BY row_text),'')) digest FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c WHERE c.id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m WHERE m.conversation_id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])) t`,[existing])).rows[0].digest;
 try{
  before=await fingerprint(admin,true);existing=(await admin.query('SELECT id FROM banuchat.conversations')).rows.map(r=>r.id);previous=await history();
  server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',artifacts:storage,document_rag:async()=>{throw Error('UNEXPECTED_RAG');}});
  await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/v2`;
  request=async(path,token,body,method=body===undefined?'GET':'POST')=>{
   const r=await fetch(base+path,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
   return{status:r.status,body:r.status===204?null:path.endsWith('/artifact')&&r.ok?(await r.arrayBuffer()).byteLength:await r.json()};
  };
  const pairs:Array<{access_token:string;refresh_token:string}>=[];for(const a of accounts){const r=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(r.status,200);live.add(r.body.access_token);pairs.push(r.body);}
  const owner:string[]=[];for(const pair of pairs){const me=await request('/auth/me',pair.access_token);assert.equal(me.status,200);owner.push(me.body.principal_id);assert.equal(me.body.evidence_mode,'ccd_local');}
  assert.notEqual(owner[0],owner[1]);
  const created:string[]=[];for(const pair of pairs){const r=await request('/conversations',pair.access_token,{});assert.equal(r.status,201);created.push(r.body.conversation_id);}
  for(const [index,pair] of pairs.entries()){
   const foreign=created[1-index];for(const method of ['GET','DELETE']){assert.equal((await request('/conversations/'+foreign,pair.access_token,undefined,method)).status,404);report.checks.push({check:'foreign_'+method.toLowerCase()+'_'+index,status:'PASS',http:404});}
   assert.equal((await request('/conversations/'+foreign+'/messages',pair.access_token,{content:'Consulta ficticia de aislamiento'})).status,404);report.checks.push({check:'foreign_post_'+index,status:'PASS',http:404});
   const list=await request('/conversations',pair.access_token);assert.equal(list.status,200);assert.ok(list.body.conversations.every((c:any)=>c.conversation_id!==foreign));
  }
  const oldA=pairs[0]!.access_token,oldB=pairs[1]!.access_token;
  const restored=await request('/auth/refresh',undefined,{refresh_token:pairs[1]!.refresh_token});assert.equal(restored.status,200);live.delete(oldB);live.add(restored.body.access_token);
  const b=restored.body.access_token;assert.equal((await request('/auth/me',b)).body.principal_id,owner[1]);assert.equal((await request('/conversations/'+created[1],b)).status,200);assert.equal((await request('/conversations/'+created[0],b)).status,404);assert.equal((await request('/auth/me',oldB)).status,401);report.checks.push({check:'refresh_owner_preserved_and_old_access_rejected',status:'PASS'});
  assert.equal((await request('/auth/logout',oldA,undefined,'POST')).status,204);live.delete(oldA);assert.equal((await request('/auth/me',oldA)).status,401);assert.equal((await request('/conversations/'+created[1],oldA)).status,401);assert.equal((await request('/conversations/'+created[1],b)).status,200);report.checks.push({check:'logout_a_does_not_grant_or_revoke_b',status:'PASS'});
  const version=(await admin.query('SELECT v.id FROM banuchat.document_versions v JOIN banuchat.datasets d ON d.current_release_id=v.dataset_release_id ORDER BY v.id LIMIT 1')).rows[0].id;
  assert.equal((await request(`/documents/${version}/artifact`)).status,401);assert.equal((await request(`/documents/${version}/artifact`,oldA)).status,401);assert.equal((await request(`/documents/${version}/artifact`,b)).status,200);report.checks.push({check:'artifact_requires_live_session_shared_document_scope',status:'PASS'});
  for(const [i,id] of created.entries()){const rows=(await admin.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[id])).rows;assert.equal(rows[0].n,0);if(i===1)assert.equal((await request('/conversations/'+id,b)).body.messages.length,0);}
  report.passed=true;report.new_empty_conversations=2;report.generator_calls=0;
 }finally{
  try{
  if(request)for(const token of live){try{assert.equal((await request('/auth/logout',token,undefined,'POST')).status,204);}catch{report.session_cleanup='NOT_CONFIRMED';}}
  if(before){report.integrity={corpus_sha256:before,corpus_unchanged:before===await fingerprint(admin,true),previous_history_unchanged:previous===await history()};assert.equal(report.integrity.corpus_unchanged,true);assert.equal(report.integrity.previous_history_unchanged,true);}
  report.unrevoked_fixture_sessions=(await admin.query('SELECT count(*)::int n FROM banuchat_auth.sessions s JOIN banuchat_auth.accounts a ON a.id=s.principal_id WHERE a.synthetic_uid=ANY($1::text[]) AND s.revoked_at IS NULL',[accounts.map(a=>a.uid)])).rows[0].n;assert.equal(report.unrevoked_fixture_sessions,0);
  }finally{server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await Promise.all([runtime.end(),admin.end()]);}
 }
}
try{await main();}catch{report.passed=false;report.failure='ASSERTION_OR_DEPENDENCY_FAILURE_NO_AUTOMATIC_RETRY';process.exitCode=1;}
await writeFile(new URL(`eval/auth/results/bch05-ccd-auth-i1b-ops-isolation-${Date.now()}.json`,root),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
