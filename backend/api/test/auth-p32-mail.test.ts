import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rmdir,unlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {assessRecoveryConfiguration} from '../src/auth/recovery-preflight.js';
import {ResendHttpsMailDelivery} from '../src/auth/mail-delivery.js';
import {RecoveryCrypto,type ChallengeIdentity} from '../src/auth/recovery-crypto.js';

const template=JSON.parse(await readFile(new URL('../../../infra/auth-p32-config.example.json',import.meta.url),'utf8'));
const reference='11111111-1111-4111-8111-111111111111';
const message={recipient:'demo@academic.example',code:'00001234',purpose:'reset' as const,expiresAt:'2026-10-23T15:05:00Z',reference};

test('AUTH-P3.2 disabled template reports all external prerequisites without sending or inspecting secrets',()=>{
 const result=assessRecoveryConfiguration(template);
 assert.equal(result.status,'BLOCKED');assert.equal(result.external_test,'NOT_STARTED');
 assert.deepEqual(result.blockers,['EXTERNAL_SEND_DISABLED','APPROVED_PROVIDER_MISSING','VERIFIED_SENDER_MISSING','AUTHORIZED_RECIPIENT_MISSING',
  'HOLDER_PRIVATE_INPUT_UNAVAILABLE','PRIVATE_MATERIAL_UNAVAILABLE','OPERATIONAL_KEY_RESTORE_UNPROVEN','AUTHORIZED_DATABASE_SCOPE_MISSING','SEND_BUDGET_UNCONFIRMED']);
});

test('AUTH-P3.2 malformed private metadata returns only fixed codes, never input/errors',()=>{
 for(const input of [null,{private_value:'fixture-sensitive-value'}, {...template,sender:{...template.sender,unexpected:'fixture-sensitive-value'}}]){
  assert.deepEqual(assessRecoveryConfiguration(input),{status:'BLOCKED',blockers:['PRIVATE_CONFIGURATION_INVALID'],external_test:'NOT_STARTED'});
 }
});

test('AUTH-P3.2 filled metadata still requires private operational review, not proof of verified domain or delivery',()=>{
 const c=structuredClone(template);Object.assign(c,{external_send_enabled:true,provider:'resend',approval_reference:reference});
 Object.assign(c.sender,{address:'sender@project.example',domain_verified:true,evidence_reference:reference});
 Object.assign(c.recipient,{address:message.recipient,consent_reference:reference,holder_available:true});
 Object.assign(c.private_material,{encrypted_file:'fixture-encrypted-store',protection:'windows_dpapi_current_user',keyset_reference:reference,restore_tested:true});
 Object.assign(c.database,{name:'auth_p32_fixture',deployment_id:reference,target_authorized:true});c.delivery_limits.provider_quotas_confirmed=true;
 assert.deepEqual(assessRecoveryConfiguration(c),{status:'PRIVATE_REVIEW_REQUIRED',blockers:[],external_test:'NOT_STARTED'});
 c.database.name='banuchat_ccd_dev';assert.ok(assessRecoveryConfiguration(c).blockers.includes('AUTHORIZED_DATABASE_SCOPE_MISSING'));
 c.delivery_limits.max_messages_per_run=100;assert.ok(assessRecoveryConfiguration(c).blockers.includes('SEND_BUDGET_UNCONFIRMED'));
});

test('AUTH-P3.2 existing candidate classifies provider errors/uncertainty, with one attempt and no private error details',async()=>{
 for(const status of [200,401,403,429,500,503]){
  let calls=0;const mail=new ResendHttpsMailDelivery({approved:true,apiKey:'fixture-not-a-key',sender:'sender@project.example',recipients:[message.recipient],
   sendHttp:async()=>{calls++;return {ok:status===200,status,json:async()=>({id:'fixture-reference'})};}});
  assert.deepEqual(await mail.send(message),status===200?{state:'accepted',reference:'fixture-reference'}:{state:status>=500?'unknown':'rejected'});assert.equal(calls,1);
 }
 for(const broken of ['response','network']){
  let calls=0;const mail=new ResendHttpsMailDelivery({approved:true,apiKey:'fixture-not-a-key',sender:'sender@project.example',recipients:[message.recipient],
   sendHttp:async()=>{calls++;if(broken==='network')throw new Error('fixture-sensitive-value');return {ok:true,status:200,json:async()=>{throw new Error('fixture-sensitive-value');}};}});
  assert.deepEqual(await mail.send(message),{state:'unknown'});assert.equal(calls,1);
 }
});

