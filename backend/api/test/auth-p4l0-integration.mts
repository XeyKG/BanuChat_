import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import test from 'node:test';
import {LocalPasswordAdministrator} from '../src/auth/local-password-administrator.js';
import {SyntheticAccountProvisioner} from '../src/auth/provision-account.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import {AuthError} from '../src/auth/primitives.js';
import {environment,pool,root,fingerprint} from './auth-p4l0/environment.js';

interface RefreshStore {available():Promise<boolean>;get():Promise<string|null>;set(v:string):Promise<void>;clear():Promise<void>;}
interface MobileClient {login(uid:string,password:string):Promise<void>;restore():Promise<void>;resource(url:string,init?:RequestInit):Promise<Response>;logout():Promise<boolean>;getSnapshot():{me:null|{principal_id:string;synthetic_uid:string;session_id:string;profile:{profile_key:string;alias:string}}};}
// Runtime import keeps Mobile's Expo module settings out of the API's NodeNext compilation.
const mobileModule=await import(new URL('../../../mobile/src/auth/auth-session.ts',import.meta.url).href);
const AuthSession=(mobileModule.AuthSession??mobileModule.default?.AuthSession) as new(store:RefreshStore,base:()=>string,request?:typeof fetch,now?:()=>number)=>MobileClient;

