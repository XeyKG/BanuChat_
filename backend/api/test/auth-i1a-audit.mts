/** Final read-only source/destination/ACL/contract audit. Does not query CCD. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {environment,pool,fingerprint,evidence} from './auth-i1a/environment.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
const e=await environment(),db=pool(e),runtime=pool(e,'runtime');
let original:pg.Pool|undefined;
try{
 await new PgAuthStore(runtime).assertRuntime(e.database);
 const setup=JSON.parse(await readFile(new URL('../../../eval/auth/results/bch05-ccd-auth-i1a-setup.json',import.meta.url),'utf8'));
 const exec=(await runtime.query(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('banuchat','banuchat_auth') AND has_function_privilege(p.oid,'EXECUTE') ORDER BY p.proname`)).rows.map(r=>r.proname);
 assert.deepEqual(exec,['current_retrieval_context','persist_turn','resource_context','retrieve_document_chunks','search_chunks_cosine']);
 const acl=(await db.query(`SELECT r.rolname,a.privilege_type FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE p.oid='banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)'::regprocedure ORDER BY r.rolname`)).rows;
 assert.deepEqual(acl.map(r=>r.rolname).sort(),[e.runtime,'banuchat_auth_executor'].sort());assert.ok(acl.every(r=>r.privilege_type==='EXECUTE'));
 const source=JSON.parse(execFileSync('docker',['inspect','banuchat-postgres'],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
 assert.equal(source.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');assert.equal(source.NetworkSettings.Ports['5432/tcp'][0].HostPort,'5432');
 const vars=Object.fromEntries((source.Config.Env as string[]).map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
 original=new pg.Pool({host:'127.0.0.1',port:5432,database:vars.POSTGRES_DB,user:vars.POSTGRES_USER,password:vars.POSTGRES_PASSWORD});
 const sourceNow={corpus:await fingerprint(original),history:await fingerprint(original,['conversations','messages','message_citations'])};assert.deepEqual(sourceNow,setup.source_before);
 const copy=await fingerprint(db);assert.equal(copy,setup.copy_corpus_sha256);
 const protectedEvidence=JSON.parse(await readFile(new URL('../../../eval/auth/results/bch04-auth-p4l1-evidence.json',import.meta.url),'utf8'));
 const protectedFiles:Array<{path:string;unchanged:boolean}>=[];
 for(const file of protectedEvidence.protectedFiles.hashes as Array<{path:string;sha256:string}>){
  if(file.path==='infra/db/auth-permissions.md')continue;
  const hash=createHash('sha256').update(await readFile(new URL('../../../'+file.path,import.meta.url))).digest('hex');assert.equal(hash,file.sha256,file.path);protectedFiles.push({path:file.path,unchanged:true});
 }
 const pending=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split(/\r?\n/u).filter(Boolean).map(v=>v.trim().replace(/^(?:M|\?\?)\s+/u,''));
 for(const file of pending)assert.ok(file.startsWith('backend/api/src/')||file.startsWith('backend/api/test/auth-i1a')||file==='backend/api/test/authenticated-document-retrieval.test.ts'||file==='backend/api/README.md'||file==='infra/db/auth-permissions.md'||file==='infra/db/010_authenticated_document_reads.sql'||file.startsWith('eval/auth/results/bch05-ccd-auth-i1a-')||file==='docs/transition/bch05-ccd-auth-i1a-checkpoint.md',file);
 const secrets=[e.adminPassword,e.runtimePassword,e.provisionPassword,e.rateKey];
 const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/u).filter(Boolean);
 const added=execFileSync('git',['ls-files','--full-name','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/u).filter(Boolean);
 for(const path of [...changed,...added]){const content=await readFile(new URL('../../../'+path,import.meta.url),'utf8');assert.ok(secrets.every(value=>!content.includes(value)),'Private technical value in versionable file');}
 const counts=(await db.query(`SELECT (SELECT count(*) FROM banuchat_auth.accounts)::int AS accounts,(SELECT count(*) FROM banuchat_auth.password_credentials)::int AS credentials,(SELECT count(*) FROM banuchat_auth.recovery_contacts)::int AS contacts,(SELECT count(*) FROM banuchat.conversations)::int AS conversations,(SELECT count(*) FROM banuchat.messages)::int AS messages,(SELECT count(*) FROM banuchat.message_citations)::int AS citations`)).rows[0];
 await evidence('audit',{checkpoint:'BCH-05/CCD-AUTH-I1A',at:new Date().toISOString(),runtime_guard:true,application_execute:exec,function_acl:acl,source_now:sourceNow,source_unchanged:true,copy_corpus_sha256:copy,protected_files:protectedFiles,private_technical_values_in_versionable_files:false,counts});
 console.log(JSON.stringify({runtime_guard:true,source_unchanged:true,copy_corpus_unchanged:true,protected_files:protectedFiles.length,counts}));
}finally{await Promise.all([db,runtime,original].map(p=>p?.end()));}
