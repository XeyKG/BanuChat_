import {randomUUID} from 'node:crypto';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import type {AuthService} from '../auth/auth-service.js';
import {AuthenticatedResources,resourceError} from '../auth/resources.js';
import {AuthError,errors,exactObject} from '../auth/primitives.js';
import {handleDetachedAuth,parseBody} from './auth-handlers.js';
import {RESET_ACCEPTED,type RecoveryService} from '../auth/recovery-service.js';
import type {CalendarEventType} from '../application/calendar-events.js';
import type {ProfileProgressStatus} from '../application/profile-progress.js';
import type {AnnouncementTemporalStatus} from '../application/announcements.js';
import {validateOe2Filters,type Oe2DemoFilters} from '../application/oe2-demo.js';

const common={'Cache-Control':'no-store',Vary:'Authorization'};
const jsonType='application/json; charset=utf-8';
function reply(response:ServerResponse,status:number,body?:unknown,headers:Record<string,string|number>={}){
 response.writeHead(status,{...common,...(status===204?{}:{'Content-Type':Buffer.isBuffer(body)?'application/octet-stream':jsonType}),...headers});
 response.end(body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body));
}
function failure(response:ServerResponse,error:unknown,allow?:string){
 const safe=resourceError(error);reply(response,errors[safe.code].status,{error:{code:safe.code,message:errors[safe.code].message,request_id:randomUUID()}},
 {...(safe.code==='UNAUTHENTICATED'?{'WWW-Authenticate':'Bearer realm="banuchat-synthetic"'}:{}),
 ...(safe.code==='METHOD_NOT_ALLOWED' && allow?{Allow:allow}:{}),...(safe.code==='RATE_LIMITED'?{'Retry-After':String(safe.retryAfter??900)}:{})});
}
function single(q:URLSearchParams,name:string,required=false){const v=q.getAll(name);if(v.length>1||(required && v.length!==1))throw new AuthError('INVALID_ARGUMENT');return v[0];}
function limit(q:URLSearchParams){const v=single(q,'limit');if(v===undefined)return undefined;if(!/^(?:[1-9]|[1-4][0-9]|50)$/u.test(v))throw new AuthError('INVALID_ARGUMENT');return Number(v);}
function repeated<T extends string>(q:URLSearchParams,name:string,allowed:readonly T[]):T[]|undefined{
 const v=q.getAll(name);if(!v.length)return undefined;
 if(v.length>3 ||new Set(v).size!==v.length||v.some(x=>!allowed.includes(x as T)))throw new AuthError('INVALID_ARGUMENT');return v as T[];
}
function params(q:URLSearchParams,allowed:string[]){if([...q.keys()].some(k=>!allowed.includes(k)))throw new AuthError('INVALID_ARGUMENT');}
function uuid(v:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(v))throw new AuthError('INVALID_ARGUMENT');return v.toLowerCase();}
function v2Links<T>(value:T):T {
 // Project only the trusted service's artifact_url field; never rewrite conversational text.
 if(Array.isArray(value))return value.map(v2Links) as T;
 if(value!==null && typeof value==='object'){const result:Record<string,unknown>={};for(const [key,v]of Object.entries(value))result[key]=key==='artifact_url' && typeof v==='string'?v.replace(/^\/api\/v1\/documents\//u,'/api/v2/documents/'):v2Links(v);
  // Persistence keeps the exact chunk locator; only the student-facing projection is natural.
  if(result.source_kind==='document'&&typeof result.locator==='string'&&/^claim:[A-Za-z0-9-]+:part:\d+$/u.test(result.locator)&&typeof result.label==='string')result.locator=`Sección «${result.label}»`;
  return result as T;}return value;
}
/** Explicit v2-only composition. No listener/start script, v1 import, CCD mode or auth bypass. */
export function createAuthenticatedApiServer(input:{auth:AuthService;resources:Pick<AuthenticatedResources,'create'|'list'|'detail'|'remove'|'send'|'artifact'|'progress'|'calendar'|'announcements'>&Partial<Pick<AuthenticatedResources,'demoOe2'>>;oe2_demo?:boolean;now?:()=>string;recovery?:Pick<RecoveryService,'request'|'confirm'>}){
 async function handle(request:IncomingMessage,response:ServerResponse){
 let allow:string|undefined;
 try{
  const target=request.url??'';const headers:Array<[string,string]>=[];for(let i=0;i<request.rawHeaders.length;i+=2)headers.push([request.rawHeaders[i]!,request.rawHeaders[i+1]!]);
  const headerBytes=headers.reduce((n,[k,v])=>n+Buffer.byteLength(k+': '+v+'\r\n'),2);
  if(Buffer.byteLength(target)>8192 || headerBytes>16384)throw new AuthError('PAYLOAD_TOO_LARGE');
  const body=await new Promise<Buffer>((resolve,reject)=>{
   const chunks:Buffer[]=[];let length=0;let exceeded=false;
   request.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>16384){chunks.length=0;if(!exceeded){exceeded=true;reject(new AuthError('PAYLOAD_TOO_LARGE'));}}else if(!exceeded)chunks.push(chunk);});
   request.on('end',()=>{if(!exceeded)resolve(Buffer.concat(chunks));});request.on('error',()=>reject(new AuthError('INVALID_ARGUMENT')));
  });const path=target.split('?')[0]??'';
  // Raw origin-form matching deliberately avoids path normalization/aliases to protected resources.
  if(!target.startsWith('/') || /[\r\n#]/u.test(target))throw new AuthError('NOT_FOUND');
  if(path==='/api/v2/auth/password/reset-requests'||path==='/api/v2/auth/password/reset'){
   allow='POST';if(request.method!=='POST')throw new AuthError('METHOD_NOT_ALLOWED');
   if(target.includes('?')||request.rawTrailers.length)throw new AuthError('INVALID_ARGUMENT');
   const types=headers.filter(([k])=>k.toLowerCase()==='content-type'),enc=headers.filter(([k])=>k.toLowerCase()==='content-encoding');
   if(types.length!==1||!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/iu.test(types[0]![1])||enc.length>1||(enc.length===1&&enc[0]![1].toLowerCase()!=='identity'))throw new AuthError('INVALID_ARGUMENT');
   const data=parseBody(body);if(!input.recovery)throw new AuthError('DEPENDENCY_UNAVAILABLE');
   const context={origin:request.socket.remoteAddress??'local',requestId:randomUUID()};
   if(path.endsWith('/reset-requests')){await input.recovery.request(data,context);reply(response,202,RESET_ACCEPTED);}else{await input.recovery.confirm(data,context);reply(response,204);}return;
  }
  const authRoutes=['/api/v2/auth/login','/api/v2/auth/refresh','/api/v2/auth/me','/api/v2/auth/logout'];
  if(authRoutes.includes(path)){
   const r=await handleDetachedAuth({method:request.method??'',target,headers,body,origin:request.socket.remoteAddress??'local'},input.auth);
   reply(response,r.status,r.body,r.headers);return;
  }
  const chat=/^\/api\/v2\/conversations\/([^/]+)(\/messages)?$/u.exec(path);
  const doc=/^\/api\/v2\/documents\/([^/]+)\/artifact$/u.exec(path);
  const oe2=input.oe2_demo&&['/api/v2/demo/oe2/programming','/api/v2/demo/oe2/announcements'].includes(path)?path.endsWith('/programming')?'programming':'announcements':undefined;
  if(path==='/api/v2/conversations')allow='GET, POST';
  else if(chat)allow=chat[2]?'POST':'GET, DELETE';
  else if(oe2 || doc || ['/api/v2/me/progress','/api/v2/calendar/events','/api/v2/announcements'].includes(path))allow='GET';
  if(!allow)throw new AuthError('NOT_FOUND');
  const method=request.method??'';if(!allow.split(', ').includes(method))throw new AuthError('METHOD_NOT_ALLOWED');
  const auth=headers.filter(([k])=>k.toLowerCase()==='authorization');const m=auth.length===1?/^Bearer ([A-Za-z0-9_-]{43})$/iu.exec(auth[0]![1]):null;
  if(!m?.[1])throw new AuthError('UNAUTHENTICATED');const token=m[1];await input.auth.verifyAccess(token);
  if((method==='GET'||method==='DELETE') && body.length)throw new AuthError('INVALID_ARGUMENT');
  if(request.rawTrailers.length)throw new AuthError('INVALID_ARGUMENT');
  const rawQuery=target.includes('?')?target.slice(target.indexOf('?')+1):'';
  if(/%(?![0-9a-f]{2})/iu.test(rawQuery))throw new AuthError('INVALID_ARGUMENT');
  try{decodeURIComponent(rawQuery.replaceAll('+',' '));}catch{throw new AuthError('INVALID_ARGUMENT');}
  const q=new URLSearchParams(rawQuery);
  let parsed:unknown;
  if(method==='POST'){
   const types=headers.filter(([k])=>k.toLowerCase()==='content-type');const enc=headers.filter(([k])=>k.toLowerCase()==='content-encoding');
   if(types.length!==1 || !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/iu.test(types[0]![1]) || enc.length>1 || (enc.length===1&&enc[0]![1].toLowerCase()!=='identity'))throw new AuthError('INVALID_ARGUMENT');
   parsed=parseBody(body);
  }
  const now=(input.now??(()=>new Date().toISOString()))();const resources=input.resources;
  if(oe2){
   params(q,oe2==='programming'?['query','mode','limit']:['query','type','temporal_status','limit']);
   const filters:Oe2DemoFilters={};for(const key of ['query','mode','type','temporal_status']as const){const v=single(q,key);if(v!==undefined)Object.assign(filters,{[key]:v});}
   const n=limit(q);if(n!==undefined)filters.limit=n;validateOe2Filters(oe2,filters);
   if(!resources.demoOe2)throw new AuthError('DEPENDENCY_UNAVAILABLE');
   reply(response,200,await resources.demoOe2(token,oe2,filters,now));return;
  }
  if(path==='/api/v2/conversations'){
   if(method==='GET'){params(q,['limit']);reply(response,200,await resources.list(token,limit(q)));}
   else{if(target.includes('?'))throw new AuthError('INVALID_ARGUMENT');exactObject(parsed,[]);const result=await resources.create(token);reply(response,201,result,{Location:'/api/v2/conversations/'+result.conversation_id});}return;
  }
  if(chat){params(q,[]);if(target.includes('?'))throw new AuthError('INVALID_ARGUMENT');const id=uuid(chat[1]!);
   if(chat[2]){const x=exactObject(parsed,['content']);if(typeof x.content!=='string'||/[\uD800-\uDFFF]/u.test(x.content)||[...x.content].length<1||[...x.content].length>4000||! /\S/u.test(x.content))throw new AuthError('INVALID_ARGUMENT');reply(response,201,v2Links(await resources.send(token,id,x.content,now)));}
   else if(method==='GET')reply(response,200,v2Links(await resources.detail(token,id)));
   else{await resources.remove(token,id);reply(response,204);}return;
  }
  if(doc){if(target.includes('?'))throw new AuthError('INVALID_ARGUMENT');const result=await resources.artifact(token,uuid(doc[1]!));reply(response,200,result.bytes,{'Content-Length':result.bytes.length,'Content-Disposition':`attachment; filename="${result.document_version_id}.bin"`,'X-Content-Type-Options':'nosniff'});return;}
  if(path==='/api/v2/me/progress'){
   params(q,['statuses','limit']);const statuses=repeated<ProfileProgressStatus>(q,'statuses',['enrolled','in_progress','completed']),n=limit(q);
   const r=await resources.progress(token,{...(statuses?{statuses}:{}),...(n?{limit:n}:{})});reply(response,200,{release_id:r.release_id,profile:{profile_key:r.profile.profile_key,alias:r.profile.alias},courses:r.courses.map(({source:_,...course})=>course)});return;
  }
  if(path==='/api/v2/calendar/events'){
   params(q,['date_from','date_to','event_types','limit']);const date_from=single(q,'date_from',true)!,date_to=single(q,'date_to',true)!;
   const event_types=repeated<CalendarEventType>(q,'event_types',['course_session','announcement_deadline','general']),n=limit(q);
   const r=await resources.calendar(token,{date_from,date_to,...(event_types?{event_types}:{}),...(n?{limit:n}:{})});reply(response,200,{release_id:r.release_id,events:r.events.map(({source:_,...event})=>event)});return;
  }
  params(q,['query','temporal_status','reference_time','limit']);const query=single(q,'query'),temporal_status=single(q,'temporal_status'),reference_time=single(q,'reference_time')??now,n=limit(q);
  if(temporal_status!==undefined&&!['active','upcoming','expired','all'].includes(temporal_status))throw new AuthError('INVALID_ARGUMENT');
  const r=await resources.announcements(token,{...(query!==undefined?{query}:{}),...(temporal_status?{temporal_status:temporal_status as AnnouncementTemporalStatus}:{}),reference_time,...(n?{limit:n}:{})});
  reply(response,200,{release_id:r.release_id,reference_time:r.reference_time,announcements:r.announcements.map(({source:_,...a})=>a)});
 }catch(error){request.resume();if(response.headersSent)response.destroy();else failure(response,error,allow);}
 }
 const server=createServer({maxHeaderSize:16384,headersTimeout:15000,requestTimeout:30000},(req,res)=>void handle(req,res));
 server.maxHeadersCount=0; // Never silently discard extra header fields.
 server.on('clientError',(error,socket)=>{
  if(!socket.writable)return;
  const code=(error as {code?:string}).code==='HPE_HEADER_OVERFLOW'?'PAYLOAD_TOO_LARGE':'INVALID_ARGUMENT';
  const body=JSON.stringify({error:{code,message:errors[code].message,request_id:randomUUID()}});
  socket.end(`HTTP/1.1 ${errors[code].status} Error\r\nConnection: close\r\nCache-Control: no-store\r\nVary: Authorization\r\nContent-Type: ${jsonType}\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
 });
 // Prevent Node's default CONNECT/Upgrade/Expect responses from exposing another surface.
 for(const event of ['connect','upgrade'] as const)server.on(event,(_req,socket)=>{
  const body=JSON.stringify({error:{code:'NOT_FOUND',message:errors.NOT_FOUND.message,request_id:randomUUID()}});
  socket.end(`HTTP/1.1 404 Not Found\r\nCache-Control: no-store\r\nVary: Authorization\r\nContent-Type: ${jsonType}\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
 });
 server.on('checkContinue',(req,res)=>{res.writeContinue();void handle(req,res);});
 server.on('checkExpectation',(req,res)=>{req.resume();failure(res,new AuthError('INVALID_ARGUMENT'));});
 return server;
}
