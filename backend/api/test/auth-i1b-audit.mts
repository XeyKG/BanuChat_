/** Final source reads use read-only connections. Mutating probes are rolled back in new I1B only. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {environment,pool,fingerprint,evidence,root,storage} from './auth-i1b/environment.js';
import {demoAccounts} from './auth-i1b/accounts.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {getDocumentArtifact} from '../src/application/document-artifact.js';
const git=(args:string[])=>execFileSync('git',args,{cwd:fileURLToPath(root),encoding:'utf8',stdio:['pipe','pipe','pipe']});
assert.equal(git(['rev-parse','HEAD']).trim(),'8a85ff25291ca1a3b82ce4584de966f4fc802d14');
const protectedPaths=['backend/api/src/chat','backend/api/src/generation','backend/api/src/retrieval','backend/api/openapi.yaml','backend/api/api-contract.md','backend/rag','backend/mcp-server','data/synthetic','data/ccd/schemas'];
// Resolve the numbered historical filenames from Git; no assumed path can silently exclude one.
const historical=git(['ls-files','infra/db']).trim().split(/\r?\n/u).filter(p=>/^infra\/db\/(?:00[1-8]|010)_/u.test(p));assert.equal(historical.length,9);
const protectedFiles=[...new Set([...historical,...git(['ls-files',...protectedPaths]).trim().split(/\r?\n/u).filter(Boolean)])];
git(['diff','--exit-code','HEAD','--',...protectedFiles]);
const hashes=await Promise.all(protectedFiles.map(async path=>({path,sha256:createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')})));
const reports:any[]=[];const environments=[];
for(const kind of ['ccd','uid'] as const){
 const e=await environment(kind),db=pool(e),runtime=pool(e,'runtime');environments.push(e);let original:pg.Pool|undefined;
 try{
  await new PgAuthStore(runtime).assertRuntime(e.database,e.mode);
  const setup=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-'+kind+'-setup.json',root),'utf8'));
  const sourceName=kind==='ccd'?'banuchat-ccd-dev-postgres-ccd-1':'banuchat-postgres';
  const source=JSON.parse(execFileSync('docker',['inspect',sourceName],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
  assert.equal(source.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');
  const vars=Object.fromEntries((source.Config.Env as string[]).map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
  original=new pg.Pool({host:'127.0.0.1',port:kind==='ccd'?55433:5432,database:vars.POSTGRES_DB,user:vars.POSTGRES_USER,password:vars.POSTGRES_PASSWORD,options:'-c default_transaction_read_only=on'});
  const sourceNow={corpus:await fingerprint(original,kind==='ccd'),history:await fingerprint(original,kind==='ccd',true)};assert.deepEqual(sourceNow,setup.source_before);
  assert.equal(await fingerprint(db,kind==='ccd'),setup.copy_corpus_sha256);
  const acl=(await db.query(`SELECT p.proname,r.rolcanlogin,p.prosecdef,p.proconfig,EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.pronamespace='banuchat_auth'::regnamespace ORDER BY p.proname`)).rows;
  assert.equal(acl.length,3);assert.ok(acl.every(r=>!r.rolcanlogin&&r.prosecdef&&!r.public_execute&&r.proconfig.includes('search_path=pg_catalog, banuchat_auth, pg_temp')));
  const effective=(await runtime.query(`SELECT has_any_column_privilege('banuchat.document_chunks','SELECT') AS chunk_select,has_any_column_privilege('banuchat.datasets','UPDATE') AS corpus_update,has_any_column_privilege('banuchat.conversations','UPDATE') AS conversation_update,pg_has_role(current_user,'banuchat_auth_executor','MEMBER') AS executor_membership`)).rows[0];assert.ok(Object.values(effective).every(v=>v===false));
  let artifacts=0;
  if(kind==='ccd'){
   const versions=(await db.query('SELECT id,source_sha256 FROM banuchat.document_versions')).rows;
   for(const v of versions){const bytes=(await getDocumentArtifact(db,{document_version_id:v.id},storage)).bytes;assert.equal(createHash('sha256').update(bytes).digest('hex'),v.source_sha256);artifacts++;}
   // A repeated bootstrap is rejected atomically; the original 010 still rejects CCD.
   const c=await db.connect();try{for(const name of ['011_ccd_authenticated_bootstrap.sql','010_authenticated_document_reads.sql']){
    await c.query('BEGIN');await c.query("SELECT set_config('banuchat_auth.target_database',$1,true),set_config('banuchat_auth.runtime_role',$2,true),set_config('banuchat_auth.deployment_id',$3,true)",[e.database,e.runtime,e.deployment]);
    await assert.rejects(c.query(await readFile(new URL('infra/db/'+name,root),'utf8')),(error:unknown)=>(error as {code?:string}).code==='P0001');await c.query('ROLLBACK');
   }}finally{await c.query('ROLLBACK');c.release();}
  }
  const counts=(await db.query(`SELECT (SELECT count(*) FROM banuchat_auth.accounts)::int accounts,(SELECT count(*) FROM banuchat_auth.recovery_contacts)::int contacts,(SELECT count(*) FROM banuchat.conversations)::int conversations,(SELECT count(*) FROM banuchat.messages)::int messages,(SELECT count(*) FROM banuchat.message_citations)::int citations`)).rows[0];assert.equal(counts.contacts,0);
  reports.push({kind,database:e.database,source_now:sourceNow,source_unchanged:true,copy_corpus_sha256:await fingerprint(db,kind==='ccd'),acl,effective,artifacts,counts});
 }finally{await Promise.all([db,runtime,original].map(p=>p?.end()));}
}
const changed=[...git(['diff','--name-only']).trim().split(/\r?\n/u),...git(['ls-files','--others','--exclude-standard']).trim().split(/\r?\n/u)].filter(Boolean);
const secrets=[...environments.flatMap(e=>[e.adminPassword,e.runtimePassword,e.provisionPassword,e.rateKey]),...(await demoAccounts()).map(a=>a.password)];
for(const path of changed){
 assert.ok(path.startsWith('backend/api/')||path.startsWith('mobile/')||path.startsWith('eval/auth/results/bch05-ccd-auth-i1b-')||path.startsWith('eval/integration/ccd-auth-i1b')||path.startsWith('docs/operations/ccd-auth-i1b')||path.startsWith('docs/transition/bch05-ccd-auth-i1b')||['infra/db/009_demo_uid_convention.sql','infra/db/011_ccd_authenticated_bootstrap.sql','infra/db/auth-permissions.md'].includes(path),path);
 const content=await readFile(new URL(path,root),'utf8');assert.ok(secrets.every(secret=>!content.includes(secret)),'Private value in versionable file');
}
await evidence('audit',{checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),reports,protected_files:hashes,protected_files_unchanged:true,versionable_files_scanned:changed.length,secrets_found:false,original_010_rejects_ccd:true,repeated_011_rejected:true,other_historic_auth_labs:'not accessed or migrated'});
console.log(JSON.stringify({sources_unchanged:true,protected_files:hashes.length,secrets_found:false,counts:reports.map(r=>({kind:r.kind,...r.counts}))}));
