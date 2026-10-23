import { PgAuthStore } from "./pg-auth-store.js";
import { AuthError, bucketKey, type AuthClock } from "./primitives.js";

export interface AuthRequestContext { origin:string; requestId:string; }
export class PersistentAuthLimiter {
  constructor(private readonly store:PgAuthStore,private readonly key:Buffer,private readonly clock:AuthClock) {
    if(key.length<32)throw new AuthError("DEPENDENCY_UNAVAILABLE");
  }
  async reserve(context:AuthRequestContext,kind:"login"|"refresh",uid?:string):Promise<void> {
    if(!context.origin || context.origin.length>256 || !/^[0-9a-fA-F-]{36}$/u.test(context.requestId))throw new AuthError("INVALID_ARGUMENT");
    const rules=kind==="login" ? [
      {action:"hash_work",value:"deployment",seconds:60,limit:20},
      {action:"login_origin",value:context.origin,seconds:900,limit:30},
      {action:"login_uid",value:uid!,seconds:900,limit:5},
    ] : [{action:"refresh_origin",value:context.origin,seconds:900,limit:60}];
    const wait=await this.store.transactions.run(async c=>{
      const now=await this.clock.now(c); let delay=0;
      for(const rule of rules) {
        const start=new Date(Math.floor(now.getTime()/(rule.seconds*1000))*rule.seconds*1000);
        const end=new Date(start.getTime()+rule.seconds*1000);
        const r=await c.query<{attempts:string}>(`INSERT INTO banuchat_auth.auth_rate_limits(action,bucket_key,window_started_at,window_seconds,attempts,expires_at)
          VALUES($1,$2,$3,$4,1,$5) ON CONFLICT(action,bucket_key,window_started_at)
          DO UPDATE SET attempts=banuchat_auth.auth_rate_limits.attempts+1 RETURNING attempts::text`,
          [rule.action,bucketKey(this.key,rule.action,rule.value),start,rule.seconds,end]);
        if(BigInt(r.rows[0]?.attempts??"0")>BigInt(rule.limit))delay=Math.max(delay,rule.action==="login_uid"?900:Math.max(1,Math.ceil((end.getTime()-now.getTime())/1000)));
      }
      if(delay)await this.store.audit(c,"rate_limited","denied",context.requestId);
      return delay;
    });
    // Throw AFTER commit: rejected requests must not roll back persistent counters.
    if(wait)throw new AuthError("RATE_LIMITED",wait);
  }
}
