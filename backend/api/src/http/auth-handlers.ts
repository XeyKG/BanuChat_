import { randomUUID } from "node:crypto";
import type { AuthService } from "../auth/auth-service.js";
import { AuthError, errors, safeError } from "../auth/primitives.js";

export interface DetachedAuthRequest {
  method:string;target:string;headers:ReadonlyArray<readonly[string,string]>;body:Buffer;
  /** Supplied by a trusted adapter from the connection, never a forwarded/client field. */
  origin:string;
}
export interface DetachedAuthResponse { status:number;headers:Record<string,string>;body?:unknown; }
type AuthOperations=Pick<AuthService,"login"|"refresh"|"authenticate"|"currentSession"|"logout">;
/** Strict JSON syntax + duplicate-member validation, including escaped key aliases. */
function parseBody(bytes:Buffer):unknown {
  let text:string;let value:unknown;
  try {text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);value=JSON.parse(text);}catch{throw new AuthError("INVALID_ARGUMENT");}
  const stack:Array<{object:boolean;key:boolean;seen:Set<string>}>=[];
  const strings= /"(?:\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})|[^"\\\u0000-\u001F])*"|[{}\[\]:,]/gu;
  for(const match of text.matchAll(strings)) {
    const token=match[0];const top=stack.at(-1);
    if(token==="{" || token==="[")stack.push({object:token==="{",key:token==="{",seen:new Set()});
    else if(token==="}" || token==="]")stack.pop();
    else if(token==="," && top?.object)top.key=true;
    else if(token===":" && top?.object)top.key=false;
    else if(token.startsWith('"')) {
      const decoded=JSON.parse(token) as string;
      if(/[\uD800-\uDFFF]/u.test(decoded))throw new AuthError("INVALID_ARGUMENT");
      if(top?.object && top.key){if(top.seen.has(decoded))throw new AuthError("INVALID_ARGUMENT");top.seen.add(decoded);}
    }
  }
  return value;
}
/** Four prepared handlers only. This module never creates/listens on a server or registers v1/v2. */
export async function handleDetachedAuth(request:DetachedAuthRequest,service:AuthOperations):Promise<DetachedAuthResponse> {
  const requestId=randomUUID();const common={"Cache-Control":"no-store",Vary:"Authorization"};
  const routes:Record<string,string>={"/api/v2/auth/login":"POST","/api/v2/auth/refresh":"POST","/api/v2/auth/me":"GET","/api/v2/auth/logout":"POST"};
  let allow:string|undefined;
  try {
    const headerBytes=request.headers.reduce((n,[key,value])=>n+Buffer.byteLength(key+": "+value+"\r\n"),2);
    if(request.body.length>16384 || Buffer.byteLength(request.target)>8192 || headerBytes>16384)throw new AuthError("PAYLOAD_TOO_LARGE");
    if(request.headers.some(([key,value])=>/[\r\n]/u.test(key+value)))throw new AuthError("INVALID_ARGUMENT");
    const path=request.target.split("?")[0]??"";
    if((request.method==="GET" || request.method==="DELETE" || path==="/api/v2/auth/logout") && request.body.length)throw new AuthError("INVALID_ARGUMENT");
    allow=routes[path];
    if(!allow)throw new AuthError("NOT_FOUND");
    if(request.method!==allow)throw new AuthError("METHOD_NOT_ALLOWED");
    const values=(name:string)=>request.headers.filter(([key])=>key.toLowerCase()===name).map(([,value])=>value);
    const context={origin:request.origin,requestId};
    const success=(status:number,body?:unknown):DetachedAuthResponse=>({status,headers:status===204?{...common}:{...common,"Content-Type":"application/json; charset=utf-8"},...(body===undefined?{}:{body})});
    if(path.endsWith("/me") || path.endsWith("/logout")) {
      if(request.body.length)throw new AuthError("INVALID_ARGUMENT");
      const auth=values("authorization");const match=auth.length===1?/^Bearer ([A-Za-z0-9_-]{43})$/iu.exec(auth[0]??""):null;
      if(!match?.[1])throw new AuthError("UNAUTHENTICATED");
      // Authenticate before reporting specific query validation, per the protected-route policy.
      if(request.target.includes("?")) {
        await service.authenticate(match[1]);throw new AuthError("INVALID_ARGUMENT");
      }
      if(path.endsWith("/me"))return success(200,await service.currentSession(match[1]));
      await service.logout(match[1],context);return success(204);
    }
    if(request.target.includes("?"))throw new AuthError("INVALID_ARGUMENT");
    const types=values("content-type");
    const encodings=values("content-encoding");
    if(types.length!==1 || !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/iu.test(types[0]??"") ||
      encodings.length>1 || (encodings.length===1 && encodings[0]?.toLowerCase()!=="identity"))throw new AuthError("INVALID_ARGUMENT");
    const body=parseBody(request.body);
    return success(200,path.endsWith("/login")?await service.login(body,context):await service.refresh(body,context));
  }catch(error) {
    const safe=safeError(error);const definition=errors[safe.code];
    const headers:Record<string,string>={...common,"Content-Type":"application/json; charset=utf-8"};
    if(safe.code==="UNAUTHENTICATED")headers["WWW-Authenticate"]='Bearer realm="banuchat-synthetic"';
    if(safe.code==="RATE_LIMITED")headers["Retry-After"]=String(safe.retryAfter??900);
    if(safe.code==="METHOD_NOT_ALLOWED" && allow)headers.Allow=allow;
    return {status:definition.status,headers,body:{error:{code:safe.code,message:definition.message,request_id:requestId}}};
  }
}
