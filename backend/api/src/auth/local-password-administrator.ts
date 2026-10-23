import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {PgTransactionRunner} from '../data/transaction.js';
import {PgAuthStore} from './pg-auth-store.js';
import {AuthError,Argon2idHasher,newPassword,postgresClock,safeError,uid,type PasswordHasher} from './primitives.js';
import type {KnowledgeMode} from './knowledge-mode.js';

/** Trusted local administrative composition only. Never mounted over HTTP/MCP. Uses 008 ACL unchanged. */
export class LocalPasswordAdministrator {
 private constructor(private readonly pool:Pool,private readonly deployment:string,private readonly hasher:PasswordHasher){}
 static async create(input:{pool:Pool;database:string;deployment:string;hasher?:PasswordHasher;evidence_mode?:KnowledgeMode}){
  try{
   await new PgAuthStore(input.pool).assertRuntime(input.database,input.evidence_mode);
   const scope=(await input.pool.query('SELECT database_name,deployment_id FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0];
   if(scope?.database_name!==input.database||scope.deployment_id!==input.deployment.toLowerCase())throw new AuthError('DEPENDENCY_UNAVAILABLE');
   await input.pool.query('SELECT synthetic_display_name FROM banuchat_auth.accounts LIMIT 0');
   return new LocalPasswordAdministrator(input.pool,input.deployment.toLowerCase(),input.hasher??new Argon2idHasher());
  }catch(e){throw safeError(e);}
 }
 async establish(selectedUid:string,password:string,replaceActive=false):Promise<void>{
  try{
   uid(selectedUid);newPassword(password);
   const observed=(await this.pool.query('SELECT id,status,auth_version::text FROM banuchat_auth.accounts WHERE synthetic_uid=$1',[selectedUid])).rows[0];
   if(!observed||!['pending_password',...(replaceActive?['active']:[])].includes(observed.status))throw new AuthError('INVALID_ARGUMENT');
   const hash=await this.hasher.hash(password); // No transaction or locks during Argon2.
   await new PgTransactionRunner(this.pool).run(async c=>{
    const a=(await c.query<{id:string;status:string;synthetic_display_name:string|null;auth_version:string}>('SELECT id,status,synthetic_display_name,auth_version::text FROM banuchat_auth.accounts WHERE synthetic_uid=$1 FOR UPDATE',[selectedUid])).rows[0];
    const scope=(await c.query<{deployment_id:string}>('SELECT deployment_id FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0];
    if(!a||!a.synthetic_display_name||a.id!==observed.id||a.auth_version!==observed.auth_version||a.status!==observed.status||scope?.deployment_id!==this.deployment)throw new AuthError('CONFLICT');
    const now=await postgresClock.now(c);
    await c.query('SELECT id FROM banuchat_auth.sessions WHERE principal_id=$1 ORDER BY id FOR UPDATE',[a.id]);
    await c.query('UPDATE banuchat_auth.sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE principal_id=$1',[a.id,now]);
    await c.query("UPDATE banuchat_auth.recovery_challenges SET invalidated_at=$2,invalidation_reason='sibling_consumed' WHERE principal_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL",[a.id,now]);
    await c.query('INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash,changed_at) VALUES($1,$2,$3) ON CONFLICT(principal_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,changed_at=EXCLUDED.changed_at',[a.id,hash,now]);
    await c.query("UPDATE banuchat_auth.accounts SET status='active',auth_version=auth_version+1,updated_at=$2 WHERE id=$1",[a.id,now]);
    await new PgAuthStore(this.pool).audit(c,a.status==='pending_password'?'password_set':'password_reset','success',randomUUID(),a.id);
   });
  }catch(e){throw safeError(e);}finally{password='';}
 }
}
