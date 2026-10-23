import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {SqlQueryClient} from '../data/sql-client.js';
import {PgTransactionRunner} from '../data/transaction.js';
import {PgAuthStore} from './pg-auth-store.js';
import {AuthError,Argon2idHasher,exactObject,newPassword,postgresClock,safeError,uid,type AuthClock,type PasswordHasher} from './primitives.js';
import {RecoveryCrypto,recoveryEmail,syntheticName,type ChallengeIdentity,verificationCode} from './recovery-crypto.js';
import type {MailDelivery,MailResult} from './mail-delivery.js';
import {RecoveryLimiter} from './recovery-limiter.js';
import type {AuthRequestContext} from './rate-limiter.js';
interface Account {id:string;synthetic_uid:string;synthetic_display_name:string|null;status:string;auth_version:string;}
interface Contact {id:string;principal_id:string;revision:string;status:string;verified_at:Date|null;verification_channel:string|null;email_ciphertext:Buffer;nonce:Buffer;tag:Buffer;encryption_key_id:string;}
interface Challenge extends ChallengeIdentity {code_mac:string;mac_key_id:string;created_at:Date;expires_at:Date;failed_attempts:number;consumed_at:Date|null;invalidated_at:Date|null;}
export const RESET_ACCEPTED={message:'Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado.'} as const;
/** Application core. No recipients/secrets are returned by public request/confirm methods. */
export class RecoveryService {
 private readonly tx:PgTransactionRunner;private readonly limiter:RecoveryLimiter;private readonly audit:PgAuthStore;
 private readonly clock:AuthClock;private readonly hasher:PasswordHasher;private readonly deployment:string;
 private readonly jobs:Array<()=>Promise<void>>=[];private active=false;private idle:Array<()=>void>=[];
 private constructor(private readonly input:{pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;crypto:RecoveryCrypto;mail:MailDelivery;clock?:AuthClock;hasher?:PasswordHasher}){
  this.tx=new PgTransactionRunner(input.pool);this.audit=new PgAuthStore(input.pool);this.clock=input.clock??postgresClock;this.hasher=input.hasher??new Argon2idHasher();this.deployment=input.deploymentId.toLowerCase();this.limiter=new RecoveryLimiter(input.pool,input.rateKey,this.clock);
 }
 static async create(input:ConstructorParametersInternal):Promise<RecoveryService>{
  input.crypto.assertIndependent(input.rateKey);
  try{await new PgAuthStore(input.pool).assertRuntime(input.expectedDatabase);const scope=(await input.pool.query('SELECT deployment_id,database_name FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0] as {deployment_id:string;database_name:string}|undefined;
   if(scope?.deployment_id!==input.deploymentId.toLowerCase()||scope.database_name!==input.expectedDatabase)throw new AuthError('DEPENDENCY_UNAVAILABLE');
   await input.pool.query('SELECT synthetic_display_name FROM banuchat_auth.accounts LIMIT 0');await input.pool.query('SELECT id FROM banuchat_auth.recovery_contacts LIMIT 0');
   return new RecoveryService(input);
  }catch(error){throw safeError(error);}
 }
 private account(c:SqlQueryClient,selectedUid:string){return c.query<Account>(`SELECT id,synthetic_uid,synthetic_display_name,status,auth_version::text FROM banuchat_auth.accounts WHERE synthetic_uid=$1 FOR UPDATE`,[selectedUid]).then(r=>r.rows[0]);}
 private contact(c:SqlQueryClient,id:string){return c.query<Contact>(`SELECT id,principal_id,revision::text,status,verified_at,verification_channel,email_ciphertext,nonce,tag,encryption_key_id FROM banuchat_auth.recovery_contacts WHERE principal_id=$1`,[id]).then(r=>r.rows[0]);}
 private async invalidate(c:SqlQueryClient,principal:string,now:Date,reason:string,except?:string){await c.query(`UPDATE banuchat_auth.recovery_challenges SET invalidated_at=$2,invalidation_reason=$3 WHERE principal_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL AND ($4::uuid IS NULL OR id<>$4)`,[principal,now,reason,except??null]);}
 private async revoke(c:SqlQueryClient,principal:string,now:Date){await c.query('SELECT id FROM banuchat_auth.sessions WHERE principal_id=$1 ORDER BY id FOR UPDATE',[principal]);await c.query('UPDATE banuchat_auth.sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE principal_id=$1',[principal,now]);}
 private ready(){if(!this.input.mail.ready()||this.jobs.length+(this.active?1:0)>=128)throw new AuthError('DEPENDENCY_UNAVAILABLE');}
 private enqueue(job:()=>Promise<void>){this.ready();this.jobs.push(job);if(!this.active){this.active=true;queueMicrotask(()=>void this.work());}}
 private async work(){try{while(this.jobs.length){const job=this.jobs.shift()!;try{await job();}catch{/* Per-account/dependency error after 202 never leaks into response/logs. */}}}finally{this.active=false;for(const resolve of this.idle.splice(0))resolve();}}
 /** Test/shutdown drain. No persistent retries, secrets or result DTO. */
 async drain(){if(this.active||this.jobs.length)await new Promise<void>(resolve=>this.idle.push(resolve));}
 async request(input:unknown,context:AuthRequestContext):Promise<void>{try{const body=exactObject(input,['synthetic_uid']),selectedUid=uid(body.synthetic_uid);this.ready();const allowed=await this.limiter.reserve(selectedUid,context,false);this.enqueue(async()=>{if(allowed)await this.issue(selectedUid,false,context);});}catch(error){throw safeError(error);}}
 private async issue(selectedUid:string,verifyContact:boolean,context:AuthRequestContext):Promise<void>{
  const created=await this.tx.run(async c=>{
   const account=await this.account(c,selectedUid);if(!account||account.status==='disabled')return undefined;
   const contact=await this.contact(c,account.id);if(!contact||(verifyContact?contact.status!=='pending_verification':contact.status!=='verified'||contact.verification_channel!==this.input.mail.channel))return undefined;
   const recipient=this.input.crypto.decrypt(contact);if(!this.input.mail.permits(recipient))return undefined;
   const now=await this.clock.now(c),purpose=verifyContact?'verify_contact':account.status==='pending_password'?'initial_set':'reset';
   await c.query(`UPDATE banuchat_auth.recovery_challenges SET invalidated_at=$2,invalidation_reason='reissued' WHERE principal_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL AND (purpose='verify_contact')=$3`,[account.id,now,verifyContact]);
   const challenge:ChallengeIdentity={id:randomUUID(),principal_id:account.id,contact_id:contact.id,contact_revision:contact.revision,deployment_id:this.deployment,auth_version:account.auth_version,purpose,delivery_channel:this.input.mail.channel};
   const recent=(await c.query<Challenge>(`SELECT *,contact_revision::text,auth_version::text FROM banuchat_auth.recovery_challenges WHERE principal_id=$1 AND created_at>=$2 ORDER BY created_at DESC LIMIT 100`,[account.id,new Date(now.getTime()-86400000)])).rows;
   let code='';for(let i=0;i<5;i++){const candidate=this.input.crypto.code();if(!recent.some(old=>this.input.crypto.matches(old,candidate))){code=candidate;break;}}
   if(!code)throw new AuthError('DEPENDENCY_UNAVAILABLE');const expires=new Date(now.getTime()+300000);
   await c.query(`INSERT INTO banuchat_auth.recovery_challenges(id,principal_id,contact_id,contact_revision,deployment_id,auth_version,purpose,code_mac,mac_key_id,created_at,expires_at,delivery_channel) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[challenge.id,account.id,contact.id,contact.revision,this.deployment,account.auth_version,purpose,this.input.crypto.mac(challenge,code),this.input.crypto.keyId,now,expires,this.input.mail.channel]);
   await c.query(`INSERT INTO banuchat_auth.recovery_mail_dispatches(challenge_id,contact_id,contact_revision,purpose,state,created_at) VALUES($1,$2,$3,$4,'created',$5)`,[challenge.id,contact.id,contact.revision,purpose,now]);
   await this.audit.audit(c,'reset_requested','success',context.requestId,account.id);return {account,contact,challenge,code,expires,recipient};
  });if(!created)return;
  let result:MailResult;try{result=await this.input.mail.send({recipient:created.recipient,code:created.code,purpose:created.challenge.purpose as 'verify_contact'|'initial_set'|'reset',expiresAt:created.expires.toISOString(),reference:created.challenge.id});}catch{result={state:'unknown'};}
  await this.tx.run(async c=>{
   await this.account(c,selectedUid);const now=await this.clock.now(c);
   await c.query('UPDATE banuchat_auth.recovery_mail_dispatches SET state=$2,provider_reference=$3,finished_at=$4 WHERE challenge_id=$1',[created.challenge.id,result.state,result.state==='accepted'?result.reference:null,now]);
   if(result.state!=='accepted'){await c.query(`UPDATE banuchat_auth.recovery_challenges SET invalidated_at=$2,invalidation_reason='delivery_failed' WHERE id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL`,[created.challenge.id,now]);await this.audit.audit(c,'reset_delivery_failed','denied',context.requestId,created.account.id);}
  });
 }
 async confirm(input:unknown,context:AuthRequestContext):Promise<void>{
  try{const body=exactObject(input,['synthetic_uid','verification_code','new_password']),selectedUid=uid(body.synthetic_uid),code=verificationCode(body.verification_code),secret=newPassword(body.new_password);
   if(!await this.limiter.reserve(selectedUid,context,true))throw new AuthError('INVALID_RESET');
   const hash=await this.hasher.hash(secret); // Uniform hash work, outside all locks, including invalid/absent code.
   const result=await this.consume(selectedUid,code,false,context,hash);if(!result)throw new AuthError('INVALID_RESET');
   try{await this.input.mail.send({recipient:result.recipient,purpose:'change_notice',reference:randomUUID()});}catch{/* A notice cannot roll back a committed credential. */}
  }catch(error){throw safeError(error);}
 }
 private async consume(selectedUid:string,code:string,verifyContact:boolean,context:AuthRequestContext,hash?:string):Promise<{recipient:string}|undefined>{
  return this.tx.run(async c=>{
   const account=await this.account(c,selectedUid);const now=await this.clock.now(c);
   if(!account||account.status==='disabled'){this.dummyCompare(code);return undefined;}
   const contact=await this.contact(c,account.id);const challenge=(await c.query<Challenge>(`SELECT *,contact_revision::text,auth_version::text FROM banuchat_auth.recovery_challenges WHERE principal_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL AND (purpose='verify_contact')=$2`,[account.id,verifyContact])).rows[0];
   if(!contact||!challenge){this.dummyCompare(code);return undefined;}
   const expectedPurpose=verifyContact?'verify_contact':account.status==='pending_password'?'initial_set':'reset';
   const validState=challenge.purpose===expectedPurpose&&challenge.contact_id===contact.id&&challenge.contact_revision===contact.revision&&challenge.auth_version===account.auth_version&&challenge.deployment_id===this.deployment&&challenge.delivery_channel===this.input.mail.channel&&
    now>=challenge.created_at&&now<challenge.expires_at&&challenge.failed_attempts<5&&(verifyContact?contact.status==='pending_verification':contact.status==='verified'&&contact.verified_at!==null&&contact.verification_channel===this.input.mail.channel);
   const matches=this.input.crypto.matches(challenge,code);
   if(!validState||!matches){
    await c.query('SELECT id FROM banuchat_auth.recovery_challenges WHERE id=$1 FOR UPDATE',[challenge.id]);
    if(validState)await c.query(`UPDATE banuchat_auth.recovery_challenges SET failed_attempts=failed_attempts+1,invalidated_at=CASE WHEN failed_attempts=4 THEN $2::timestamptz ELSE NULL END,invalidation_reason=CASE WHEN failed_attempts=4 THEN 'attempts' ELSE NULL END WHERE id=$1`,[challenge.id,now]);
    return undefined; // Commit incorrect-attempt counters before public INVALID_RESET.
   }
   if(!verifyContact)await this.revoke(c,account.id,now); // Account -> ordered sessions -> challenge.
   await c.query('SELECT id FROM banuchat_auth.recovery_challenges WHERE id=$1 FOR UPDATE',[challenge.id]);
   await c.query('UPDATE banuchat_auth.recovery_challenges SET consumed_at=$2 WHERE id=$1',[challenge.id,now]);
   if(verifyContact){await c.query(`UPDATE banuchat_auth.recovery_contacts SET status='verified',verified_at=$2,verification_reference=$3,verification_channel=$4,updated_at=$2 WHERE id=$1`,[contact.id,now,challenge.id,this.input.mail.channel]);}
   else{
    if(!hash)throw new AuthError('INTERNAL_ERROR');
    await c.query(`INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash,changed_at) VALUES($1,$2,$3) ON CONFLICT(principal_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,changed_at=EXCLUDED.changed_at`,[account.id,hash,now]);
    await c.query(`UPDATE banuchat_auth.accounts SET status='active',auth_version=auth_version+1,updated_at=$2 WHERE id=$1`,[account.id,now]);
    await this.invalidate(c,account.id,now,'sibling_consumed',challenge.id);
    await this.audit.audit(c,expectedPurpose==='initial_set'?'password_set':'password_reset','success',context.requestId,account.id);
   }
   return {recipient:this.input.crypto.decrypt(contact)};
  });
 }
 private dummyCompare(code:string){this.input.crypto.matches({id:'0',principal_id:'0',contact_id:'0',contact_revision:'1',deployment_id:this.deployment,auth_version:'1',purpose:'reset',delivery_channel:this.input.mail.channel,code_mac:'0'.repeat(64),mac_key_id:this.input.crypto.keyId},code);}
 /** Private administrative application operation. Never mounted as HTTP/MCP. */
 async registerContact(selectedUid:string,email:string,consentReference:string,replace=false):Promise<void>{
  try{uid(selectedUid);email=recoveryEmail(email);if(!/^[a-f0-9-]{36}$/iu.test(consentReference)||!this.input.mail.permits(email))throw new AuthError('INVALID_ARGUMENT');
   await this.tx.run(async c=>{
    const account=await this.account(c,selectedUid);if(!account||account.status==='disabled'||!account.synthetic_display_name)throw new AuthError('INVALID_ARGUMENT');
    const old=await this.contact(c,account.id);if(Boolean(old)!==replace)throw new AuthError('INVALID_ARGUMENT');
    const now=await this.clock.now(c),id=old?.id??randomUUID(),revision=old?String(BigInt(old.revision)+1n):'1';const encrypted=this.input.crypto.encrypt(email,account.id,id,revision);
    await this.revoke(c,account.id,now);await this.invalidate(c,account.id,now,'contact_changed');
    await c.query('UPDATE banuchat_auth.accounts SET auth_version=auth_version+1,updated_at=$2 WHERE id=$1',[account.id,now]);
    await c.query(`INSERT INTO banuchat_auth.recovery_contacts(id,principal_id,email_ciphertext,nonce,tag,encryption_key_id,email_lookup_hmac,lookup_key_id,revision,status,consent_reference,consented_at,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_verification',$10,$11,$11,$11) ON CONFLICT(principal_id) DO UPDATE SET
     email_ciphertext=EXCLUDED.email_ciphertext,nonce=EXCLUDED.nonce,tag=EXCLUDED.tag,encryption_key_id=EXCLUDED.encryption_key_id,email_lookup_hmac=EXCLUDED.email_lookup_hmac,lookup_key_id=EXCLUDED.lookup_key_id,revision=EXCLUDED.revision,
     status='pending_verification',consent_reference=EXCLUDED.consent_reference,consented_at=EXCLUDED.consented_at,verified_at=NULL,verification_reference=NULL,verification_channel=NULL,updated_at=EXCLUDED.updated_at`,
     [id,account.id,encrypted.email_ciphertext,encrypted.nonce,encrypted.tag,encrypted.encryption_key_id,encrypted.email_lookup_hmac,encrypted.lookup_key_id,revision,consentReference,now]);
   });
  }catch(error){throw safeError(error);}
 }
 async requestContactVerification(selectedUid:string,context:AuthRequestContext){try{uid(selectedUid);this.ready();if(await this.limiter.reserve(selectedUid,context,false))await this.issue(selectedUid,true,context);}catch(error){throw safeError(error);}}
 async verifyContact(selectedUid:string,code:string,context:AuthRequestContext){try{uid(selectedUid);verificationCode(code);if(!await this.limiter.reserve(selectedUid,context,true)||!await this.consume(selectedUid,code,true,context))throw new AuthError('INVALID_RESET');}catch(error){throw safeError(error);}}
 async suspendContact(selectedUid:string){try{uid(selectedUid);await this.tx.run(async c=>{const account=await this.account(c,selectedUid);if(!account)throw new AuthError('INVALID_ARGUMENT');const now=await this.clock.now(c);await this.revoke(c,account.id,now);await this.invalidate(c,account.id,now,'contact_changed');await c.query('UPDATE banuchat_auth.accounts SET auth_version=auth_version+1,updated_at=$2 WHERE id=$1',[account.id,now]);await c.query("UPDATE banuchat_auth.recovery_contacts SET status='suspended',updated_at=$2 WHERE principal_id=$1",[account.id,now]);});}catch(error){throw safeError(error);}}
 /** Explicit remediation, not automatic backfill. Internal administrative caller only. */
 async assignLegacyName(selectedUid:string,name:string){try{uid(selectedUid);syntheticName(name);await this.tx.run(async c=>{const account=await this.account(c,selectedUid);if(!account||account.synthetic_display_name!==null)throw new AuthError('INVALID_ARGUMENT');await c.query('UPDATE banuchat_auth.accounts SET synthetic_display_name=$2,updated_at=clock_timestamp() WHERE id=$1',[account.id,name]);});}catch(error){throw safeError(error);}}
}
interface ConstructorParametersInternal {pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;crypto:RecoveryCrypto;mail:MailDelivery;clock?:AuthClock;hasher?:PasswordHasher;}
