import { randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { SqlQueryClient } from "../data/sql-client.js";
import { PgAuthStore, type AccountRow, type SessionRow, type TokenPair } from "./pg-auth-store.js";
import { PersistentAuthLimiter, type AuthRequestContext } from "./rate-limiter.js";
import {knowledgeMode,knowledgeDefinition,type KnowledgeMode} from './knowledge-mode.js';
import {auxiliaryContext} from './unified-product.js';
import {assertIsolatedPilotAuthScope,type IsolatedPilotScope} from './isolated-pilot-scope.js';
import { Argon2idHasher, AuthError, digestToken, exactObject, issueToken, password, postgresClock, safeError, uid,
  type AuthClock, type PasswordHasher } from "./primitives.js";

export interface AuthPrincipal { readonly principalId:string;readonly sessionId:string;readonly syntheticUid:string;readonly authVersion:string;readonly deploymentId:string; }
export interface CurrentSession {
  principal_id:string;synthetic_uid:string;session_id:string;session_expires_at:string;release_id:string;
  evidence_mode:KnowledgeMode;profile:{profile_key:string;alias:string};capabilities:readonly string[];
}
type Outcome<T>={value:T}|{error:AuthError};
function unwrap<T>(outcome:Outcome<T>):T {if("error" in outcome)throw outcome.error;return outcome.value;}
function denied<T>():Outcome<T>{return {error:new AuthError("UNAUTHENTICATED")};}
export function usableSession(a:AccountRow,s:SessionRow,now:Date,deployment:string,access:boolean):boolean {
  const n=now.getTime();
  return a.status==="active" && a.password_hash!==null && a.id===s.principal_id && a.auth_version===s.auth_version &&
    deployment===s.deployment_id && s.revoked_at===null && n>=s.created_at.getTime() && n>=s.last_seen_at.getTime() &&
    n<s.absolute_expires_at.getTime() && n<s.last_seen_at.getTime()+86400000 && (!access || n<s.access_expires_at.getTime());
}
async function guarded<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){throw safeError(error);}}

