import {isCcdAuthenticated} from '../config/demo-mode';
import {startMessageHttpDiagnostic,recordRejectedMessageHttp} from '../api/message-http-diagnostic';
export interface CurrentSession {
 principal_id:string;synthetic_uid:string;session_id:string;session_expires_at:string;release_id:string;
 evidence_mode:'synthetic'|'ccd_local';profile:{profile_key:string;alias:string};capabilities:string[];
}
interface Pair {access_token:string;refresh_token:string;token_type:'Bearer';expires_in:number;session_expires_at:string;}
export interface RefreshStore {available():Promise<boolean>;get():Promise<string|null>;set(token:string):Promise<void>;clear():Promise<void>;}
export type AuthSnapshot={phase:'restoring'|'signed_out'|'authenticated'|'unavailable';me:CurrentSession|null;epoch:number;logoutRemoteConfirmed?:boolean|null};
export class SessionError extends Error {constructor(){super('No se pudo validar la sesión. Inicia sesión nuevamente.');}}
const tokenPattern=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const capabilities=['chat','history','progress','calendar','announcements','documents'];
function pair(v:unknown):Pair {
 const p=v as Pair;if(!p||Object.keys(p).sort().join()!==['access_token','expires_in','refresh_token','session_expires_at','token_type'].sort().join()||
  typeof p.access_token!=='string'||typeof p.refresh_token!=='string'||!tokenPattern.test(p.access_token)||!tokenPattern.test(p.refresh_token)||p.token_type!=='Bearer'||!Number.isInteger(p.expires_in)||p.expires_in<1||p.expires_in>900||typeof p.session_expires_at!=='string'||!Number.isFinite(Date.parse(p.session_expires_at)))throw new SessionError();return p;
}
function current(v:unknown):CurrentSession {
 const ccd=isCcdAuthenticated(),expected=ccd?['chat','history','documents']:capabilities;
 const m=v as CurrentSession;if(!m||Object.keys(m).sort().join()!==['principal_id','synthetic_uid','session_id','session_expires_at','release_id','profile','capabilities','evidence_mode'].sort().join()||
  m.evidence_mode!==(ccd?'ccd_local':'synthetic')||
  typeof m.principal_id!=='string'||typeof m.session_id!=='string'||typeof m.release_id!=='string'||typeof m.synthetic_uid!=='string'||![9,13].includes(m.synthetic_uid.length)||!uuid.test(m.principal_id)||!uuid.test(m.session_id)||!uuid.test(m.release_id)||!/^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$/.test(m.synthetic_uid)||typeof m.session_expires_at!=='string'||!Number.isFinite(Date.parse(m.session_expires_at))||
  !m.profile||Object.keys(m.profile).sort().join()!=='alias,profile_key'||typeof m.profile.profile_key!=='string'||typeof m.profile.alias!=='string'||
  (ccd&&(m.profile.profile_key!=='ccd-local-demo'||m.profile.alias!=='Demostración CCD local — sin identidad institucional'))||JSON.stringify(m.capabilities)!==JSON.stringify(expected))throw new SessionError();return m;
}
/** Tokens never enter React state, AsyncStorage or public configuration. No retry of HTTP operations. */
export class AuthSession {
 private access:string|null=null;private expires=0;private epoch=0;private refreshJob:Promise<string>|null=null;
 private io:Promise<void>=Promise.resolve();private listeners=new Set<()=>void>();
 private snapshot:AuthSnapshot={phase:'restoring',me:null,epoch:0};
 private signingIn=false;private logoutRemoteConfirmed:boolean|null=null;
 constructor(private readonly store:RefreshStore,private readonly base:()=>string,private readonly request:typeof fetch=(...args)=>globalThis.fetch(...args),private readonly now=Date.now){}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
 private publish(phase:AuthSnapshot['phase'],me:CurrentSession|null=null){this.snapshot={phase,me,epoch:this.epoch,logoutRemoteConfirmed:this.logoutRemoteConfirmed};this.listeners.forEach(l=>l());}
 private storage<T>(work:()=>Promise<T>):Promise<T>{const result=this.io.then(work);this.io=result.then(()=>{},()=>{});return result;}
 private check(epoch:number){if(epoch!==this.epoch)throw new SessionError();}
 private async raw(path:string,method:string,body?:unknown,access?:string):Promise<Response>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{return await this.request(this.base()+path,{method,redirect:'error',cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(access?{Authorization:'Bearer '+access}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});}
  catch{throw new SessionError();}finally{clearTimeout(timer);}
 }
 private async invalidate(){this.epoch++;this.access=null;this.expires=0;this.publish('signed_out');try{await this.storage(()=>this.store.clear());}catch{this.publish('unavailable');}}
 private async discard(access:string){try{await this.raw('/auth/logout','POST',undefined,access);}catch{/* No retry and no assertion of remote revocation. */}}
 async login(selectedUid:string,password:string):Promise<void>{
  if(this.signingIn||this.snapshot.phase==='authenticated'||![9,13].includes(selectedUid.length)||!/^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$/.test(selectedUid)||!password||[...password].length>128||/[\uD800-\uDFFF]/u.test(password))throw new SessionError();
  this.signingIn=true;this.logoutRemoteConfirmed=null;
  await this.invalidate();const epoch=this.epoch;let issued:Pair|undefined;
  try{
   if(!await this.store.available()){this.publish('unavailable');throw new SessionError();}
   const r=await this.raw('/auth/login','POST',{synthetic_uid:selectedUid,password});if(r.status!==200)throw new SessionError();issued=pair(await r.json());this.check(epoch);
   const meResponse=await this.raw('/auth/me','GET',undefined,issued.access_token);if(meResponse.status!==200)throw new SessionError();const me=current(await meResponse.json());this.check(epoch);
   if(me.synthetic_uid!==selectedUid||me.session_expires_at!==issued.session_expires_at)throw new SessionError();
   await this.storage(async()=>{this.check(epoch);await this.store.set(issued!.refresh_token);});this.check(epoch);
   this.access=issued.access_token;this.expires=Math.min(this.now()+issued.expires_in*1000,Date.parse(issued.session_expires_at));this.publish('authenticated',me);
  }catch{if(issued)await this.discard(issued.access_token);if(epoch===this.epoch)await this.invalidate();throw new SessionError();}
  finally{password='';this.signingIn=false;}
 }
 async restore():Promise<void>{
  if(this.snapshot.phase!=='restoring')return;
  const epoch=this.epoch;
  try{if(!await this.store.available()){this.publish('unavailable');return;}
   const stored=await this.storage(()=>this.store.get());this.check(epoch);if(!stored){this.publish('signed_out');return;}
   const access=await this.refresh();this.check(epoch);const r=await this.raw('/auth/me','GET',undefined,access);if(r.status!==200)throw new SessionError();const me=current(await r.json());this.check(epoch);this.publish('authenticated',me);
  }catch{if(epoch===this.epoch)await this.invalidate();}
 }
 private refresh():Promise<string>{
  if(this.refreshJob)return this.refreshJob;const epoch=this.epoch;
  const work=(async()=>{let issued:Pair|undefined;
   try{
    const stored=await this.storage(async()=>{const v=await this.store.get();await this.store.clear();return v;});if(!stored||!tokenPattern.test(stored))throw new SessionError();this.check(epoch);
    const r=await this.raw('/auth/refresh','POST',{refresh_token:stored});if(r.status!==200)throw new SessionError();issued=pair(await r.json());this.check(epoch);
    await this.storage(async()=>{this.check(epoch);await this.store.set(issued!.refresh_token);});this.check(epoch);
    this.access=issued.access_token;this.expires=Math.min(this.now()+issued.expires_in*1000,Date.parse(issued.session_expires_at));return issued.access_token;
   }catch{if(issued)await this.discard(issued.access_token);if(epoch===this.epoch)await this.invalidate();throw new SessionError();}
  })();this.refreshJob=work;void work.finally(()=>{if(this.refreshJob===work)this.refreshJob=null;}).catch(()=>{});return work;
 }
 private token(){if(this.access&&this.expires>this.now()+5000)return Promise.resolve(this.access);return this.refresh();}
 async resource(url:string,options:RequestInit={}):Promise<Response>{
  if(this.snapshot.phase!=='authenticated')throw new SessionError();const epoch=this.epoch,base=this.base();
  if(!url.startsWith(base+'/')||!/^(?:\/conversations(?:\?|\/|$)|\/me\/progress(?:\?|$)|\/calendar\/events\?|\/announcements(?:\?|$)|\/documents\/[a-f0-9-]+\/artifact$)/i.test(url.slice(base.length)))throw new SessionError();
  const access=await this.token();this.check(epoch);const headers=new Headers(options.headers);headers.set('Authorization','Bearer '+access);
  const messagePost=options.method?.toUpperCase()==='POST'&&/^\/conversations\/[^/?#]+\/messages$/u.test(url.slice(base.length));
  const diagnosticStart=messagePost?startMessageHttpDiagnostic():undefined;
  let response:Response;try{response=await this.request(url,{...options,headers,redirect:'error',cache:'no-store'});}catch{throw new SessionError();}this.check(epoch);
  if(messagePost)recordRejectedMessageHttp(response,diagnosticStart);
  if(response.status===401){await this.invalidate();throw new SessionError();}
  const json=response.json.bind(response),text=response.text.bind(response);
  response.json=async()=>{const result:unknown=await json();this.check(epoch);return result;};
  response.text=async()=>{const result=await text();this.check(epoch);return result;};
  return response;
 }
 async logout():Promise<boolean>{
  const access=this.access,expires=this.expires;this.logoutRemoteConfirmed=null;
  const saved=this.storage(()=>this.store.get()).catch(()=>null);await this.invalidate();const epoch=this.epoch;let confirmed=false;
  try{let target=access;const stored=await saved;
   if((!target||expires<=this.now())&&stored&&tokenPattern.test(stored)){
    const rotated=await this.raw('/auth/refresh','POST',{refresh_token:stored});if(rotated.status!==200)throw new SessionError();target=pair(await rotated.json()).access_token;
   }
   if(expires<=this.now()&&!stored)target=null;
   if(target)confirmed=(await this.raw('/auth/logout','POST',undefined,target)).status===204;
  }catch{/* Local cleanup is mandatory even offline; no hidden retry. */}
  if(epoch===this.epoch){this.logoutRemoteConfirmed=confirmed;this.publish(this.snapshot.phase);}
  return confirmed;
 }
}
