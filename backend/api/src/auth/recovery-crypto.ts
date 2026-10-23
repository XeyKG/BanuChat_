import {createCipheriv,createDecipheriv,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {AuthError} from './primitives.js';
export interface ChallengeIdentity {id:string;principal_id:string;contact_id:string;contact_revision:string;deployment_id:string;auth_version:string;purpose:string;delivery_channel:string;}
export function verificationCode(v:unknown):string{if(typeof v!=='string'||v.length!==8||!/^[0-9]{8}$/u.test(v))throw new AuthError('INVALID_ARGUMENT');return v;}
export function syntheticName(v:unknown):string{if(typeof v!=='string'||[...v].length<1||[...v].length>80||! /\S/u.test(v)||/[\uD800-\uDFFF\u0000-\u001f\u007f-\u009f]/u.test(v))throw new AuthError('INVALID_ARGUMENT');return v;}
export function recoveryEmail(v:unknown):string{
 if(typeof v!=='string'||v.length>254||! /^[A-Za-z0-9](?:[A-Za-z0-9._+\-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,187}[A-Za-z0-9])?\.[A-Za-z]{2,63}$/u.test(v)||v.includes('..'))throw new AuthError('INVALID_ARGUMENT');
 const at=v.indexOf('@');return v.slice(0,at)+'@'+v.slice(at+1).toLowerCase(); // Preserve local part; no Gmail/provider inference.
}
export class RecoveryCrypto {
 readonly keyId='v1';
 private readonly macKey:Buffer;private readonly encryptionKey:Buffer;private readonly lookupKey:Buffer;
 constructor(keys:{mac:Buffer;encryption:Buffer;lookup:Buffer}){
  if(Object.values(keys).some(k=>k.length!==32)||keys.mac.equals(keys.encryption)||keys.mac.equals(keys.lookup)||keys.lookup.equals(keys.encryption))throw new AuthError('DEPENDENCY_UNAVAILABLE');
  this.macKey=Buffer.from(keys.mac);this.encryptionKey=Buffer.from(keys.encryption);this.lookupKey=Buffer.from(keys.lookup);
 }
 code(){return randomInt(0,100000000).toString().padStart(8,'0');}
 assertIndependent(rateKey:Buffer){if([this.macKey,this.encryptionKey,this.lookupKey].some(k=>k.equals(rateKey)))throw new AuthError('DEPENDENCY_UNAVAILABLE');}
 mac(c:ChallengeIdentity,code:string){return createHmac('sha256',this.macKey).update(JSON.stringify(['banuchat-recovery-v1',c.deployment_id,c.principal_id,c.id,c.purpose,c.contact_id,c.contact_revision,c.auth_version,c.delivery_channel,code])).digest('hex');}
 matches(c:ChallengeIdentity&{code_mac:string;mac_key_id:string},code:string){
  const actual=Buffer.from(this.mac(c,code),'hex');const stored=/^[a-f0-9]{64}$/u.test(c.code_mac)?Buffer.from(c.code_mac,'hex'):Buffer.alloc(32);
  return timingSafeEqual(actual,stored)&&c.mac_key_id===this.keyId;
 }
 lookup(email:string){return createHmac('sha256',this.lookupKey).update('banuchat-email-v1\0'+email).digest('hex');}
 encrypt(email:string,principal:string,id:string,revision:string){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.encryptionKey,nonce);
  cipher.setAAD(Buffer.from(JSON.stringify([principal,id,revision])));const email_ciphertext=Buffer.concat([cipher.update(email,'utf8'),cipher.final()]);
  return {email_ciphertext,nonce,tag:cipher.getAuthTag(),encryption_key_id:this.keyId,email_lookup_hmac:this.lookup(email),lookup_key_id:this.keyId};
 }
 decrypt(c:{email_ciphertext:Buffer;nonce:Buffer;tag:Buffer;encryption_key_id:string;principal_id:string;id:string;revision:string}){
  try{if(c.encryption_key_id!==this.keyId)throw new Error();const d=createDecipheriv('aes-256-gcm',this.encryptionKey,c.nonce);d.setAAD(Buffer.from(JSON.stringify([c.principal_id,c.id,c.revision])));d.setAuthTag(c.tag);return recoveryEmail(Buffer.concat([d.update(c.email_ciphertext),d.final()]).toString('utf8'));}catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
 }
}
