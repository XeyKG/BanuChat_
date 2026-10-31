import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import {loadLocalOe2Reader} from '../src/operations/oe2-local-reader.js';

const root=new URL('../../../',import.meta.url),directory=new URL('infra/local/product-oe2-mobile-04/rest-'+Date.now()+'/',root);
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('result.json',directory))],{stdio:'ignore'});await mkdir(directory,{recursive:true});
const unavailable=process.argv.includes('--expect-unavailable'),base='http://127.0.0.1:3004/api/v2';
const report:Record<string,any>={at:new Date().toISOString(),phase:unavailable?'source_unavailable':'source_read',checks:[],result:'RUNNING'};
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);
const db=new Pool({host:'127.0.0.1',port:55463,database:cfg.database,user:cfg.runtime_user,password:cfg.runtime_password,options:'-c default_transaction_read_only=on'});db.on('error',()=>{});
let token='';const request=async(path:string,method='GET',body?:unknown,access=token)=>{const response=await fetch(base+path,{method,headers:{...(access?{Authorization:'Bearer '+access}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 return {status:response.status,body:response.status===204?null:await response.json()};};
const fingerprint=async()=>{const names=(await db.query<{schema:string;name:string}>("SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('banuchat','banuchat_aux') AND c.relname NOT IN ('conversations','messages','message_citations','turn_sources') AND has_table_privilege(c.oid,'SELECT') ORDER BY 1,2")).rows;
 const result:Record<string,unknown>={};for(const {schema,name}of names){assert.match(schema,/^banuchat(?:_aux)?$/u);assert.match(name,/^[a-z_]+$/u);result[schema+'.'+name]=(await db.query(`SELECT count(*)::int n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM "${schema}"."${name}" t`)).rows[0];}return result;};
const check=async(name:string,work:()=>Promise<unknown>)=>{const start=performance.now();try{const evidence=await work();report.checks.push({name,status:'PASS',duration_ms:Math.round(performance.now()-start),evidence});}catch(error){report.checks.push({name,status:'FAIL'});throw error;}};
try{
 report.unified_before=await fingerprint();const accounts=await demoAccounts();const login=await request('/auth/login','POST',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(login.status,200);token=login.body.access_token;
 const me=await request('/auth/me');assert.equal(me.status,200);assert.equal(me.body.release_id,'10af4ffd-effb-41fc-bbfe-4dc48cb3398f');
 await check('existing_auth_and_negative_controls',async()=>{
  assert.equal((await request('/demo/oe2/programming','GET',undefined,'')).status,401);
  assert.equal((await request('/demo/oe2/programming','POST',{})).status,405);
  for(const query of ['limit=0','limit=51','limit=1&limit=2','profile_key=other','release_id=other','query=x','query=%00x'])assert.equal((await request('/demo/oe2/programming?'+query)).status,400);
  assert.equal((await request('/demo/oe2/announcements?type=other')).status,400);return {anonymous:401,write:405,invalid_filters:400};
 });
 if(unavailable){
  await check('optional_source_failure',async()=>{for(const kind of ['programming','announcements']){const r=await request('/demo/oe2/'+kind);assert.equal(r.status,503);assert.equal(r.body.error.code,'DEPENDENCY_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(r),/password|source_path|postgres|docker|stack|SELECT/u);}assert.equal((await request('/me/progress')).status,200);return {oe2_http:503,progress_http:200};});
  await check('ccd_chat_survives_source_failure',async()=>{
   const created=await request('/conversations','POST',{});assert.equal(created.status,201);const id=created.body.conversation_id;
   let answer;try{answer=await request('/conversations/'+id+'/messages','POST',{content:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'});}catch(error){report.uncertain_post_history=await request('/conversations/'+id);throw error;}
   assert.equal(answer.status,201);assert.equal(answer.body.assistant_message.insufficient_evidence,false);assert.ok(answer.body.assistant_message.citations.some((c:any)=>c.source_kind==='document'&&c.release_id===me.body.release_id));
   const history=await request('/conversations/'+id);assert.equal(history.status,200);assert.equal(history.body.messages.length,2);return {response:answer.body,history_messages:2};
  });
 }else{
  const reader=await loadLocalOe2Reader(new URL('infra/local/unified/oe2-reader.json',root));assert.ok(reader);const before=await reader.read();
  report.oe2_before_sha256=createHash('sha256').update(JSON.stringify(before)).digest('hex');
  await check('programming_and_public_provenance',async()=>{const r=await request('/demo/oe2/programming');assert.equal(r.status,200);assert.equal(r.body.evidence_mode,'fictional_auxiliary');assert.equal(r.body.release_id,before.release_id);assert.equal(r.body.programming.length,2);
   for(const row of r.body.programming){const expected=before.programming.find(p=>p.programming_key===row.id);assert.ok(expected);for(const key of ['course_code','period','mode','start_date','end_date'])assert.equal(row[key],expected[key]);assert.equal(row.start_date,'2026-11-03');assert.equal(row.end_date,'2026-11-28');assert.match(row.source.record_sha256,/^[a-f0-9]{64}$/u);assert.match(row.source.snapshot_sha256,/^[a-f0-9]{64}$/u);}
   assert.doesNotMatch(JSON.stringify(r.body),/source_path|candidate_text|snapshot_json|password/u);return r.body;});
  await check('calls_and_news_temporal_semantics',async()=>{const rows=[];for(const type of ['calls','news']){const r=await request('/demo/oe2/announcements?type='+type);assert.equal(r.status,200);assert.equal(r.body.release_id,before.release_id);assert.equal(r.body.announcements.length,2);assert.ok(r.body.announcements.every((a:any)=>a.type===type));
    for(const a of r.body.announcements){if(type==='news'){assert.equal(a.valid_until,null);assert.equal(a.temporal_status,'published');}else{assert.equal(a.temporal_status,'expired');assert.ok(Date.parse(a.valid_until)<Date.parse(r.body.reference_time));}}
    rows.push(r.body);}return rows;});
  await check('filters_empty_limit_and_idempotent_read',async()=>{const one=await request('/demo/oe2/programming?limit=1&mode=virtual');assert.equal(one.body.programming.length,1);
   const empty=await request('/demo/oe2/programming?query=ZZZ-SIN-REGISTROS');assert.equal(empty.status,200);assert.deepEqual(empty.body.programming,[]);assert.equal(empty.body.release_id,before.release_id);
   const a=await request('/demo/oe2/announcements?type=news&temporal_status=active');assert.deepEqual(a.body.announcements,[]);
   const after=await reader.read();assert.deepEqual(after,before);report.oe2_after_sha256=createHash('sha256').update(JSON.stringify(after)).digest('hex');return {same_publication:true,empty_preserves_release:true,news_not_open_call:true};});
 }
 report.unified_after=await fingerprint();assert.deepEqual(report.unified_after,report.unified_before);report.unified_protected_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';process.exitCode=1;await writeFile(new URL('failure-private.txt',directory),String(error instanceof Error?error.stack:error));}
finally{if(token){const logout=await request('/auth/logout','POST').catch(()=>({status:0}));report.logout_status=logout.status;if(logout.status!==204){report.result='FAIL';process.exitCode=1;}}await db.end();await writeFile(new URL('result.json',directory),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,phase:report.phase,directory:fileURLToPath(directory),checks:report.checks.map(({name,status,duration_ms}:any)=>({name,status,duration_ms}))}));}
