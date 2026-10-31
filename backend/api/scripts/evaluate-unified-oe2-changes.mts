import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Pool} from 'pg';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import {loadLocalOe2Reader} from '../src/operations/oe2-local-reader.js';
const root=new URL('../../../',import.meta.url),directory=new URL('infra/local/banu-al-dia-01/rest-'+Date.now()+'/',root),down=process.argv.includes('--expect-unavailable');
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('result.json',directory))],{stdio:'ignore'});await mkdir(directory,{recursive:true});
const cfg=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));assert.equal(cfg.database,'banuchat_unified');assert.equal(cfg.database_port,55463);
const db=new Pool({host:'127.0.0.1',port:55463,database:cfg.database,user:cfg.runtime_user,password:cfg.runtime_password,options:'-c default_transaction_read_only=on'});db.on('error',()=>{});
const report:Record<string,any>={at:new Date().toISOString(),phase:down?'unavailable':'comparison',checks:[],result:'RUNNING'};let token='';
const request=async(path:string,method='GET',body?:unknown,access=token)=>{const r=await fetch('http://127.0.0.1:3004/api/v2'+path,{method,headers:{...(access?{Authorization:'Bearer '+access}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});return {status:r.status,body:r.status===204?null:await r.json()};};
const check=async(name:string,run:()=>Promise<unknown>)=>{const start=performance.now();try{const evidence=await run();report.checks.push({name,status:'PASS',duration_ms:Math.round(performance.now()-start),evidence});}catch(error){report.checks.push({name,status:'FAIL'});throw error;}};
const fingerprint=async()=>{const names=(await db.query<{schema:string;name:string}>("SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('banuchat','banuchat_aux') AND c.relname NOT IN ('conversations','messages','message_citations','turn_sources') AND has_table_privilege(c.oid,'SELECT') ORDER BY 1,2")).rows;const rows:Record<string,unknown>={};
 for(const {schema,name}of names){assert.match(schema,/^banuchat(?:_aux)?$/u);assert.match(name,/^[a-z_]+$/u);rows[schema+'.'+name]=(await db.query(`SELECT count(*)::int n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM "${schema}"."${name}" t`)).rows[0];}return rows;};
const configHashes=async()=>{const hashes:Record<string,string>={};for(const path of ['infra/local/unified/application.json','infra/local/unified/oe2-reader.json','infra/local/oe6/n8n-conversation.env'])hashes[path]=createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');return hashes;};
try{
 report.protected_before=await fingerprint();report.configuration_before=await configHashes();const accounts=await demoAccounts();const login=await request('/auth/login','POST',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});assert.equal(login.status,200);token=login.body.access_token;
 await check('auth_filters_and_methods',async()=>{assert.equal((await request('/demo/oe2/changes','GET',undefined,'')).status,401);assert.equal((await request('/demo/oe2/changes','POST')).status,405);
  for(const q of ['category=other','change_type=unchanged','limit=0','limit=51','limit=1&limit=2','category=news&category=calls','source_id=other','release_id=other','sql=SELECT','path=private'])assert.equal((await request('/demo/oe2/changes?'+q)).status,400);return {anonymous:401,methods:405,invalid:400};});
 if(down){await check('isolated_failure_preserves_product',async()=>{const r=await request('/demo/oe2/changes');assert.equal(r.status,503);assert.equal(r.body.error.code,'DEPENDENCY_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(r),/docker|postgres|snapshot|password|stack|SELECT/u);assert.equal((await request('/auth/me')).status,200);assert.equal((await request('/me/progress')).status,200);assert.equal((await request('/conversations')).status,200);return {changes:503,me:200,progress:200,history:200};});}
 else{
  const reader=await loadLocalOe2Reader(new URL('infra/local/unified/oe2-reader.json',root));assert.ok(reader?.readHistory);const before=await reader.readHistory();report.history_before=before;
  await check('real_persisted_release_pair_and_schema',async()=>{
   const r=await request('/demo/oe2/changes');assert.equal(r.status,200);report.response=r.body;
   const ordered=[...before.timeline].sort((a,b)=>a.published_at<b.published_at?-1:1);assert.equal(r.body.current_release_id,ordered.at(-1)!.release_id);assert.equal(r.body.previous_release_id,ordered.at(-2)!.release_id);
   const current=before.publications.find(p=>p.release_id===r.body.current_release_id)!,previous=before.publications.find(p=>p.release_id===r.body.previous_release_id)!;
   const identity=(o:{category:string;source_id:string;record_id:string})=>JSON.stringify([o.category,o.source_id,o.record_id]);const old=new Map(previous.candidate.origins.map(o=>[identity(o),o]));const counts={created:0,modified:0,removed:0,unchanged:0};
   for(const o of current.candidate.origins){const prior=old.get(identity(o));if(!prior)counts.created++;else{counts[prior.record_sha256===o.record_sha256?'unchanged':'modified']++;old.delete(identity(o));}}counts.removed=old.size;assert.deepEqual(r.body.counts,counts);
   const require=createRequire(import.meta.url),Ajv=require('ajv/dist/2020.js').default,ajv=new Ajv({strict:true,strictTypes:false,validateFormats:true});require('ajv-formats')(ajv);ajv.addFormat('binary',true);
   const contract=JSON.parse(await readFile(new URL('../openapi-v2.yaml',import.meta.url),'utf8'));const validate=ajv.compile(JSON.parse(JSON.stringify({$ref:'#/components/schemas/oe2_changes_response',$defs:contract.components.schemas}).replaceAll('#/components/schemas/','#/$defs/')));assert.equal(validate(r.body),true,JSON.stringify(validate.errors));
   assert.equal(r.body.counts.modified,1);assert.equal(r.body.counts.unchanged,5);assert.equal(r.body.changes[0].previous_source.record_id,r.body.changes[0].current_source.record_id);assert.deepEqual(r.body.changes[0].fields.map((f:any)=>f.field),['summary','source_version']);
   assert.doesNotMatch(JSON.stringify(r.body),/candidate|snapshot_json|source_path|sha256|approval_ref/u);return {counts,fields:r.body.changes[0].fields,public_schema_valid:true};
  });
  await check('filters_repeat_and_previous_routes_unchanged',async()=>{
   const all=report.response;const one=await request('/demo/oe2/changes?category=news&change_type=modified&limit=1');assert.equal(one.status,200);assert.deepEqual(one.body.changes,all.changes);
   for(const q of ['category=academic_offer','change_type=removed']){const empty=await request('/demo/oe2/changes?'+q);assert.equal(empty.status,200);assert.equal(empty.body.matched_count,0);assert.deepEqual(empty.body.changes,[]);assert.deepEqual(empty.body.counts,all.counts);}
   const programming=await request('/demo/oe2/programming'),news=await request('/demo/oe2/announcements?type=news');assert.equal(programming.status,200);assert.equal(news.status,200);assert.equal(programming.body.programming.length,2);assert.equal(news.body.announcements.length,2);
   const after=await reader.readHistory!();assert.deepEqual(after,before);assert.deepEqual((await request('/demo/oe2/changes')).body,all);return {same_history:true,same_response:true,existing_routes:200};
  });
 }
 report.protected_after=await fingerprint();report.configuration_after=await configHashes();assert.deepEqual(report.protected_after,report.protected_before);assert.deepEqual(report.configuration_after,report.configuration_before);report.protected_unchanged=true;report.result='PASS';
}catch(error){report.result='FAIL';process.exitCode=1;await writeFile(new URL('failure-private.txt',directory),String(error instanceof Error?error.stack:error));}
finally{if(token){report.logout=(await request('/auth/logout','POST')).status;if(report.logout!==204){report.result='FAIL';process.exitCode=1;}}await db.end();await writeFile(new URL('result.json',directory),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,phase:report.phase,directory:fileURLToPath(directory),checks:report.checks.map(({name,status,duration_ms}:any)=>({name,status,duration_ms}))}));}