test('AUTH-P3.2 candidate retains exact single-recipient boundary and no arbitrary redirects or academic fields',async()=>{
 let calls=0;const mail=new ResendHttpsMailDelivery({approved:true,apiKey:'fixture-not-a-key',sender:'sender@project.example',recipients:[message.recipient],
  sendHttp:async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');
   assert.equal(options.headers['Idempotency-Key'],reference);const payload=JSON.parse(options.body);assert.deepEqual(payload.to,[message.recipient]);
   assert.deepEqual(Object.keys(payload).sort(),['from','subject','text','to']);return {ok:true,status:200,json:async()=>({id:'fixture-reference'})};}});
 assert.deepEqual(await mail.send({...message,recipient:'other@academic.example'}),{state:'rejected'});assert.equal(calls,0);
 assert.equal((await mail.send(message)).state,'accepted');assert.equal(calls,1);
});

test('AUTH-P3.2 real candidate deadline aborts an injected stalled operation, unknown once without retry',async()=>{
 let calls=0,aborted=false;const mail=new ResendHttpsMailDelivery({approved:true,apiKey:'fixture-not-a-key',sender:'sender@project.example',recipients:[message.recipient],
  sendHttp:async(_url,options)=>{calls++;return new Promise((_resolve,reject)=>{
   const guard=setTimeout(()=>reject(new Error('Deadline did not fire')),12000);
   options.signal.addEventListener('abort',()=>{aborted=true;clearTimeout(guard);reject(options.signal.reason);},{once:true});
  });}});
 const start=performance.now();assert.deepEqual(await mail.send(message),{state:'unknown'});assert.equal(calls,1);assert.equal(aborted,true);assert.ok(performance.now()-start>=9000);
});

test('AUTH-P3.2 two fresh processes restore the same persisted fixture keys and decrypt/verify without printing material',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'banuchat-p32-fixture-')),path=join(directory,'fixture.json');
 const keys={mac:randomBytes(32),encryption:randomBytes(32),lookup:randomBytes(32)},crypto=new RecoveryCrypto(keys);
 const identity:ChallengeIdentity={id:randomUUID(),principal_id:randomUUID(),contact_id:randomUUID(),contact_revision:'1',auth_version:'1',deployment_id:randomUUID(),purpose:'reset',delivery_channel:'external_email'};
 const encrypted=crypto.encrypt(message.recipient,identity.principal_id,identity.contact_id,'1');
 const fixture={keys:Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,v.toString('hex')])),identity,mac:crypto.mac(identity,message.code),
  encrypted:{...encrypted,email_ciphertext:encrypted.email_ciphertext.toString('hex'),nonce:encrypted.nonce.toString('hex'),tag:encrypted.tag.toString('hex')}};
 const script=`import {readFile} from 'node:fs/promises';const {RecoveryCrypto}=await import(process.env.BANUCHAT_P32_CRYPTO_MODULE);const f=JSON.parse(await readFile(process.env.BANUCHAT_P32_TEST_KEY_FILE,'utf8'));const c=new RecoveryCrypto(Object.fromEntries(Object.entries(f.keys).map(([k,v])=>[k,Buffer.from(v,'hex')])));const e={...f.encrypted,...Object.fromEntries(['email_ciphertext','nonce','tag'].map(k=>[k,Buffer.from(f.encrypted[k],'hex')]))};const restored=c.matches({...f.identity,code_mac:f.mac,mac_key_id:'v1'},'00001234')&&c.decrypt({...e,principal_id:f.identity.principal_id,id:f.identity.contact_id,revision:'1'})==='demo@academic.example';if(!restored)process.exitCode=1;console.log(JSON.stringify({restored}));`;
 try{
  await writeFile(path,JSON.stringify(fixture),{mode:0o600,flag:'wx'});
  const before=await readFile(path);const run=promisify(execFile);
  for(let i=0;i<2;i++){
   const result=await run(process.execPath,['--import','tsx','--input-type=module','-e',script],{env:{...process.env,BANUCHAT_P32_CRYPTO_MODULE:new URL('../src/auth/recovery-crypto.ts',import.meta.url).href,BANUCHAT_P32_TEST_KEY_FILE:path}});
   assert.deepEqual(JSON.parse(result.stdout),{restored:true});assert.equal(result.stderr,'');
  }
  assert.deepEqual(await readFile(path),before);
 }finally{await unlink(path).catch(()=>{});await rmdir(directory);}
});