/** Internal auth core. No route registration, server listener, Mobile or recovery delivery. */
export class AuthService {
  private constructor(private readonly store:PgAuthStore,private readonly deployment:string,
    private readonly hasher:PasswordHasher,private readonly dummyHash:string,private readonly clock:AuthClock,
    private readonly limiter:PersistentAuthLimiter,private readonly evidenceMode:KnowledgeMode,private readonly unified=false,private readonly isolatedPilot?:IsolatedPilotScope) {}
  static async create(input:{pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;hasher?:PasswordHasher;clock?:AuthClock;evidence_mode?:KnowledgeMode;unified?:boolean;isolated_pilot?:IsolatedPilotScope}):Promise<AuthService> {
    return guarded(async()=>{
      if(input.deploymentId.length!==36 || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u.test(input.deploymentId))throw new AuthError("DEPENDENCY_UNAVAILABLE");
      const mode=knowledgeMode(input.evidence_mode);const store=new PgAuthStore(input.pool);
      if(input.isolated_pilot){if(mode!=='ccd_local'||input.unified)throw new AuthError('DEPENDENCY_UNAVAILABLE');await assertIsolatedPilotAuthScope(input.pool,input.expectedDatabase,input.deploymentId,input.isolated_pilot);}
      else await store.assertRuntime(input.expectedDatabase,mode,input.unified);
      const hasher=input.hasher??new Argon2idHasher();const clock=input.clock??postgresClock;
      const dummy=await hasher.hash(randomBytes(32).toString("base64url"));
      return new AuthService(store,input.deploymentId.toLowerCase(),hasher,dummy,clock,new PersistentAuthLimiter(store,Buffer.from(input.rateKey),clock),mode,input.unified,input.isolated_pilot?Object.freeze({...input.isolated_pilot}):undefined);
    });
  }
  login(input:unknown,context:AuthRequestContext):Promise<TokenPair> {
    return guarded(async()=>{
      const body=exactObject(input,["synthetic_uid","password"]);const selectedUid=uid(body.synthetic_uid);const secret=password(body.password);
      await this.limiter.reserve(context,"login",selectedUid);
      const observed=await this.store.accountByUid(selectedUid);
      const checkedHash=observed?.status==="active" && observed.password_hash ? observed.password_hash:this.dummyHash;
      const correct=await this.hasher.verify(checkedHash,secret); // Expensive operation WITHOUT a transaction/row lock.
      const result=await this.store.transactions.run(async c=>{
        const account=observed?await this.store.lockAccount(c,observed.id):undefined;
        if(!correct || !observed || !account || account.status!=="active" || !account.password_hash ||
          account.auth_version!==observed.auth_version || account.password_hash!==observed.password_hash) {
          await this.store.audit(c,"login_denied","denied",context.requestId); return denied<TokenPair>();
        }
        const now=await this.clock.now(c);const absolute=new Date(now.getTime()+604800000);const expires=new Date(now.getTime()+900000);
        const access=issueToken();const refresh=issueToken();const id=randomUUID();
        await this.store.createSession(c,{id,principal:account.id,deployment:this.deployment,version:account.auth_version,accessDigest:access.digest,refreshDigest:refresh.digest,now,expires,absolute});
        await this.store.audit(c,"login_succeeded","success",context.requestId,account.id,id);
        return {value:{access_token:access.token,refresh_token:refresh.token,token_type:"Bearer" as const,expires_in:900,session_expires_at:absolute.toISOString()}};
      });
      return unwrap(result);
    });
  }
  refresh(input:unknown,context:AuthRequestContext):Promise<TokenPair> {
    return guarded(async()=>{
      const body=exactObject(input,["refresh_token"]);
      // Public syntax violations are 400; unknown valid-shape credentials are 401.
      let digest:string;try{digest=digestToken(body.refresh_token);}catch{throw new AuthError("INVALID_ARGUMENT");}
      await this.limiter.reserve(context,"refresh");
      const result=await this.store.transactions.run(async c=>{
        const owner=await this.store.refreshOwner(c,digest);if(!owner)return denied<TokenPair>();
        const account=await this.store.lockAccount(c,owner.principal_id);const session=await this.store.lockSession(c,owner.session_id);
        if(!account || !session)return denied<TokenPair>();
        const now=await this.clock.now(c);const old=await this.store.lockRefresh(c,digest);
        if(!old || old.session_id!==session.id || session.deployment_id!==this.deployment)return denied<TokenPair>();
        if(old.consumed_at) {
          await this.store.revoke(c,session.id,now);
          await this.store.audit(c,"refresh_reuse_detected","denied",context.requestId,account.id,session.id);
          return denied<TokenPair>(); // Commit revocation before throwing to the caller.
        }
        if(!usableSession(account,session,now,this.deployment,false) || now>=old.expires_at)return denied<TokenPair>();
        const expires=new Date(Math.min(now.getTime()+900000,session.absolute_expires_at.getTime()));
        const seconds=Math.floor((expires.getTime()-now.getTime())/1000);if(seconds<1)return denied<TokenPair>();
        const access=issueToken();const refresh=issueToken();
        await this.store.rotate(c,old.id,session,access.digest,refresh.digest,now,expires);
        await this.store.audit(c,"refresh_succeeded","success",context.requestId,account.id,session.id);
        return {value:{access_token:access.token,refresh_token:refresh.token,token_type:"Bearer" as const,expires_in:seconds,session_expires_at:session.absolute_expires_at.toISOString()}};
      }); return unwrap(result);
    });
  }
  private async access<T>(token:string,operation:(c:SqlQueryClient,account:AccountRow,session:SessionRow,now:Date)=>Promise<T>,touch:boolean):Promise<T> {
    const digest=digestToken(token);
    const result=await this.store.transactions.run(async c=>{
      const owner=await this.store.accessOwner(c,digest);if(!owner)return denied<T>();
      const account=await this.store.lockAccount(c,owner.principal_id);const session=await this.store.lockSession(c,owner.id);
      const now=await this.clock.now(c);
      if(!account || !session || !usableSession(account,session,now,this.deployment,true) || !await this.store.accessStillMatches(c,session.id,digest))return denied<T>();
      const value=await operation(c,account,session,now);if(touch)await this.store.touch(c,session.id,now);
      return {value};
    });return unwrap(result);
  }
  authenticate(token:string):Promise<AuthPrincipal> {
    return guarded(()=>this.access(token,async(_c,a,s)=>Object.freeze({principalId:a.id,sessionId:s.id,syntheticUid:a.synthetic_uid,authVersion:a.auth_version,deploymentId:this.deployment}),true));
  }
  /** Validate before HTTP-specific input parsing, without accepting activity yet. */
  verifyAccess(token:string):Promise<AuthPrincipal> {
    return guarded(()=>this.access(token,async(_c,a,s)=>Object.freeze({principalId:a.id,sessionId:s.id,syntheticUid:a.synthetic_uid,authVersion:a.auth_version,deploymentId:this.deployment}),false));
  }
  /** Run a protected resource operation under the same account/session locks as auth. */
  withAuthorizedAccess<T>(token:string,operation:(sql:SqlQueryClient,principal:AuthPrincipal)=>Promise<T>):Promise<T>{
    return guarded(()=>this.access(token,(c,a,s)=>operation(c,Object.freeze({principalId:a.id,sessionId:s.id,syntheticUid:a.synthetic_uid,authVersion:a.auth_version,deploymentId:this.deployment})),true));
  }
  currentSession(token:string):Promise<CurrentSession> {
    return guarded(()=>this.access<CurrentSession>(token,async(c,a,s)=>{
      const definition=knowledgeDefinition(this.evidenceMode);
      if(this.isolatedPilot){
        const r=await c.query(`SELECT s.release_id FROM banuchat_auth.pilot_scope s JOIN banuchat.dataset_releases r ON r.id=s.release_id
          JOIN banuchat_auth.pilot_grants g ON g.principal_id=$1 AND g.revoked_at IS NULL
          WHERE s.singleton AND s.deployment_id=$2 AND s.release_id=$3 AND s.manifest_sha256=$4 AND r.status='ready' AND r.manifest_sha256=s.manifest_sha256`,[a.id,this.deployment,this.isolatedPilot.release_id,this.isolatedPilot.manifest_sha256]);
        if(r.rows.length!==1)throw new AuthError('FORBIDDEN');
        return {principal_id:a.id,synthetic_uid:a.synthetic_uid,session_id:s.id,session_expires_at:s.absolute_expires_at.toISOString(),release_id:this.isolatedPilot.release_id,
          evidence_mode:this.evidenceMode,profile:{profile_key:'ccd-local-demo',alias:'Demostración CCD local — sin identidad institucional'},capabilities:definition.capabilities};
      }
      const current=await c.query<{id:string}>(`SELECT r.id FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
        WHERE d.id=1 AND d.name=$1 AND r.status='ready' AND r.manifest->'synthetic'=$2::jsonb`,[definition.name,JSON.stringify(definition.synthetic)]);
      const release=current.rows[0]?.id;if(!release)throw new AuthError("NOT_FOUND");
      const binding=await c.query<{profile_key:string;alias:string}>(`SELECT p.profile_key,p.alias FROM banuchat_auth.profile_bindings b
        JOIN banuchat_auth.profile_binding_versions v ON v.principal_id=b.principal_id AND v.dataset_id=b.dataset_id AND v.profile_key=b.profile_key
        JOIN ${definition.relation} p ON p.dataset_release_id=v.dataset_release_id AND p.profile_key=v.profile_key
        JOIN banuchat_auth.corpus_grants g ON g.principal_id=b.principal_id AND g.dataset_id=b.dataset_id
        WHERE b.principal_id=$1 AND v.dataset_release_id=$2 AND g.revoked_at IS NULL AND g.mode=$3 AND g.permission='read'`,[a.id,release,this.evidenceMode]);
      let profile=binding.rows[0];if(!profile)throw new AuthError("FORBIDDEN");
      if(this.unified){const aux=await auxiliaryContext(c,a.id);profile={profile_key:aux.profile_key,alias:aux.alias};}
      return {principal_id:a.id,synthetic_uid:a.synthetic_uid,session_id:s.id,session_expires_at:s.absolute_expires_at.toISOString(),release_id:release,
        evidence_mode:this.evidenceMode,profile:{profile_key:profile.profile_key,alias:profile.alias},capabilities:this.unified?knowledgeDefinition('synthetic').capabilities:definition.capabilities};
    },true));
  }
  logout(token:string,context:AuthRequestContext):Promise<void> {
    return guarded(()=>this.access(token,async(c,a,s,now)=>{
      await this.store.revoke(c,s.id,now);await this.store.audit(c,"logout_succeeded","success",context.requestId,a.id,s.id);
    },false));
  }
}
