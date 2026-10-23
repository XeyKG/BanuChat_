import type {Pool} from 'pg';
import {PgAuthStore} from './pg-auth-store.js';
import {AuthError,bucketKey,type AuthClock} from './primitives.js';
import type {AuthRequestContext} from './rate-limiter.js';
export class RecoveryLimiter {
 private readonly store:PgAuthStore;private readonly key:Buffer;
 constructor(pool:Pool,key:Buffer,private readonly clock:AuthClock){if(key.length<32)throw new AuthError('DEPENDENCY_UNAVAILABLE');this.store=new PgAuthStore(pool);this.key=Buffer.from(key);}
 async reserve(selectedUid:string,context:AuthRequestContext,confirmation:boolean):Promise<boolean>{
  if(!context.origin||context.origin.length>256||!/^[a-f0-9-]{36}$/iu.test(context.requestId))throw new AuthError('INVALID_ARGUMENT');
  const outcome=await this.store.transactions.run(async c=>{
   const now=await this.clock.now(c);let delay=0;let allowed=true;
   const rules=confirmation?[{action:'confirm_origin',value:context.origin,seconds:900,max:10},{action:'hash_work',value:'deployment',seconds:60,max:20}]:
    [{action:'reset_origin',value:context.origin,seconds:900,max:10},{action:'reset_uid',value:selectedUid,seconds:3600,max:3}];
   for(const rule of rules){const start=new Date(Math.floor(now.getTime()/(rule.seconds*1000))*rule.seconds*1000),end=new Date(start.getTime()+rule.seconds*1000);
    const row=(await c.query<{n:string}>(`INSERT INTO banuchat_auth.auth_rate_limits(action,bucket_key,window_started_at,window_seconds,attempts,expires_at)
     VALUES($1,$2,$3,$4,1,$5) ON CONFLICT(action,bucket_key,window_started_at) DO UPDATE SET attempts=banuchat_auth.auth_rate_limits.attempts+1 RETURNING attempts::text n`,[rule.action,bucketKey(this.key,rule.action,rule.value),start,rule.seconds,end])).rows[0];
    if(BigInt(row?.n??'0')>BigInt(rule.max)){if(rule.action==='reset_uid')allowed=false;else delay=Math.max(delay,Math.max(1,Math.ceil((end.getTime()-now.getTime())/1000)));}
   }
   if(confirmation){const start=new Date(Math.floor(now.getTime()/300000)*300000);const row=(await c.query<{n:string}>(`INSERT INTO banuchat_auth.recovery_uid_limits(uid_bucket,window_started_at,attempts,expires_at) VALUES($1,$2,1,$3)
    ON CONFLICT(uid_bucket,window_started_at) DO UPDATE SET attempts=banuchat_auth.recovery_uid_limits.attempts+1 RETURNING attempts::text n`,[bucketKey(this.key,'confirm_uid',selectedUid),start,new Date(start.getTime()+300000)])).rows[0];allowed=BigInt(row?.n??'0')<=5n;}
   if(delay)await this.store.audit(c,'rate_limited','denied',context.requestId);return {delay,allowed};
  });
  if(outcome.delay)throw new AuthError('RATE_LIMITED',outcome.delay);return outcome.allowed;
 }
}
