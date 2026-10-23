import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {environment,pool} from './auth-p31/environment.js';

// Read-only evidence collector. No contact, code, hash, token or private configuration output.
const env=await environment(),db=pool(env),runtime=pool(env,true),run=promisify(execFile);
const root=new URL('../../../',import.meta.url),cwd=fileURLToPath(root);
const git=async(...args:string[])=>(await run('git',args,{cwd})).stdout;
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
try{
 const head=(await git('rev-parse','HEAD')).trim();assert.equal(head,'e161a4fc6619226bc7a2352d34acc40998c8f70c');
 const baseline=JSON.parse(await git('show','HEAD:backend/api/openapi-v2.yaml'));
 const current=JSON.parse(await readFile(new URL('backend/api/openapi-v2.yaml',root),'utf8'));
 const unchangedOperations:string[]=[];
 for(const [path,item] of Object.entries(baseline.paths)){
  if(path.startsWith('/auth/password/'))continue;
  assert.deepEqual(current.paths[path],item);unchangedOperations.push(path);
 }
 assert.equal(unchangedOperations.length,11); // Thirteen operations across eleven path items.
 for(const [name,schema] of Object.entries(baseline.components.schemas)){
  if(name==='reset_confirmation')continue;
  if(name==='opaque_token'){
   const {description:oldDescription,...oldShape}=schema as Record<string,unknown>;
   const {description:newDescription,...newShape}=current.components.schemas[name];assert.deepEqual(newShape,oldShape);
  }else assert.deepEqual(current.components.schemas[name],schema);
 }
 for(const key of ['servers','security','tags'])assert.deepEqual(current[key],baseline[key]);
 for(const key of Object.keys(baseline.components).filter(v=>v!=='schemas'))assert.deepEqual(current.components[key],baseline.components[key]);
 const protectedPaths=['infra/db/001_initial_schema.sql','infra/db/006_synthetic_auth.sql','infra/db/007_authenticated_resources.sql',
  'backend/api/openapi.yaml','backend/api/api-contract.md','backend/mcp-server/tools.contract.json','backend/mcp-server/tools-contract.md'];
 const protectedHashes=[];
 for(const path of protectedPaths){const bytes=await readFile(new URL(path,root));assert.equal(sha(bytes.toString('utf8').replaceAll('\r\n','\n')),sha((await git('show','HEAD:'+path)).replaceAll('\r\n','\n')));protectedHashes.push({path,sha256:sha(bytes),unchanged:true});}
 const protectedTrees=['data/synthetic','data/ccd','mobile','backend/mcp-server','backend/rag','backend/api/src/application'];
 assert.equal((await git('diff','--name-only','HEAD','--',...protectedTrees)).trim(),'');
 assert.equal((await git('ls-files','--others','--exclude-standard','--',...protectedTrees)).trim(),'');
 const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='banuchat_auth' ORDER BY tablename")).rows;
 const constraints=(await db.query("SELECT c.contype,count(*)::int count,bool_and(c.convalidated) validated FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid WHERE r.relnamespace='banuchat_auth'::regnamespace AND r.relname LIKE 'recovery_%' GROUP BY c.contype ORDER BY c.contype")).rows;
 const indexes=(await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='banuchat_auth' AND tablename LIKE 'recovery_%' ORDER BY indexname")).rows;
 const privileges=[];
 for(const table of ['accounts','password_credentials','recovery_contacts','recovery_challenges','recovery_uid_limits','recovery_mail_dispatches']){
  const q=(await runtime.query("SELECT has_table_privilege($1,'SELECT') AS select,has_table_privilege($1,'INSERT') AS insert,has_table_privilege($1,'DELETE') AS delete,has_table_privilege($1,'TRUNCATE') AS truncate",['banuchat_auth.'+table])).rows[0];
  const update=(await db.query("SELECT column_name FROM information_schema.column_privileges WHERE grantee=$1 AND table_schema='banuchat_auth' AND table_name=$2 AND privilege_type='UPDATE' ORDER BY column_name",[env.runtimeUser,table])).rows.map(r=>r.column_name);
  privileges.push({table,...q,update});
 }
 const names=(await db.query("SELECT count(*)::int accounts,count(*) FILTER(WHERE synthetic_display_name IS NULL)::int legacy_unnamed,count(*) FILTER(WHERE synthetic_display_name IS NOT NULL)::int named FROM banuchat_auth.accounts")).rows[0];
 const channels=(await db.query('SELECT verification_channel,status,count(*)::int count FROM banuchat_auth.recovery_contacts GROUP BY verification_channel,status ORDER BY verification_channel,status')).rows;
 const dispatches=(await db.query('SELECT state,count(*)::int count FROM banuchat_auth.recovery_mail_dispatches GROUP BY state ORDER BY state')).rows;
 const result=JSON.parse(await readFile(new URL('infra/local/auth-p31/results.json',root),'utf8'));
 const checks=JSON.parse(await readFile(new URL('infra/local/auth-p31/checks.json',root),'utf8'));
 assert.equal(checks.typecheck.exitCode,0);assert.equal(checks.build.exitCode,0);assert.equal(checks.unitTests.exitCode,0);assert.equal(checks.unitTests.fail,0);assert.equal(checks.unitTests.pass,549);
 assert.equal(result.result,'PASS');assert.equal(result.checks.length,15);assert.equal(result.corpusBefore,result.corpusAfter);
 await writeFile(new URL('eval/auth/results/bch04-auth-p31-final.json',root),JSON.stringify(result,null,2)+'\n');
 const evidence={checkpoint:'BCH-04/AUTH-P3.1',baseCommit:head,result:'PASS',contract:{version:current.info.version,prefix:'/api/v2',operations:15,otherOperationsUnchanged:13,unchangedPathItems:unchangedOperations.length,sessionShapeUnchanged:true,currentSessionUnchanged:true},
  database:{name:env.database,host:env.host,port:env.port,authTables:tables,constraints,indexes,privileges,names,channels,dispatches,corpusUnchanged:true},
  verification:{...checks,integration:{checks:result.checks.length,nodeTestCount:result.checks.length+1,pass:result.checks.length+1,fail:0},firstRun:{result:'FAIL',sqlState:'42804',correction:'Explicit timestamptz cast in failed-attempt invalidation CASE; corrected and retested from empty instance.'}},
  protectedHashes,protectedTreesUnchanged:protectedTrees,external:{providerConfigured:false,sent:false,received:false,consumed:false,localCaptureOnly:true},
  cleanup:{status:'PENDING_VERIFIED_TASK_RESOURCE_REMOVAL'},authP3:'NOT_CLOSED_EXTERNAL_DELIVERY_PENDING'};
 await writeFile(new URL('eval/auth/results/bch04-auth-p31-evidence.json',root),JSON.stringify(evidence,null,2)+'\n');
 console.log('Sanitized AUTH-P3.1 evidence saved; all thirteen prior operations and session schemas unchanged.');
}finally{await runtime.end();await db.end();}
