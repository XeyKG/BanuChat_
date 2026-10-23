import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {environment,pool,fingerprint,evidence,root} from './auth-i1b/environment.js';
import {provisionDemoAccounts} from './auth-i1b/accounts.js';
import {ccdBootstrapSource} from './auth-i1b/bootstrap-source.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {AuthService} from '../src/auth/auth-service.js';
import {LocalPasswordAdministrator} from '../src/auth/local-password-administrator.js';
import {SyntheticAccountProvisioner} from '../src/auth/provision-account.js';
import {retrieveDocumentChunks} from '../src/application/document-retrieval.js';
import {retrieveAuthenticatedDocumentChunks} from '../src/application/authenticated-document-retrieval.js';
const code=(value:string)=>(error:unknown)=>{assert.equal((error as {code?:string}).code,value);return true;};
test('I1B real SQL branch, UID compatibility, privileges and schema equivalence',async t=>{
 const e=await environment(),u=await environment('uid'),db=pool(e),runtime=pool(e,'runtime'),uidDb=pool(u),uidRuntime=pool(u,'runtime'),uidProvision=pool(u,'provisioner');
 const checks:Array<{name:string;passed:boolean}>=[];const run=async(name:string,work:()=>Promise<void>)=>t.test(name,async()=>{try{await work();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false});throw error;}});
 const before=await fingerprint(db,true),beforeUid=await fingerprint(uidDb);let privileges:unknown;
 try{
 await run('011 is exactly the reviewed derivative; historical turn CTE unchanged',async()=>{
  const actual=(await readFile(new URL('infra/db/011_ccd_authenticated_bootstrap.sql',root),'utf8')).replaceAll('\r\n','\n');assert.equal(actual,await ccdBootstrapSource());
  const seven=(await readFile(new URL('infra/db/007_authenticated_resources.sql',root),'utf8')).replaceAll('\r\n','\n');assert.equal(actual.split('-- BEGIN HISTORICAL TURN\n')[1]!.split('-- END HISTORICAL TURN')[0],seven.split('-- BEGIN HISTORICAL TURN\n')[1]!.split('-- END HISTORICAL TURN')[0]);
 });
 await run('shared account, credential, session, limiter and recovery tables are equivalent in PostgreSQL',async()=>{
  for(const table of ['accounts','password_credentials','sessions','refresh_tokens','password_reset_tokens','auth_rate_limits','security_events','recovery_contacts','recovery_challenges','recovery_uid_limits','recovery_mail_dispatches','conversation_owners']){
   const cols=`SELECT attname,format_type(atttypid,atttypmod) AS type,attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`;
   assert.deepEqual((await db.query(cols,['banuchat_auth.'+table])).rows,(await uidDb.query(cols,['banuchat_auth.'+table])).rows,table);
   const constraints=`SELECT contype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass ORDER BY contype,pg_get_constraintdef(oid)`;
   assert.deepEqual((await db.query(constraints,['banuchat_auth.'+table])).rows,(await uidDb.query(constraints,['banuchat_auth.'+table])).rows,table);
  }
 });
 await run('runtime requires explicit CCD scope and rejects synthetic mode; no chunk SELECT, UPDATE or executor membership',async()=>{
  await new PgAuthStore(runtime).assertRuntime(e.database,'ccd_local');await assert.rejects(new PgAuthStore(runtime).assertRuntime(e.database,'synthetic'));
  privileges=(await runtime.query(`SELECT has_any_column_privilege('banuchat.document_chunks','SELECT') AS chunk_select,has_any_column_privilege('banuchat.datasets','UPDATE') AS dataset_update,has_any_column_privilege('banuchat.dataset_releases','UPDATE') AS release_update,has_any_column_privilege('banuchat.conversations','UPDATE') AS conversation_update,pg_has_role(current_user,'banuchat_auth_executor','MEMBER') AS executor_member,has_schema_privilege('banuchat_auth','CREATE') AS ddl`)).rows[0];assert.ok(Object.values(privileges as object).every(v=>v===false));
  await assert.rejects(runtime.query('SELECT * FROM banuchat.document_chunks LIMIT 1'),code('42501'));await assert.rejects(runtime.query('SET ROLE banuchat_auth_executor'),code('42501'));
  const acl=(await db.query(`SELECT p.proname,r.rolcanlogin,p.proconfig,EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.pronamespace='banuchat_auth'::regnamespace ORDER BY p.proname`)).rows;
  assert.equal(acl.length,3);assert.ok(acl.every(v=>!v.rolcanlogin&&!v.public_execute&&v.proconfig.includes('search_path=pg_catalog, banuchat_auth, pg_temp')));
  const c=await db.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE auth_i1a_outsider');await assert.rejects(c.query('SELECT * FROM banuchat_auth.retrieve_document_chunks($1,$2::public.vector,12)',['3d6cedac-0e86-40c8-909b-d3ff6e8ab741',JSON.stringify([1,...Array<number>(1023).fill(0)])]),code('42501'));}finally{await c.query('ROLLBACK');c.release();}
 });
 await run('CCD retrieval is equivalent and release/dimension/top-k scopes cannot be bypassed',async()=>{
  const release='3d6cedac-0e86-40c8-909b-d3ff6e8ab741',vector=[1,...Array<number>(1023).fill(0)],input={release_id:release,query_embedding:vector,top_k:12};assert.deepEqual(await retrieveDocumentChunks(db,input),await retrieveAuthenticatedDocumentChunks(runtime,input));
  const sql='SELECT * FROM banuchat_auth.retrieve_document_chunks($1,$2::public.vector,$3)';
  for(const id of ['5834fc47-57c5-498b-98fc-4190330155e4',randomUUID()])await assert.rejects(runtime.query(sql,[id,JSON.stringify(vector),12]),code('P0409'));
  await assert.rejects(runtime.query(sql,[release,'[1,0]',12]),code('P0400'));await assert.rejects(runtime.query(sql,[release,JSON.stringify(vector),21]),code('P0400'));
 });
 await run('009 preserved legacy UID, principal and login; new UID also authenticates without renaming',async()=>{
  const administrator=await LocalPasswordAdministrator.create({pool:uidRuntime,database:u.database,deployment:u.deployment});const password=randomBytes(30).toString('base64url');const legacy=(await uidDb.query("SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid='BCH-DEMO-9401'")).rows[0].id;
  await administrator.establish('BCH-DEMO-9401',password);
  const profile=(await uidDb.query('SELECT profile_key FROM banuchat.synthetic_profiles p JOIN banuchat.datasets d ON d.current_release_id=p.dataset_release_id ORDER BY profile_key LIMIT 1')).rows[0].profile_key;
  await new SyntheticAccountProvisioner(uidProvision,u.database).provision({synthetic_uid:'U08000003',synthetic_display_name:'Nueva Ficticia UID',profile_key:profile,recovery_email:'nueva-u08000003@banuchat.test'},randomUUID());await administrator.establish('U08000003',randomBytes(30).toString('base64url'));
  const core=await AuthService.create({pool:uidRuntime,expectedDatabase:u.database,deploymentId:u.deployment,rateKey:Buffer.from(u.rateKey,'hex')});const login=await core.login({synthetic_uid:'BCH-DEMO-9401',password},{origin:'i1b-uid-test',requestId:randomUUID()});const me=await core.currentSession(login.access_token);assert.equal(me.principal_id,legacy);assert.equal(me.synthetic_uid,'BCH-DEMO-9401');assert.equal(me.evidence_mode,'synthetic');await core.logout(login.access_token,{origin:'i1b-uid-test',requestId:randomUUID()});
  for(const value of ['U0800000１','u08000001',' U08000001','U0800001','U080000001'])await assert.rejects(uidDb.query('INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES($1,$2)',[value,'invalid@banuchat.test']),code('23514'));
  await assert.rejects(new SyntheticAccountProvisioner(uidProvision,u.database).provision({synthetic_uid:'BCH-DEMO-9402',profile_key:profile,recovery_email:'legacy-new@banuchat.test'},randomUUID()));
 });
 await run('two new CCD accounts use the technical context, Argon2id and no verified contact',async()=>{
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.accounts')).rows[0].n,0);await provisionDemoAccounts(e);
  const rows=(await db.query(`SELECT a.synthetic_uid,b.profile_key,p.password_hash LIKE '$argon2id$%' AS argon2id FROM banuchat_auth.accounts a JOIN banuchat_auth.profile_bindings b ON b.principal_id=a.id JOIN banuchat_auth.password_credentials p ON p.principal_id=a.id ORDER BY synthetic_uid`)).rows;assert.equal(rows.length,2);assert.ok(rows.every(r=>r.profile_key==='ccd-local-demo'&&r.argon2id));assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.recovery_contacts')).rows[0].n,0);
 });
 await run('original snapshot, releases, hashes, vectors and synthetic corpus remain unchanged',async()=>{assert.equal(await fingerprint(db,true),before);assert.equal(await fingerprint(uidDb),beforeUid);});
 await evidence('sql',{checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),checks,privileges,ccd_corpus_before:before,ccd_corpus_after:await fingerprint(db,true),uid_corpus_before:beforeUid,uid_corpus_after:await fingerprint(uidDb)});
 }finally{await Promise.all([db,runtime,uidDb,uidRuntime,uidProvision].map(p=>p.end()));}
});
