/** One read-only RAG confirmation. No HTTP message POST, auth mutation, raw error, prompt or vector output. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {environment,root,evidence,fingerprint} from './auth-i1b/environment.js';
import {createAuthenticatedDocumentRag} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
const e=await environment();const preflight=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-preflight.json',root),'utf8'));
const first=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-reproduction.json',root),'utf8'));
const db=new Pool({host:'127.0.0.1',port:55443,database:e.database,user:e.runtime,password:e.runtimePassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B/503 diagnosis',started_at:new Date().toISOString(),mode:'ccd_local',database:e.database,sql_read_only:true,http_message_posts:0,provider:[]};
try{
 assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal((await db.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:preflight.generator.model,BANUCHAT_GENERATOR_MODEL_REVISION:preflight.generator.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:preflight.generator.runtime_version});
 const transport:typeof fetch=async(input,init)=>{
  const path=new URL(String(input)).pathname,response=await fetch(input,init);const event:any={path,status:response.status};
  if(path==='/api/chat'){
   const body=await response.clone().json() as any;
   if(typeof body.error==='string'){
    const message=body.error;event.error_sha256=createHash('sha256').update(message).digest('hex');
    event.controlled_signals={context:/context/iu.test(message),capacity:/size|length|window|capacity/iu.test(message),exceeded:/exceed|larger|too (?:long|large)|limit/iu.test(message)};
    event.error_category=Object.values(event.controlled_signals).every(v=>v===true)?'context_capacity_exceeded':'other_provider_rejection';
    event.token_counts=[...message.matchAll(/\b([0-9]+)\s+tokens?/giu)].map(m=>Number(m[1]));
    event.same_error_as_http_reproduction=event.error_sha256===first.cases[1].trace.find((v:any)=>v.path==='/api/chat').provider_error_sha256;
   }
  }
  report.provider.push(event);return response;
 };
 const client=new OllamaGeneratorClient(config.base_url,30000,transport);
 const rag=await createAuthenticatedDocumentRag({sql:new PgSqlClient(db),generator_config:config.generator,query_embedding_client:new OllamaQueryEmbeddingClient(config.base_url,120000,transport),
  generator_client:{async generate(input,expected){report.prompt_utf8_bytes=Buffer.byteLength(input.system_prompt+input.user_prompt);report.prompt_sha256=createHash('sha256').update(input.system_prompt+input.user_prompt).digest('hex');report.evidence_fragments=[...input.user_prompt.matchAll(/Localizador: /gu)].length;return client.generate(input,expected);}}},'ccd_local');
 try{await rag({release_id:preflight.release_configurations.find((r:any)=>r.current).release_id,query:'Describe el temario de Inteligencia Artificial Generativa.'});report.rag='completed';}
 catch(error){report.rag='rejected';const reason=(error as {reason?:string}).reason;report.reason=['invalid_generator_response','generator_runtime_mismatch','generator_unavailable','generator_response_incomplete'].includes(reason??'')?reason:'other';}
 const ps=await fetch('http://127.0.0.1:11434/api/ps',{signal:AbortSignal.timeout(5000)});const loaded=await ps.json() as any;
 report.loaded_models=loaded.models.map((m:any)=>({model:m.name,digest:m.digest,context_length:m.context_length}));
 report.same_prompt_as_http_reproduction=report.prompt_sha256===first.cases[1].trace.find((v:any)=>v.stage==='generation'&&v.event==='start').prompt_sha256;
 report.finished_at=new Date().toISOString();await evidence('503-confirmation',report);console.log(JSON.stringify(report));
}finally{await db.end();}