test('AUTH-P4-L0 real PostgreSQL, administrative credential use case, HTTP v2 and Mobile session core',async t=>{
 const env=await environment(),db=pool(env),runtime=pool(env,true),provision=new Pool({host:env.host,port:env.port,database:env.database,user:env.provisionUser,password:env.provisionPassword});
 const before=await fingerprint(db),admin=await LocalPasswordAdministrator.create({pool:runtime,database:env.database,deployment:env.deploymentId});
 const provisioner=new SyntheticAccountProvisioner(provision,env.database),firstPassword='frase ficticia inicial AUTH-P4-L0',changedPassword='frase ficticia reemplazada AUTH-P4-L0';
 const a=await provisioner.provision({synthetic_uid:'BCH-DEMO-4101',synthetic_display_name:'Cuenta ficticia Alfa',recovery_email:'demo-4101@banuchat.test',profile_key:'auth_fixture'},randomUUID());
 const b=await provisioner.provision({synthetic_uid:'BCH-DEMO-4102',synthetic_display_name:'Cuenta ficticia Beta',recovery_email:'demo-4102@banuchat.test',profile_key:'auth_fixture'},randomUUID());
 const disabled=await provisioner.provision({synthetic_uid:'BCH-DEMO-4103',synthetic_display_name:'Cuenta ficticia Inactiva',recovery_email:'demo-4103@banuchat.test',profile_key:'auth_fixture'},randomUUID());
 const server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),
  router:{catalog_valid:true,catalog_version:'fixture',route:()=>({route:'basic_social',parameters:{},response_variant:'greeting'})},document_rag:async()=>{throw new Error('No Ollama in this auth test');},artifacts:{root}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port+'/api/v2';
 function vault(){let value:string|null=null;return {available:async()=>true,get:async()=>value,set:async(v:string)=>{value=v;},clear:async()=>{value=null;},inspect:()=>value} satisfies RefreshStore&{inspect():string|null};}
 const storageA=vault(),storageB=vault(),clientA=new AuthSession(storageA,()=>base),clientB=new AuthSession(storageB,()=>base);
 const results:Array<{name:string;result:string}>=[];let failures=0;
 async function check(name:string,work:()=>Promise<void>){await t.test(name,async()=>{await db.query('DELETE FROM banuchat_auth.auth_rate_limits');try{await work();results.push({name,result:'PASS'});}catch(e){failures++;results.push({name,result:'FAIL'});if(e&&typeof e==='object'&&'severity'in e)throw new Error('Isolated SQL error '+String((e as {code?:string}).code));throw e;}});}
 try{
 await check('008 existing permissions suffice; admin rejects privileged role, wrong deployment and CCD/incorrect DB',async()=>{
  for(const attempt of [()=>LocalPasswordAdministrator.create({pool:db,database:env.database,deployment:env.deploymentId}),()=>LocalPasswordAdministrator.create({pool:runtime,database:'banuchat_ccd_dev',deployment:env.deploymentId}),()=>LocalPasswordAdministrator.create({pool:runtime,database:env.database,deployment:randomUUID()})])await assert.rejects(attempt);
  await admin.establish(a.synthetic_uid,firstPassword);await admin.establish(b.synthetic_uid,firstPassword);await admin.establish(disabled.synthetic_uid,firstPassword);
  const rows=(await db.query('SELECT status,auth_version::int v FROM banuchat_auth.accounts WHERE id=ANY($1::uuid[])',[[a.principal_id,b.principal_id]])).rows;assert.ok(rows.every(r=>r.status==='active'&&r.v===2));
  assert.match((await db.query('SELECT password_hash FROM banuchat_auth.password_credentials WHERE principal_id=$1',[a.principal_id])).rows[0].password_hash,/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/u);
  assert.equal((await db.query("SELECT count(*)::int n FROM banuchat_auth.security_events WHERE event_type='password_set'")).rows[0].n,3);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.recovery_contacts')).rows[0].n,0);
 });
 await check('real UID/password login and me; wrong password and disabled account fail generically',async()=>{
  const wrong=new AuthSession(vault(),()=>base);await assert.rejects(wrong.login(a.synthetic_uid,'frase ficticia incorrecta'));
  await db.query("UPDATE banuchat_auth.accounts SET status='disabled',disabled_at=t.now,updated_at=t.now FROM (SELECT clock_timestamp() now) t WHERE id=$1",[disabled.principal_id]);await assert.rejects(wrong.login(disabled.synthetic_uid,firstPassword));await assert.rejects(admin.establish(disabled.synthetic_uid,firstPassword,true));
  await clientA.login(a.synthetic_uid,firstPassword);await clientB.login(b.synthetic_uid,firstPassword);
  assert.equal(clientA.getSnapshot().me?.synthetic_uid,a.synthetic_uid);assert.equal(clientA.getSnapshot().me?.profile.profile_key,'auth_fixture');assert.equal(clientA.getSnapshot().me?.profile.alias,clientB.getSnapshot().me?.profile.alias);assert.notEqual(clientA.getSnapshot().me?.principal_id,clientB.getSnapshot().me?.principal_id);
 });
 let chat='';
 await check('own chat, turn and shared-profile history isolation; bearer applied to all protected resources',async()=>{
  const created=await clientA.resource(base+'/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(created.status,201);chat=String((await created.json()).conversation_id);
  const sent=await clientA.resource(base+'/conversations/'+chat+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'hola'})});assert.equal(sent.status,201);assert.equal((await sent.json()).conversation_id,chat);
  assert.equal((await clientA.resource(base+'/conversations/'+chat)).status,200);assert.equal((await clientB.resource(base+'/conversations/'+chat)).status,404);
  const list=await (await clientB.resource(base+'/conversations')).json();assert.equal(list.conversations.length,0);
  const fixture=JSON.parse(await readFile(new URL('../../../infra/local/auth-p4l0/fixture.json',import.meta.url),'utf8'));
  for(const path of ['/me/progress','/calendar/events?date_from=2026-10-22&date_to=2026-10-23','/announcements','/documents/'+fixture.second.document+'/artifact']){assert.equal((await clientA.resource(base+path)).status,200);assert.equal((await fetch(base+path)).status,401);}
 });
 let restored:MobileClient;
 await check('restart restores with rotated refresh and me, serializes concurrent renewal with real backend',async()=>{
  const old=storageA.inspect();restored=new AuthSession(storageA,()=>base);await restored.restore();assert.equal(restored.getSnapshot().me?.principal_id,a.principal_id);assert.notEqual(storageA.inspect(),old);
  let now=Date.now();const clockVault=vault(),clockClient=new AuthSession(clockVault,()=>base,fetch,()=>now);await clockClient.login(a.synthetic_uid,firstPassword);now+=901000;
  const beforeCount=(await db.query('SELECT count(*)::int n FROM banuchat_auth.refresh_tokens')).rows[0].n;
  await Promise.all([clockClient.resource(base+'/me/progress'),clockClient.resource(base+'/announcements')]);assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.refresh_tokens')).rows[0].n,beforeCount+1);assert.equal(await clockClient.logout(),true);
 });
 await check('real access expiry causes 401 and clears Mobile memory/vault without replay',async()=>{
  const expiringVault=vault(),expiring=new AuthSession(expiringVault,()=>base);await expiring.login(b.synthetic_uid,firstPassword);const session=expiring.getSnapshot().me!.session_id;
  await db.query("UPDATE banuchat_auth.sessions SET access_expires_at=access_issued_at+interval '1 second' WHERE id=$1",[session]);await new Promise(r=>setTimeout(r,1100));
  await assert.rejects(expiring.resource(base+'/announcements'));assert.equal(expiringVault.inspect(),null);assert.equal(expiring.getSnapshot().me,null);
 });
 await check('failed credential constraint rolls back account version and every session revocation',async()=>{
  const before=(await db.query('SELECT auth_version::text FROM banuchat_auth.accounts WHERE id=$1',[a.principal_id])).rows[0].auth_version;
  const unrevoked=(await db.query('SELECT count(*)::int n FROM banuchat_auth.sessions WHERE principal_id=$1 AND revoked_at IS NULL',[a.principal_id])).rows[0].n;
  const invalidHasher=await LocalPasswordAdministrator.create({pool:runtime,database:env.database,deployment:env.deploymentId,hasher:{hash:async()=> 'invalid-fixture-phc',verify:async()=>false}});
  await assert.rejects(invalidHasher.establish(a.synthetic_uid,changedPassword,true));
  assert.equal((await db.query('SELECT auth_version::text FROM banuchat_auth.accounts WHERE id=$1',[a.principal_id])).rows[0].auth_version,before);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.sessions WHERE principal_id=$1 AND revoked_at IS NULL',[a.principal_id])).rows[0].n,unrevoked);
 });
 await check('administrative replacement preserves owners/bindings, increments version, revokes all sessions atomically',async()=>{
  const snapshot=async()=>JSON.stringify((await db.query('SELECT to_jsonb(b) binding,to_jsonb(o) owner FROM banuchat_auth.profile_bindings b LEFT JOIN banuchat_auth.conversation_owners o USING(principal_id) WHERE b.principal_id=$1',[a.principal_id])).rows);
  const prior=await snapshot(),version=(await db.query('SELECT auth_version::text FROM banuchat_auth.accounts WHERE id=$1',[a.principal_id])).rows[0].auth_version;
  await assert.rejects(admin.establish(a.synthetic_uid,changedPassword));await admin.establish(a.synthetic_uid,changedPassword,true);assert.equal(await snapshot(),prior);
  assert.equal(BigInt((await db.query('SELECT auth_version::text FROM banuchat_auth.accounts WHERE id=$1',[a.principal_id])).rows[0].auth_version),BigInt(version)+1n);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.sessions WHERE principal_id=$1 AND revoked_at IS NULL',[a.principal_id])).rows[0].n,0);
  await assert.rejects(restored!.resource(base+'/announcements'));assert.equal(storageA.inspect(),null);
  const wrong=new AuthSession(vault(),()=>base);await assert.rejects(wrong.login(a.synthetic_uid,firstPassword));await wrong.login(a.synthetic_uid,changedPassword);assert.equal((await wrong.resource(base+'/conversations/'+chat)).status,200);assert.equal(await wrong.logout(),true);
 });
 await check('logout revokes server session and account switch exposes only the new owner',async()=>{
  const session=clientB.getSnapshot().me!.session_id;assert.equal(await clientB.logout(),true);assert.equal(storageB.inspect(),null);assert.equal(clientB.getSnapshot().me,null);assert.ok((await db.query('SELECT revoked_at FROM banuchat_auth.sessions WHERE id=$1',[session])).rows[0].revoked_at);
  await clientB.login(a.synthetic_uid,changedPassword);assert.equal(clientB.getSnapshot().me?.principal_id,a.principal_id);assert.equal((await clientB.resource(base+'/conversations/'+chat)).status,200);assert.equal(await clientB.logout(),true);
 });
 await check('recovery remains unconfigured, no anonymous v1/registration and no corpus/history changes',async()=>{
  assert.equal((await fetch(base.replace('/api/v2','')+'/api/v1/profiles')).status,404);assert.equal((await fetch(base+'/profiles')).status,404);assert.equal((await fetch(base+'/auth/signup',{method:'POST'})).status,404);
  assert.equal((await fetch(base+'/auth/password/reset-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({synthetic_uid:a.synthetic_uid})})).status,503);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.recovery_mail_dispatches')).rows[0].n,0);assert.equal(await fingerprint(db),before);assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[chat])).rows[0].n,2);
 });
 await writeFile(new URL('../../../infra/local/auth-p4l0/results.json',import.meta.url),JSON.stringify({status:failures?'FAIL':'PASS',checks:results,corpusBefore:before,corpusAfter:await fingerprint(db),secureStore:'DOUBLE_ONLY',physicalDevice:'NOT_TESTED',mail:'SUSPENDED',externalSent:false},null,2)+'\n');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.end();await provision.end();await db.end();}
});
