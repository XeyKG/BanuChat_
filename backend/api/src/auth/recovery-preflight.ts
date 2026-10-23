import {exactObject} from './primitives.js';
import {recoveryEmail} from './recovery-crypto.js';

/** No I/O, secret loading, DB connections or send capability. Metadata is not provider proof. */
export function assessRecoveryConfiguration(input:unknown):{
 status:'BLOCKED'|'PRIVATE_REVIEW_REQUIRED';blockers:string[];external_test:'NOT_STARTED';
} {
 try {
  const c=exactObject(input,['version','external_send_enabled','provider','approval_reference','sender','recipient','private_material','database','delivery_limits']);
  const sender=exactObject(c.sender,['address','domain_verified','evidence_reference']);
  const recipient=exactObject(c.recipient,['address','consent_reference','holder_available']);
  const material=exactObject(c.private_material,['encrypted_file','protection','keyset_reference','restore_tested']);
  const db=exactObject(c.database,['name','deployment_id','target_authorized']);
  const limits=exactObject(c.delivery_limits,['max_messages_per_run','min_interval_ms','timeout_ms','provider_quotas_confirmed']);
  if(c.version!==1)throw new Error();
  const blockers:string[]=[];
  const require=(valid:boolean,code:string)=>{if(!valid)blockers.push(code);};
  const reference=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(v);
  const address=(v:unknown)=>{try{return recoveryEmail(v).length>0;}catch{return false;}};
  require(c.external_send_enabled===true,'EXTERNAL_SEND_DISABLED');
  require(c.provider==='resend'&&reference(c.approval_reference),'APPROVED_PROVIDER_MISSING');
  require(address(sender.address)&&sender.domain_verified===true&&reference(sender.evidence_reference),'VERIFIED_SENDER_MISSING');
  require(address(recipient.address)&&reference(recipient.consent_reference),'AUTHORIZED_RECIPIENT_MISSING');
  require(recipient.holder_available===true,'HOLDER_PRIVATE_INPUT_UNAVAILABLE');
  require(typeof material.encrypted_file==='string'&&material.encrypted_file.length>0&&material.protection==='windows_dpapi_current_user','PRIVATE_MATERIAL_UNAVAILABLE');
  require(reference(material.keyset_reference)&&material.restore_tested===true,'OPERATIONAL_KEY_RESTORE_UNPROVEN');
  require(typeof db.name==='string'&&/^[a-z0-9_]+$/u.test(db.name)&&! /ccd/iu.test(db.name)&&reference(db.deployment_id)&&db.target_authorized===true,'AUTHORIZED_DATABASE_SCOPE_MISSING');
  require(Number.isInteger(limits.max_messages_per_run)&&Number(limits.max_messages_per_run)>=1&&Number(limits.max_messages_per_run)<=6&&
   Number.isInteger(limits.min_interval_ms)&&Number(limits.min_interval_ms)>=1000&&Number.isInteger(limits.timeout_ms)&&
   Number(limits.timeout_ms)>=1000&&Number(limits.timeout_ms)<=10000&&limits.provider_quotas_confirmed===true,'SEND_BUDGET_UNCONFIRMED');
  return {status:blockers.length?'BLOCKED':'PRIVATE_REVIEW_REQUIRED',blockers,external_test:'NOT_STARTED'};
 }catch{return {status:'BLOCKED',blockers:['PRIVATE_CONFIGURATION_INVALID'],external_test:'NOT_STARTED'};}
}
