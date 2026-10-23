import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import test from 'node:test';
import {RecoveryCrypto,recoveryEmail,syntheticName,verificationCode,type ChallengeIdentity} from '../src/auth/recovery-crypto.js';
import {LocalCaptureMailDelivery,ResendHttpsMailDelivery} from '../src/auth/mail-delivery.js';
const crypto=()=>new RecoveryCrypto({mac:randomBytes(32),encryption:randomBytes(32),lookup:randomBytes(32)});
test('recovery code is eight canonical ASCII digits including leading zero; independent context-bound HMAC',()=>{
 const c=crypto(),identity:ChallengeIdentity={id:randomUUID(),principal_id:randomUUID(),contact_id:randomUUID(),contact_revision:'1',auth_version:'2',deployment_id:randomUUID(),purpose:'reset',delivery_channel:'local_test'};
 for(let i=0;i<100;i++)assert.match(c.code(),/^[0-9]{8}$/u);
 assert.equal(verificationCode('00001234'),'00001234');for(const bad of [12345678,' 12345678','１２３４５６７８','1234567','123456789',null])assert.throws(()=>verificationCode(bad));
 const row={...identity,code_mac:c.mac(identity,'00001234'),mac_key_id:c.keyId};assert.equal(c.matches(row,'00001234'),true);assert.equal(c.matches(row,'00001235'),false);
 for(const field of Object.keys(identity))assert.equal(c.matches({...row,[field]:String(row[field as keyof typeof row])+'other'},'00001234'),false);
 const same=randomBytes(32);assert.throws(()=>new RecoveryCrypto({mac:same,encryption:same,lookup:randomBytes(32)}));
});
test('private contact encryption authenticates principal/revision and allows academic-shaped domains without identity inference',()=>{
 const c=crypto(),principal=randomUUID(),id=randomUUID(),email='demo@academic.example';const encrypted=c.encrypt(email,principal,id,'1');const second=c.encrypt(email,principal,id,'1');
 assert.notDeepEqual(encrypted.email_ciphertext,second.email_ciphertext);assert.equal(c.decrypt({...encrypted,principal_id:principal,id,revision:'1'}),email);
 assert.throws(()=>c.decrypt({...encrypted,principal_id:principal,id,revision:'2'}));assert.equal(recoveryEmail('Demo@ACADEMIC.EXAMPLE'),'Demo@academic.example');
 assert.equal(syntheticName('Cuenta ficticia A'),'Cuenta ficticia A');for(const v of ['','\n','a'.repeat(81)])assert.throws(()=>syntheticName(v));
});
test('local capture is explicitly local and refuses nonreserved recipients; candidate HTTPS never sends without approval',async()=>{
 const local=new LocalCaptureMailDelivery(['demo@academic.example']);assert.equal(local.channel,'local_test');assert.throws(()=>new LocalCaptureMailDelivery(['demo@example.com']));
 assert.equal((await local.send({recipient:'other@academic.example',code:'00001234',purpose:'reset',reference:randomUUID()})).state,'rejected');
 let calls=0;const candidate=new ResendHttpsMailDelivery({approved:false,apiKey:'',sender:'',recipients:['demo@academic.example'],sendHttp:async()=>{calls++;throw new Error('must not send');}});
 assert.equal(candidate.channel,'external_email');assert.equal((await candidate.send({recipient:'demo@academic.example',purpose:'reset',reference:randomUUID()})).state,'rejected');assert.equal(calls,0);
 const transport=new ResendHttpsMailDelivery({approved:true,apiKey:'fixture-not-a-key',sender:'sender@project.example',recipients:['demo@academic.example'],sendHttp:async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');return {ok:true,status:200,json:async()=>({id:'fixture-reference'})};}});
 assert.equal((await transport.send({recipient:'demo@academic.example',code:'00001234',purpose:'reset',reference:randomUUID()})).state,'accepted');assert.equal(calls,1);
});
