import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Pool} from 'pg';
import test from 'node:test';
import {AuthService} from '../src/auth/auth-service.js';
import {AuthError,Argon2idHasher,postgresClock,type AuthClock} from '../src/auth/primitives.js';
import {RecoveryService} from '../src/auth/recovery-service.js';
import {RecoveryCrypto} from '../src/auth/recovery-crypto.js';
import {LocalCaptureMailDelivery} from '../src/auth/mail-delivery.js';
import {SyntheticAccountProvisioner} from '../src/auth/provision-account.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import {environment,pool,fingerprint,root} from './auth-p31/environment.js';
test('AUTH-P3.1 PostgreSQL, HTTP and explicit local delivery capture',async t=>{
 const env=await environment(),db=pool(env),runtime=pool(env,true),provision=new Pool({host:env.host,port:env.port,database:env.database,user:env.provisionUser,password:env.provisionPassword,connectionTimeoutMillis:5000,statement_timeout:10000});
 for(const p of [db,runtime,provision])p.on('error',()=>{}); // Test-owned pools: idle sockets die in the deliberate task-container outage.
 const before=await fingerprint(db),provisioner=new SyntheticAccountProvisioner(provision,env.database);let sequence=3100;
 const recipients=Array.from({length:60},(_,i)=>`demo-${i+3101}@academic.example`),mail=new LocalCaptureMailDelivery(recipients);
 const crypto=new RecoveryCrypto({mac:Buffer.from(env.macKey,'hex'),encryption:Buffer.from(env.encryptionKey,'hex'),lookup:Buffer.from(env.lookupKey,'hex')});
 const core=await AuthService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex')});
 const recovery=await RecoveryService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),crypto,mail});
 const server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),recovery,
  router:{catalog_valid:true,catalog_version:'fixture',route:()=>({route:'basic_social',parameters:{},response_variant:'greeting'})},document_rag:async()=>{throw new Error('No generation in recovery');},artifacts:{root},now:()=> '2026-10-22T15:00:00Z'});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const port=address.port;
 const context=()=>({origin:'isolated-'+randomUUID(),requestId:randomUUID()});const secret='frase ficticia nueva para AUTH-P3.1',changed='otra frase ficticia diferente AUTH-P3.1';
 const fixture=JSON.parse(await readFile(new URL('../../../infra/local/auth-p31/fixture.json',import.meta.url),'utf8')) as {first:{document:string};second:{release:string;document:string}};
 const require=createRequire(new URL('../../mcp-server/package.json',import.meta.url));
 interface Validator{(v:unknown):boolean;errors?:unknown;}interface Compiler{addSchema(v:unknown):void;compile(v:unknown):Validator;addFormat(k:string,v:boolean):void;}
 const Ajv=(require('ajv/dist/2020.js') as {default:new(o:unknown)=>Compiler}).default,ajv=new Ajv({strict:true,strictTypes:false,allErrors:true});(require('ajv-formats') as (c:Compiler)=>void)(ajv);ajv.addFormat('binary',true);
 const spec=JSON.parse(await readFile(new URL('../openapi-v2.yaml',import.meta.url),'utf8')) as {components:{schemas:unknown}};ajv.addSchema({$id:'urn:banuchat:auth-p31',$defs:JSON.parse(JSON.stringify(spec.components.schemas).replaceAll('#/components/schemas/','#/$defs/'))});
 const schema=(name:string,value:unknown)=>{const valid=ajv.compile({$ref:'urn:banuchat:auth-p31#/$defs/'+name});assert.equal(valid(value),true,JSON.stringify(valid.errors));};
 type Response={status:number;body:Record<string,unknown>;headers:Record<string,string|string[]|undefined>;bytes:Buffer};
 const request=(method:string,path:string,body?:unknown,token?:string)=>new Promise<Response>((resolve,reject)=>{
  const bytes=body===undefined?undefined:Buffer.from(JSON.stringify(body));const q=httpRequest({host:'127.0.0.1',port,method,path,headers:{...(bytes?{'Content-Type':'application/json','Content-Length':String(bytes.length)}:{}),...(token?{Authorization:'Bearer '+token}:{})}},r=>{
   const chunks:Buffer[]=[];r.on('data',(c:Buffer)=>chunks.push(c));r.on('end',()=>{const bytes=Buffer.concat(chunks);resolve({status:r.statusCode!,headers:r.headers,bytes,body:String(r.headers['content-type']).startsWith('application/json')?JSON.parse(bytes.toString()) as Record<string,unknown>:{}});});
  });q.setTimeout(10000,()=>q.destroy(new Error('Isolated HTTP timeout')));q.on('error',reject);q.end(bytes);
 });
 const rejectCode=(code:string)=>(error:unknown)=>error instanceof AuthError&&error.code===code;
 async function rates(){await db.query('DELETE FROM banuchat_auth.auth_rate_limits; DELETE FROM banuchat_auth.recovery_uid_limits');}
 async function named(){const digits=String(++sequence);const a=await provisioner.provision({synthetic_uid:'BCH-DEMO-'+digits,recovery_email:'historical-'+digits+'@banuchat.test',profile_key:'auth_fixture',synthetic_display_name:'Cuenta ficticia '+digits},randomUUID());return {...a,email:'demo-'+digits+'@academic.example'};}
 async function verified(){const a=await named();await recovery.registerContact(a.synthetic_uid,a.email,randomUUID());await recovery.requestContactVerification(a.synthetic_uid,context());const message=mail.take(a.email,'verify_contact');assert.ok(message?.code);await recovery.verifyContact(a.synthetic_uid,message.code,context());return a;}
 async function active(){const a=await verified();await recovery.request({synthetic_uid:a.synthetic_uid},context());await recovery.drain();const message=mail.take(a.email,'initial_set');assert.ok(message?.code);await recovery.confirm({synthetic_uid:a.synthetic_uid,verification_code:message.code,new_password:secret},context());return a;}
 async function resetCode(a:Awaited<ReturnType<typeof active>>){await recovery.request({synthetic_uid:a.synthetic_uid},context());await recovery.drain();const m=mail.take(a.email,'reset');assert.ok(m?.code);return m.code;}
 async function history(id:string){return (await db.query(`SELECT jsonb_build_object('conversation',(SELECT to_jsonb(c) FROM banuchat.conversations c WHERE id=$1),'messages',(SELECT jsonb_agg(to_jsonb(m) ORDER BY ordinal) FROM banuchat.messages m WHERE conversation_id=$1),'citations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.message_id,c.citation_index) FROM banuchat.message_citations c JOIN banuchat.messages m ON m.id=c.message_id WHERE m.conversation_id=$1),'owner',(SELECT to_jsonb(o) FROM banuchat_auth.conversation_owners o WHERE conversation_id=$1))::text snapshot`,[id])).rows[0].snapshot as string;}
 const evidence:Array<{name:string;result:string}>=[];let failed=0;
 async function check(name:string,work:()=>Promise<void>){await t.test(name,async()=>{await rates();try{await work();evidence.push({name,result:'PASS'});}catch(e){failed++;evidence.push({name,result:'FAIL'});if(e!==null&&typeof e==='object'&&'severity'in e)throw new Error('Isolated SQL failure '+String((e as {code?:string}).code));throw e;}});}
 try{
 await check('008 additive constraints/keys/ACL and legacy name NULL without backfill',async()=>{
  assert.equal((await db.query("SELECT synthetic_display_name FROM banuchat_auth.accounts WHERE synthetic_uid='BCH-DEMO-0001'")).rows[0].synthetic_display_name,null);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_class WHERE relnamespace='banuchat_auth'::regnamespace AND relkind='r'")).rows[0].n,16);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_constraint WHERE connamespace='banuchat_auth'::regnamespace AND NOT convalidated")).rows[0].n,0);
  for(const table of ['conversations','datasets','dataset_releases'])assert.equal((await runtime.query("SELECT has_any_column_privilege($1,'UPDATE') allowed",['banuchat.'+table])).rows[0].allowed,false);
  for(const q of ['TRUNCATE banuchat_auth.recovery_challenges','DELETE FROM banuchat.synthetic_profiles','SELECT * FROM banuchat_auth.password_credentials']){const p=q.includes('password_credentials')?provision:runtime;await assert.rejects(p.query(q),e=>(e as {code?:string}).code==='42501');}
  const guard=await db.connect();try{await guard.query("SELECT set_config('banuchat_auth.target_database','wrong_target',false)");await assert.rejects(guard.query(await readFile(new URL('../../../infra/db/008_verified_recovery_email.sql',import.meta.url),'utf8')),e=>(e as {code?:string}).code==='P0001');await guard.query('ROLLBACK');}finally{guard.release();}
  const a=await verified(),b=await named();await recovery.request({synthetic_uid:a.synthetic_uid},context());await recovery.drain();mail.take(a.email,'initial_set');
  const probe=await db.connect();try{await probe.query('BEGIN');
   const negative=async(sql:string,values:unknown[],code:string)=>{await probe.query('SAVEPOINT invalid_row');await assert.rejects(probe.query(sql,values),e=>(e as {code?:string}).code===code);await probe.query('ROLLBACK TO SAVEPOINT invalid_row');};
   await negative("UPDATE banuchat_auth.accounts SET synthetic_display_name=' ' WHERE id=$1",[a.principal_id],'23514');
   await negative("UPDATE banuchat_auth.recovery_contacts SET nonce=decode('00','hex') WHERE principal_id=$1",[a.principal_id],'23514');
   await negative("UPDATE banuchat_auth.recovery_contacts SET verified_at=NULL,verification_reference=NULL,verification_channel=NULL WHERE principal_id=$1",[a.principal_id],'23514');
   await negative("UPDATE banuchat_auth.recovery_challenges SET expires_at=created_at+interval '301 seconds' WHERE principal_id=$1",[a.principal_id],'23514');
   await negative("UPDATE banuchat_auth.recovery_challenges SET principal_id=$2 WHERE principal_id=$1",[a.principal_id,b.principal_id],'23503');
   await negative("UPDATE banuchat_auth.recovery_challenges SET failed_attempts=6 WHERE principal_id=$1",[a.principal_id],'23514');
   await negative("INSERT INTO banuchat_auth.recovery_challenges SELECT (jsonb_populate_record(NULL::banuchat_auth.recovery_challenges,to_jsonb(c)||jsonb_build_object('id',gen_random_uuid()))).* FROM banuchat_auth.recovery_challenges c WHERE principal_id=$1 AND purpose='initial_set'",[a.principal_id],'23505');
   await probe.query('ROLLBACK');
  }finally{probe.release();}
 });
 await check('UID/name/contact/hash remain distinct from shared academic profile; no secret or own name in me',async()=>{
  const a=await active(),b=await active();const rows=(await db.query('SELECT synthetic_uid,synthetic_display_name,recovery_email FROM banuchat_auth.accounts WHERE id=ANY($1::uuid[]) ORDER BY synthetic_uid',[[a.principal_id,b.principal_id]])).rows;
  assert.notEqual(rows[0].synthetic_display_name,rows[1].synthetic_display_name);assert.ok(rows.every(r=>String(r.recovery_email).endsWith('@banuchat.test')));
  const privateContact=(await db.query('SELECT * FROM banuchat_auth.recovery_contacts WHERE principal_id=$1',[a.principal_id])).rows[0];assert.equal(privateContact.status,'verified');assert.equal(privateContact.verification_channel,'local_test');assert.ok(!JSON.stringify(privateContact).includes(a.email));
  const token=await core.login({synthetic_uid:a.synthetic_uid,password:secret},context());const me=await request('GET','/api/v2/auth/me',undefined,token.access_token);schema('current_session',me.body);assert.ok(!Object.hasOwn(me.body,'synthetic_display_name'));assert.ok(!JSON.stringify(me.body).includes(a.email));
  assert.match((await db.query('SELECT password_hash FROM banuchat_auth.password_credentials WHERE principal_id=$1',[a.principal_id])).rows[0].password_hash,/^\$argon2id\$/u);
 });
 await check('HTTP initial set, local code reception with leading zeros and no automatic session',async()=>{
  const a=await verified();const generator=crypto.code;crypto.code=()=> '00001234';
  try{const accepted=await request('POST','/api/v2/auth/password/reset-requests',{synthetic_uid:a.synthetic_uid});assert.equal(accepted.status,202);schema('reset_accepted',accepted.body);await recovery.drain();const m=mail.take(a.email,'initial_set');assert.equal(m?.code,'00001234');
   const set=await request('POST','/api/v2/auth/password/reset',{synthetic_uid:a.synthetic_uid,verification_code:m!.code,new_password:secret});assert.equal(set.status,204);assert.equal(set.bytes.length,0);assert.equal(set.headers['content-type'],undefined);
   assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.sessions WHERE principal_id=$1',[a.principal_id])).rows[0].n,0);assert.equal((await request('POST','/api/v2/auth/login',{synthetic_uid:a.synthetic_uid,password:secret})).status,200);
  }finally{crypto.code=generator;}
 });
 await check('HTTP recovery revokes every old session, rejects old password and replay',async()=>{
  const a=await active();const one=await core.login({synthetic_uid:a.synthetic_uid,password:secret},context()),two=await core.login({synthetic_uid:a.synthetic_uid,password:secret},context());const chat=await request('POST','/api/v2/conversations',{},one.access_token);assert.equal(chat.status,201);const chatId=String(chat.body.conversation_id);assert.equal((await request('POST',`/api/v2/conversations/${chatId}/messages`,{content:'hola'},one.access_token)).status,201);const stored=await history(chatId);const code=await resetCode(a);
  const input={synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed};const r=await request('POST','/api/v2/auth/password/reset',input);assert.equal(r.status,204);assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers.vary,'Authorization');
  for(const token of [one,two])await assert.rejects(core.authenticate(token.access_token),rejectCode('UNAUTHENTICATED'));
  assert.equal(await history(chatId),stored);
  await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:secret},context()),rejectCode('UNAUTHENTICATED'));assert.equal((await core.login({synthetic_uid:a.synthetic_uid,password:changed},context())).token_type,'Bearer');await assert.rejects(recovery.confirm(input,context()),rejectCode('INVALID_RESET'));
 });
 await check('five failed attempts commit and exhaust the challenge across service instances',async()=>{
  const a=await active(),code=await resetCode(a),wrong=code==='00000000'?'00000001':'00000000';await rates();
  for(let i=0;i<5;i++)await assert.rejects(recovery.confirm({synthetic_uid:a.synthetic_uid,verification_code:wrong,new_password:changed},context()),rejectCode('INVALID_RESET'));
  const row=(await db.query("SELECT failed_attempts,invalidated_at FROM banuchat_auth.recovery_challenges WHERE principal_id=$1 AND purpose='reset' ORDER BY created_at DESC LIMIT 1",[a.principal_id])).rows[0];assert.equal(row.failed_attempts,5);assert.ok(row.invalidated_at);
  const next=await RecoveryService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),crypto,mail});await assert.rejects(next.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context()),rejectCode('INVALID_RESET'));
 });
 await check('two simultaneous confirmations yield one credential commit, no partial rows',async()=>{
  const a=await active(),code=await resetCode(a);await rates();const results=await Promise.allSettled([recovery.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context()),recovery.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await db.query("SELECT count(*)::int n FROM banuchat_auth.recovery_challenges WHERE principal_id=$1 AND purpose='reset' AND consumed_at IS NOT NULL",[a.principal_id])).rows[0].n,1);
 });
 await check('expired and foreign purpose/account codes reject; unverified/suspended contacts never recover',async()=>{
  const pending=await named();await recovery.registerContact(pending.synthetic_uid,pending.email,randomUUID());await recovery.requestContactVerification(pending.synthetic_uid,context());const proof=mail.take(pending.email,'verify_contact');assert.ok(proof?.code);
  await assert.rejects(recovery.confirm({synthetic_uid:pending.synthetic_uid,verification_code:proof.code,new_password:secret},context()),rejectCode('INVALID_RESET'));await recovery.request({synthetic_uid:pending.synthetic_uid},context());await recovery.drain();assert.equal(mail.take(pending.email,'initial_set'),undefined);
  const a=await active(),code=await resetCode(a);const now=(await db.query('SELECT clock_timestamp() now')).rows[0].now as Date;const advance:AuthClock={now:async()=>new Date(now.getTime()+301000)};
  const timed=await RecoveryService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),crypto,mail,clock:advance});await assert.rejects(timed.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context()),rejectCode('INVALID_RESET'));
  await assert.rejects(recovery.confirm({synthetic_uid:pending.synthetic_uid,verification_code:code,new_password:secret},context()),rejectCode('INVALID_RESET'));await recovery.suspendContact(a.synthetic_uid);await recovery.request({synthetic_uid:a.synthetic_uid},context());await recovery.drain();assert.equal(mail.take(a.email,'reset'),undefined);
 });
 await check('replacement invalidates codes and sessions, returns contact to pending and keeps ownership',async()=>{
  const a=await active(),code=await resetCode(a),token=await core.login({synthetic_uid:a.synthetic_uid,password:secret},context());const chat=await request('POST','/api/v2/conversations',{},token.access_token);assert.equal(chat.status,201);
  const replacement=recipients.at(-1)!;await recovery.registerContact(a.synthetic_uid,replacement,randomUUID(),true);await assert.rejects(core.authenticate(token.access_token),rejectCode('UNAUTHENTICATED'));await assert.rejects(recovery.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context()),rejectCode('INVALID_RESET'));
  assert.equal((await db.query('SELECT principal_id FROM banuchat_auth.conversation_owners WHERE conversation_id=$1',[chat.body.conversation_id])).rows[0].principal_id,a.principal_id);assert.equal((await db.query('SELECT status FROM banuchat_auth.recovery_contacts WHERE principal_id=$1',[a.principal_id])).rows[0].status,'pending_verification');
 });
 await check('generic 202 and persistent UID/origin suppression, no client-supplied recipient',async()=>{
  const a=await verified();await rates();const inputs=[a.synthetic_uid,'BCH-DEMO-9999'];const responses=[];
  for(const synthetic_uid of inputs)responses.push(await request('POST','/api/v2/auth/password/reset-requests',{synthetic_uid}));assert.deepEqual(responses[0]?.body,responses[1]?.body);assert.equal(responses[1]?.status,202);await recovery.drain();mail.take(a.email,'initial_set');
  const source=context();await rates();for(let i=0;i<4;i++){await recovery.request({synthetic_uid:a.synthetic_uid},source);await recovery.drain();if(i===3)assert.equal(mail.take(a.email,'initial_set'),undefined);else assert.ok(mail.take(a.email,'initial_set'));}
  for(let i=0;i<6;i++)await recovery.request({synthetic_uid:'BCH-DEMO-9999'},source);await assert.rejects(recovery.request({synthetic_uid:'BCH-DEMO-9998'},source),rejectCode('RATE_LIMITED'));await recovery.drain();
  assert.equal((await request('POST','/api/v2/auth/password/reset-requests',{synthetic_uid:a.synthetic_uid,email:a.email})).status,400);
 });
 await check('rejected/unknown transport invalidates code; local capture is not external proof',async()=>{
  const a=await verified();for(const state of ['rejected','unknown'] as const){await rates();mail.result=state;try{await recovery.request({synthetic_uid:a.synthetic_uid},context());await recovery.drain();const row=(await db.query("SELECT d.state,c.invalidated_at FROM banuchat_auth.recovery_mail_dispatches d JOIN banuchat_auth.recovery_challenges c ON c.id=d.challenge_id WHERE c.principal_id=$1 ORDER BY c.created_at DESC LIMIT 1",[a.principal_id])).rows[0];assert.equal(row.state,state);assert.ok(row.invalidated_at);}finally{mail.result='accepted';}}
  mail.available=false;try{assert.equal((await request('POST','/api/v2/auth/password/reset-requests',{synthetic_uid:'BCH-DEMO-9999'})).status,503);}finally{mail.available=true;}
  assert.equal((await db.query('SELECT verification_channel FROM banuchat_auth.recovery_contacts WHERE principal_id=$1',[a.principal_id])).rows[0].verification_channel,'local_test');
  let externalCalls=0;const external=await RecoveryService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),crypto,mail:{channel:'external_email',ready:()=>true,permits:()=>true,send:async()=>{externalCalls++;return {state:'rejected'};}}});
  await rates();await external.request({synthetic_uid:a.synthetic_uid},context());await external.drain();assert.equal(externalCalls,0); // Local proof never authorizes an external channel.
 });
 await check('no locks during hashing or mail; rollback if credential write fails',async()=>{
  const a=await active(),code=await resetCode(a);await rates();const hasher=new Argon2idHasher();let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),blocked=new Promise<void>(r=>release=r);
  const paused=await RecoveryService.create({pool:runtime,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,'hex'),crypto,mail,hasher:{hash:async v=>{enter();await blocked;return hasher.hash(v);},verify:(h,v)=>hasher.verify(h,v)}});
  const confirm=paused.confirm({synthetic_uid:a.synthetic_uid,verification_code:code,new_password:changed},context());await entered;
  const probe=await db.connect();try{await probe.query('BEGIN');await probe.query('SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE NOWAIT',[a.principal_id]);await probe.query('ROLLBACK');}finally{probe.release();}
  await db.query('REVOKE UPDATE(password_hash,changed_at) ON banuchat_auth.password_credentials FROM auth_p31_runtime');release();try{await assert.rejects(confirm,rejectCode('INTERNAL_ERROR'));}finally{await db.query('GRANT UPDATE(password_hash,changed_at) ON banuchat_auth.password_credentials TO auth_p31_runtime');}
  assert.equal((await db.query("SELECT consumed_at FROM banuchat_auth.recovery_challenges WHERE principal_id=$1 AND purpose='reset' ORDER BY created_at DESC LIMIT 1",[a.principal_id])).rows[0].consumed_at,null);assert.equal((await core.login({synthetic_uid:a.synthetic_uid,password:secret},context())).token_type,'Bearer');
  let sending!:()=>void,deliver!:()=>void;const begun=new Promise<void>(r=>sending=r),held=new Promise<void>(r=>deliver=r);mail.beforeSend=async()=>{sending();await held;};
  try{await recovery.request({synthetic_uid:a.synthetic_uid},context());await begun;const p=await db.connect();try{await p.query('BEGIN');await p.query('SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE NOWAIT',[a.principal_id]);await p.query('ROLLBACK');}finally{p.release();}}finally{deliver();delete mail.beforeSend;await recovery.drain();}
 });
 await check('PostgreSQL task-container outage returns generic 503, then recovers without POST retries',async()=>{
  const resources=JSON.parse(await readFile(new URL('../../../infra/local/auth-p31/resources.json',import.meta.url),'utf8')) as {name:string;containerId:string};assert.equal(resources.name,env.container);assert.match(resources.containerId,/^[a-f0-9]{64}$/u);
  const docker=promisify(execFile);const label=await docker('docker',['inspect','--format','{{index .Config.Labels "banuchat.task"}}',resources.containerId]);assert.equal(label.stdout.trim(),'BCH04-AUTH-P3.1');
  await docker('docker',['stop','--time','3',resources.containerId]);try{
   const stopped=await request('POST','/api/v2/auth/password/reset-requests',{synthetic_uid:'BCH-DEMO-9999'});assert.equal(stopped.status,503);assert.ok(!JSON.stringify(stopped.body).includes('SQL'));
   assert.equal((await request('POST','/api/v2/auth/password/reset',{synthetic_uid:'BCH-DEMO-9999',verification_code:'00000000',new_password:secret})).status,503);
  }finally{await docker('docker',['start',resources.containerId]);}
  const probe=new Pool({host:env.host,port:env.port,database:env.database,user:env.runtimeUser,password:env.runtimePassword,connectionTimeoutMillis:500});let ready=false;
  try{for(let i=0;i<20&&!ready;i++){try{await probe.query('SELECT 1');ready=true;}catch{await new Promise(r=>setTimeout(r,100));}}assert.equal(ready,true);}finally{await probe.end();}
 });
 await check('new schemas refuse old token, number and unknown selectors; v1/admin remain absent',async()=>{
  for(const data of [{token:'A'.repeat(43),new_password:secret},{synthetic_uid:'BCH-DEMO-9999',verification_code:12345678,new_password:secret},{synthetic_uid:'BCH-DEMO-9999',verification_code:'00000000',new_password:secret,email:'hidden@academic.example'}])assert.equal((await request('POST','/api/v2/auth/password/reset',data)).status,400);
  assert.equal((await request('GET','/api/v1/conversations')).status,404);assert.equal((await request('POST','/api/v2/auth/contacts',{})).status,404);
 });
 await check('thirteen previous operations remain functional with protected shared profile',async()=>{
  const a=await active(),pair=await request('POST','/api/v2/auth/login',{synthetic_uid:a.synthetic_uid,password:secret});schema('token_response',pair.body);const token=String(pair.body.access_token);
  const me=await request('GET','/api/v2/auth/me',undefined,token);schema('current_session',me.body);
  const created=await request('POST','/api/v2/conversations',{},token);assert.equal(created.status,201);const id=String(created.body.conversation_id);
  const other=await active(),otherToken=await core.login({synthetic_uid:other.synthetic_uid,password:secret},context());
  for(const method of ['GET','DELETE'])assert.equal((await request(method,'/api/v2/conversations/'+id,undefined,otherToken.access_token)).status,404);
  assert.equal((await request('POST','/api/v2/conversations/'+id+'/messages',{content:'hola'},otherToken.access_token)).status,404);
  const refresh=await core.login({synthetic_uid:other.synthetic_uid,password:secret},context());const rotated=await core.refresh({refresh_token:refresh.refresh_token},context());await assert.rejects(core.refresh({refresh_token:refresh.refresh_token},context()),rejectCode('UNAUTHENTICATED'));await assert.rejects(core.authenticate(rotated.access_token),rejectCode('UNAUTHENTICATED'));
  assert.equal((await request('POST',`/api/v2/conversations/${id}/messages`,{content:'hola'},token)).status,201);
  for(const [path,name] of [['/api/v2/conversations','conversations_response'],['/api/v2/conversations/'+id,'conversation_detail'],['/api/v2/me/progress','progress_response'],['/api/v2/calendar/events?date_from=2026-10-22&date_to=2026-10-22','calendar_response'],['/api/v2/announcements','announcements_response']] as const){const response=await request('GET',path,undefined,token);assert.equal(response.status,200);schema(name,response.body);}
  assert.equal((await request('GET',`/api/v2/documents/${fixture.second.document}/artifact`,undefined,token)).status,200);assert.equal((await request('DELETE','/api/v2/conversations/'+id,undefined,token)).status,204);
  const refreshed=await request('POST','/api/v2/auth/refresh',{refresh_token:pair.body.refresh_token});assert.equal(refreshed.status,200);schema('token_response',refreshed.body);assert.equal((await request('POST','/api/v2/auth/logout',undefined,String(refreshed.body.access_token))).status,204);
 });
 await check('corpus/releases/embeddings unchanged; association invariants and private verifiers preserved',async()=>{
  assert.equal(await fingerprint(db),before);const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='banuchat_auth' AND table_name='recovery_challenges'")).rows.map(r=>r.column_name);assert.ok(!columns.includes('code'));assert.ok(!columns.includes('verification_code'));
  assert.equal((await db.query("SELECT count(*)::int n FROM banuchat_auth.accounts WHERE synthetic_uid<>'BCH-DEMO-0001' AND synthetic_display_name IS NULL")).rows[0].n,0);
 });
 await writeFile(new URL('../../../infra/local/auth-p31/results.json',import.meta.url),JSON.stringify({result:failed?'FAIL':'PASS',checks:evidence,localDeliveryOnly:true,externalSent:false,externalReceived:false,corpusBefore:before,corpusAfter:await fingerprint(db),contractVersion:'3.0.0'},null,2)+'\n');
 }finally{await recovery.drain();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await runtime.end();await provision.end();await db.end();}
});
