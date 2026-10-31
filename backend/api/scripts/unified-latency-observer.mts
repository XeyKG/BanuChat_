/** Opt-in preload. Observes the normal entrypoint without changing product files. */
import {AsyncLocalStorage} from 'node:async_hooks';
import {Server,type IncomingMessage,type ServerResponse} from 'node:http';
import {createWriteStream} from 'node:fs';
import {resolve,relative,isAbsolute,basename} from 'node:path';
import {realpath} from 'node:fs/promises';
import pg from 'pg';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {AuthenticatedResources} from '../src/auth/resources.js';
import {loadDefaultIntentRouter} from '../src/routing/intent-router.js';

type Stage='use_case'|'router'|'embedding'|'generator'|'embedding_verify'|'generator_verify'|'ollama_http'|
 'sql_retrieval'|'sql_persist'|'sql_auth'|'sql_guard'|'sql_manifest'|'sql_transaction'|'sql_context'|'sql_other';
type Metric=Record<string,number>;
export interface LatencySpan {id:number;parent:number|null;stage:Stage;start_ms:number;duration_ms:number;outcome:'ok'|'error';endpoint?:string;status?:number;metrics?:Metric;}
export interface LatencyTrace {qid:string;kind:'message'|'progress';started_at:string;server_ms:number;status:number;spans:LatencySpan[];}
interface Working {qid:string;kind:'message'|'progress';started_at:string;start:number;spans:LatencySpan[];next:number;finished:boolean;}
type Context={trace:Working;parent:number|null};
type Callable=(this:unknown,...args:unknown[])=>unknown;
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object';
const rounded=(n:number)=>Math.round(n*1000)/1000;
export function sqlStage(value:unknown):Stage {
 const text=typeof value==='string'?value:record(value)&&typeof value.text==='string'?value.text:'';
 // A privilege guard can name the retrieval RPC inside to_regprocedure; it is not the RPC.
 if(/pg_proc|pg_roles|has_function_privilege|has_any_column_privilege/i.test(text))return 'sql_guard';
 if(/\b(?:retrieve_ccd_knowledge_chunks|retrieve_document_chunks|search_chunks_cosine)\s*\(/i.test(text))return 'sql_retrieval';
 if(/\b(?:persist_unified_turn|persist_turn)\s*\(/i.test(text))return 'sql_persist';
 if(/\bresource_context\s*\(/i.test(text))return 'sql_auth';
 if(/SELECT\s+manifest\b|manifest->/i.test(text))return 'sql_manifest';
 if(/^\s*(?:BEGIN|COMMIT|ROLLBACK)\b/i.test(text))return 'sql_transaction';
 if(/current_retrieval_context|embedding_configs|expected_next_ordinal|current_release/i.test(text))return 'sql_context';
 return 'sql_other';
}
export function ollamaEndpoint(input:unknown):string|null {
 let url:URL;try{url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input instanceof Request?input.url:'');}catch{return null;}
 return ['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.port==='11434'&&
 ['/api/version','/api/tags','/api/show','/api/embed','/api/chat'].includes(url.pathname)?url.pathname:null;
}
export function numericOllamaMetrics(body:unknown):Metric {
 if(!record(body))return {};
 const out:Metric={};
 for(const key of ['total_duration','load_duration','prompt_eval_duration','eval_duration']){
  const v=body[key];if(typeof v==='number'&&Number.isFinite(v)&&v>=0)out[key+'_ms']=rounded(v/1e6);
 }
 for(const key of ['prompt_eval_count','eval_count']){
  const v=body[key];if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)out[key]=v;
 }
 return out;
}
export function createObserver(emit:(trace:LatencyTrace)=>void,clock:()=>number=()=>performance.now()){
 const als=new AsyncLocalStorage<Context>();
 const begin=(stage:Stage)=>{
  const ctx=als.getStore();if(!ctx)return null;
  return {ctx,start:clock(),id:++ctx.trace.next,stage,ended:false};
 };
 type Open=ReturnType<typeof begin>;
 const end=(open:Open,outcome:'ok'|'error',extra:Partial<Pick<LatencySpan,'endpoint'|'status'|'metrics'>>={})=>{
  if(!open||open.ended)return;open.ended=true;
  open.ctx.trace.spans.push({id:open.id,parent:open.ctx.parent,stage:open.stage,start_ms:rounded(open.start-open.ctx.trace.start),
   duration_ms:rounded(clock()-open.start),outcome,...extra});
 };
 const context=<T,>(open:Open,fn:()=>T):T=>open?als.run({trace:open.ctx.trace,parent:open.id},fn):fn();
 const measure=(stage:Stage,fn:()=>unknown)=>{
  const open=begin(stage);if(!open)return fn();
  return context(open,()=>{
   try{
    const result=fn();
    if(record(result)&&typeof result.then==='function')return Promise.resolve(result).then(v=>{end(open,'ok');return v;},e=>{end(open,'error');throw e;});
    end(open,'ok');return result;
   }catch(e){end(open,'error');throw e;}
  });
 };
 return {
  begin,end,context,measure,active:()=>als.getStore()!==undefined,
  request<T>(qid:string,kind:'message'|'progress',fn:(finish:(status:number)=>void)=>T):T {
   const trace:Working={qid,kind,started_at:new Date().toISOString(),start:clock(),spans:[],next:0,finished:false};
   return als.run({trace,parent:null},()=>fn(status=>{
    if(trace.finished)return;trace.finished=true;
    try{emit({qid,kind,started_at:trace.started_at,server_ms:rounded(clock()-trace.start),status,spans:trace.spans});}catch{/* Observation must not change a response. */}
   }));
  },
 };
}
export type Observer=ReturnType<typeof createObserver>;
export function wrapMethod(target:object,key:string,stage:Stage,observer:Observer):()=>void {
 const original=Reflect.get(target,key) as unknown;if(typeof original!=='function')throw new Error('observer_method_missing');
 Reflect.set(target,key,function(this:unknown,...args:unknown[]){return observer.measure(stage,()=>Reflect.apply(original,this,args));});
 return ()=>{Reflect.set(target,key,original);};
}
export function wrapSql(target:object,observer:Observer):()=>void {
 const original=Reflect.get(target,'query') as unknown;if(typeof original!=='function')throw new Error('observer_query_missing');
 Reflect.set(target,'query',function(this:unknown,...args:unknown[]){
  const open=observer.begin(sqlStage(args[0]));if(!open)return Reflect.apply(original,this,args);
  const callback=args.at(-1);
  if(typeof callback==='function'){
   args[args.length-1]=function(this:unknown,...values:unknown[]){observer.end(open,values[0]?'error':'ok');return Reflect.apply(callback,this,values);};
  }
  return observer.context(open,()=>{
   try{
    const result=Reflect.apply(original,this,args) as unknown;
    if(record(result)&&typeof result.then==='function')return Promise.resolve(result).then(v=>{observer.end(open,'ok');return v;},e=>{observer.end(open,'error');throw e;});
    if(typeof callback!=='function'&&record(result)&&typeof result.once==='function'){
     Reflect.apply(result.once,result,['end',()=>observer.end(open,'ok')]);Reflect.apply(result.once,result,['error',()=>observer.end(open,'error')]);
    }else if(typeof callback!=='function')observer.end(open,'ok');
    return result;
   }catch(e){observer.end(open,'error');throw e;}
  });
 });
 return ()=>{Reflect.set(target,'query',original);};
}
export function observedFetch(original:typeof fetch,observer:Observer):typeof fetch {
 return async(input,init)=>{
  const endpoint=ollamaEndpoint(input);
  if(!endpoint||!observer.active())return original(input,init);
  const open=observer.begin('ollama_http');
  try{
   const response=await observer.context(open,()=>original(input,init));
   const nativeJson=response.json;
   Reflect.set(response,'json',async function(this:Response){
    try{
     const body:unknown=await Reflect.apply(nativeJson,this,[]);
     observer.end(open,'ok',{endpoint,status:response.status,metrics:numericOllamaMetrics(body)});
     return body;
    }catch(e){observer.end(open,'error',{endpoint,status:response.status});throw e;}
   });
   return response;
  }catch(e){observer.end(open,'error',{endpoint});throw e;}
 };
}
export async function installObserver(output:string,run:string):Promise<void>{
 if(!/^[a-f0-9-]{36}$/.test(run)||!process.env.LOCALAPPDATA)throw new Error('observer_scope_rejected');
 const base=await realpath(resolve(process.env.LOCALAPPDATA,'BanuChat/diagnostics/OE1-OE6-LATENCY-DIAG-01'));
 const dir=await realpath(resolve(output,'..'));const r=relative(base,dir);
 if(!r||r.startsWith('..')||isAbsolute(r)||basename(output)!=='trace.jsonl')throw new Error('observer_output_rejected');
 const sink=createWriteStream(output,{flags:'wx'});let sinkFailed=false;
 sink.on('error',()=>{sinkFailed=true;process.stderr.write('{"event":"latency_observer_sink_failed"}\n');});
 const observer=createObserver(trace=>{if(!sinkFailed)sink.write(JSON.stringify(trace)+'\n');});
 const oldEmit=Server.prototype.emit;
 Reflect.set(Server.prototype,'emit',function(this:Server,event:string,...args:unknown[]){
  if(event!=='request')return Reflect.apply(oldEmit,this,[event,...args]);
  const req=args[0] as IncomingMessage,res=args[1] as ServerResponse;
  const ua=req.headers['user-agent'],prefix='BanuChat-Latency/'+run+'/';
  const qid=typeof ua==='string'&&ua.startsWith(prefix)?ua.slice(prefix.length):'';
  const kind=req.method==='POST'&&/^\/api\/v2\/conversations\/[a-f0-9-]{36}\/messages$/.test(req.url??'')?'message':
   req.method==='GET'&&req.url==='/api/v2/me/progress'?'progress':null;
  if(!kind||!/^(?:D[1-6]|C[12])$/.test(qid))return Reflect.apply(oldEmit,this,[event,...args]);
  return observer.request(qid,kind,finish=>{
   res.once('finish',()=>finish(res.statusCode));res.once('close',()=>finish(res.writableFinished?res.statusCode:0));
   return Reflect.apply(oldEmit,this,[event,...args]);
  });
 });
 wrapSql(pg.Client.prototype,observer);
 wrapMethod(OllamaQueryEmbeddingClient.prototype,'embedQuery','embedding',observer);
 wrapMethod(OllamaQueryEmbeddingClient.prototype,'verifyRuntime','embedding_verify',observer);
 wrapMethod(OllamaGeneratorClient.prototype,'generate','generator',observer);
 wrapMethod(OllamaGeneratorClient.prototype,'verifyRuntime','generator_verify',observer);
 wrapMethod(AuthenticatedResources.prototype,'send','use_case',observer);
 const router=await loadDefaultIntentRouter();wrapMethod(router,'route','router',observer);
 globalThis.fetch=observedFetch(globalThis.fetch,observer);
 process.stdout.write('{"event":"latency_observer_ready"}\n');
}
if(process.env.BANUCHAT_LATENCY_OUTPUT&&process.env.BANUCHAT_LATENCY_RUN){
 await installObserver(process.env.BANUCHAT_LATENCY_OUTPUT,process.env.BANUCHAT_LATENCY_RUN);
}
