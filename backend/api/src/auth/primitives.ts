import { createHash, createHmac, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import type { SqlQueryClient } from "../data/sql-client.js";

export type AuthCode = "INVALID_RESET" | "CONFLICT" | "INVALID_ARGUMENT" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" |
  "PAYLOAD_TOO_LARGE" | "RATE_LIMITED" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";
export const errors: Readonly<Record<AuthCode, { status: number; message: string }>> = {
  INVALID_RESET: {status:400,message:"No se pudo restablecer la contraseña."},
  CONFLICT: {status:409,message:"El contexto cambió durante la operación."},
  INVALID_ARGUMENT: {status:400,message:"La solicitud no cumple el contrato esperado."},
  UNAUTHENTICATED: {status:401,message:"No se pudo autenticar la solicitud."},
  FORBIDDEN: {status:403,message:"La operación no está permitida."},
  NOT_FOUND: {status:404,message:"El recurso solicitado no está disponible."},
  METHOD_NOT_ALLOWED: {status:405,message:"El método no está permitido."},
  PAYLOAD_TOO_LARGE: {status:413,message:"La solicitud excede el tamaño permitido."},
  RATE_LIMITED: {status:429,message:"Se alcanzó el límite temporal de solicitudes."},
  DEPENDENCY_UNAVAILABLE: {status:503,message:"Una dependencia temporalmente no está disponible."},
  INTERNAL_ERROR: {status:500,message:"Ocurrió un error interno."},
};
export class AuthError extends Error {
  constructor(public readonly code: AuthCode, public readonly retryAfter?: number) { super(errors[code].message); this.name="AuthError"; }
}
export function safeError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code = error !== null && typeof error === "object" && "code" in error ? String(error.code) : "";
  return new AuthError(/^(08|57P)|^ECONN|^ETIMEDOUT$|^ENET|^EHOST/u.test(code) ? "DEPENDENCY_UNAVAILABLE" : "INTERNAL_ERROR");
}
export function exactObject(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new AuthError("INVALID_ARGUMENT");
  const value=input as Record<string,unknown>;
  if (Object.keys(value).length!==keys.length || keys.some(key=>!Object.hasOwn(value,key))) throw new AuthError("INVALID_ARGUMENT");
  return value;
}
export function uid(value: unknown): string {
  if (typeof value!=="string" || value.length!==13 || !/^BCH-DEMO-[0-9]{4}$/u.test(value)) throw new AuthError("INVALID_ARGUMENT");
  return value;
}
export function password(value: unknown, minimum=1): string {
  if (typeof value!=="string" || /[\uD800-\uDFFF]/u.test(value) || [...value].length<minimum || [...value].length>128) throw new AuthError("INVALID_ARGUMENT");
  return value;
}
export function newPassword(value: unknown): string {
  const result=password(value,15);
  // Local denylist, also rejecting a single repeated code point. No external lookup.
  if (new Set([...result]).size<2 || ["passwordpassword", "123456789012345", "contraseñacontraseña"].includes(result.toLowerCase())) throw new AuthError("INVALID_ARGUMENT");
  return result;
}
export function digestToken(value: unknown): string {
  if (typeof value!=="string" || value.length!==43 || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(value)) throw new AuthError("UNAUTHENTICATED");
  return createHash("sha256").update(Buffer.from(value,"base64url")).digest("hex");
}
export function issueToken(): { token: string; digest: string } {
  const token=randomBytes(32).toString("base64url"); return {token,digest:digestToken(token)};
}
export function bucketKey(key: Buffer, action: string, value: string): string {
  return createHmac("sha256",key).update("banuchat-auth-v2\0"+action+"\0"+value).digest("hex");
}
export interface AuthClock { now(client: SqlQueryClient): Promise<Date>; }
export const postgresClock: AuthClock = { now: async client => {
  const result=await client.query<{now:Date}>("SELECT clock_timestamp() AS now");
  const now=result.rows[0]?.now; if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new AuthError("INTERNAL_ERROR"); return now;
} };
export interface PasswordHasher { hash(value: string): Promise<string>; verify(hash: string, value: string): Promise<boolean>; }
const phc=/^\$argon2id\$v=19\$m=([0-9]{1,9}),t=([0-9]{1,3}),p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/u;
let activeHashWork=0; // Process-wide budget, including independently composed auth cores.
export class Argon2idHasher implements PasswordHasher {
  private async limited<T>(work:()=>Promise<T>):Promise<T> {
    if(activeHashWork>=2) throw new AuthError("DEPENDENCY_UNAVAILABLE");
    activeHashWork++; try{return await work();}finally{activeHashWork--;}
  }
  hash(value:string):Promise<string> {
    newPassword(value);
    return this.limited(async()=>{
      const encoded=await argon2.hash(value,{type:argon2.argon2id,version:0x13,memoryCost:19456,timeCost:2,parallelism:1,hashLength:32,salt:randomBytes(16)});
      // node-argon2 0.45 serializes m,p,t. PHC parameter order does not affect the hash;
      // retain the canonical m,t,p representation required by the frozen AUTH-P0 DDL.
      const canonical=encoded.replace(/m=([0-9]+),p=1,t=([0-9]+)/u,"m=$1,t=$2,p=1");
      if(!phc.test(canonical))throw new AuthError("INTERNAL_ERROR");return canonical;
    });
  }
  verify(hash:string,value:string):Promise<boolean> {
    const match=phc.exec(hash);
    if(!match || Number(match[1])<19456 || Number(match[1])>262144 || Number(match[2])<2 || Number(match[2])>10) return Promise.resolve(false);
    return this.limited(()=>argon2.verify(hash,value));
  }
}
