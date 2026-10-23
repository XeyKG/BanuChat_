import {randomUUID} from 'node:crypto';
import {recoveryEmail} from './recovery-crypto.js';
export type MailResult={state:'accepted';reference:string}|{state:'rejected'|'unknown'};
export interface RecoveryMessage {recipient:string;code?:string;purpose:'verify_contact'|'initial_set'|'reset'|'change_notice';expiresAt?:string;reference:string;}
export interface MailDelivery {readonly channel:'local_test'|'external_email';ready():boolean;permits(recipient:string):boolean;send(message:RecoveryMessage):Promise<MailResult>;}
/** Private in-memory test capture only. No SMTP, relay or external-reception claim. */
export class LocalCaptureMailDelivery implements MailDelivery {
 readonly channel='local_test' as const;
 private readonly allowed:Set<string>;private readonly messages:RecoveryMessage[]=[];
 available=true;result:'accepted'|'rejected'|'unknown'='accepted';beforeSend?:()=>Promise<void>;
 constructor(recipients:readonly string[]){this.allowed=new Set(recipients.map(recoveryEmail));if([...this.allowed].some(v=>! /\.(?:test|example|invalid)$/u.test(v)))throw new Error('Local capture requires reserved test recipients');}
 ready(){return this.available;}
 permits(recipient:string){return this.allowed.has(recipient);}
 async send(message:RecoveryMessage):Promise<MailResult>{
  if(this.beforeSend)await this.beforeSend();if(!this.available||!this.permits(message.recipient))return {state:'rejected'};
  if(this.result==='accepted'){this.messages.push({...message});return {state:'accepted',reference:randomUUID()};}return {state:this.result};
 }
 /** Controlled harness only; never serialize captured messages to evidence. */
 take(recipient:string,purpose:RecoveryMessage['purpose']):RecoveryMessage|undefined{
  for(let i=this.messages.length-1;i>=0;i--)if(this.messages[i]?.recipient===recipient&&this.messages[i]?.purpose===purpose)return this.messages.splice(i,1)[0];return undefined;
 }
}
type HttpSender=(url:string,init:{method:string;headers:Record<string,string>;body:string;signal:AbortSignal;redirect:'error'})=>Promise<{ok:boolean;status:number;json():Promise<unknown>}>;
/** Candidate HTTPS adapter: no default network function, credentials or activation. */
export class ResendHttpsMailDelivery implements MailDelivery {
 readonly channel='external_email' as const;
 private readonly allowed:Set<string>;
 constructor(private readonly config:{approved:boolean;apiKey:string;sender:string;recipients:readonly string[];sendHttp:HttpSender}){this.allowed=new Set(config.recipients.map(recoveryEmail));}
 ready(){return this.config.approved&&this.config.apiKey.length>0&&this.config.sender.length>0&&this.allowed.size>0;}
 permits(recipient:string){return this.allowed.has(recipient);}
 async send(m:RecoveryMessage):Promise<MailResult>{
  if(!this.ready()||!this.permits(m.recipient)||/[\r\n]/u.test(this.config.sender))return {state:'rejected'};
  try{
   const text=m.purpose==='change_notice'?'La contraseña propia de BanuChat fue cambiada. Contacta al operador si no lo solicitaste.':`BanuChat: código ${m.code}. Finalidad: ${m.purpose}. Vence: ${m.expiresAt}. No compartas este código.`;
   const r=await this.config.sendHttp('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:'Bearer '+this.config.apiKey,'Content-Type':'application/json','Idempotency-Key':m.reference},
    body:JSON.stringify({from:this.config.sender,to:[m.recipient],subject:m.purpose==='change_notice'?'BanuChat: cambio de contraseña':'BanuChat: verificación de acceso',text})});
   if(!r.ok)return {state:r.status>=500?'unknown':'rejected'};
   const body=await r.json() as {id?:unknown};return typeof body.id==='string'&&/^[A-Za-z0-9_-]{1,128}$/u.test(body.id)?{state:'accepted',reference:body.id}:{state:'unknown'};
  }catch{return {state:'unknown'};}
 }
}
