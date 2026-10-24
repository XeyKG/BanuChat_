/** Read-only CCD development measurements. Capture uses a generator double; probe uses Ollama. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {environment,root,fingerprint} from './auth-i1b/environment.js';
import {contextCases} from './auth-i1b-f2/cases.js';
import {createAuthenticatedDocumentRag} from '../src/authenticated-runtime.js';
import {PgSqlClient} from '../src/data/pg-client.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {GeneratorClientError,loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
const phase=process.argv[2];assert.ok(phase==='capture'||phase==='probe');
const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
const common={host:'127.0.0.1',port:e.port,database:e.database,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000};
const admin=new Pool({...common,user:e.admin,password:e.adminPassword}),runtime=new Pool({...common,user:e.runtime,password:e.runtimePassword});
const report:any={checkpoint:'BCH-05/CCD-AUTH-I1B-F2 implementation',phase,at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim(),sql_read_only:true,http_message_posts:0,production_changed:true,cases:[],limitations:['Development bank, not reserved or independent academic evaluation','Bytes are NOT token counts','Capture does not generate answers']};
const captureStop=Symbol('capture');let trace:any;
try{
 assert.equal((await runtime.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 await new PgAuthStore(runtime).assertRuntime(e.database,'ccd_local');
 const before={corpus:await fingerprint(admin,true),history:await fingerprint(admin,true,true)};
 const release=(await runtime.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id;
 const expected=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
 const config=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:expected.model,BANUCHAT_GENERATOR_MODEL_REVISION:expected.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:expected.runtime_version});
 const transport:typeof fetch=async(input,init)=>{
  const response=await fetch(input,init);const path=new URL(String(input)).pathname;
  if(path==='/api/chat'){
   trace.provider_status=response.status;
   if(!response.ok){const body=await response.clone().json().catch(()=>null) as {error?:unknown}|null;
    const message=typeof body?.error==='string'?body.error:'';
    trace.provider_category=/context/iu.test(message)&&/size|length|window|capacity/iu.test(message)&&/exceed|larger|too (?:long|large)|limit/iu.test(message)?'context_capacity_exceeded':'other_provider_rejection';
    if(trace.provider_category==='context_capacity_exceeded')trace.provider_reported_tokens=[...message.matchAll(/\b([0-9]{1,8})\s+tokens?/giu)].map(m=>Number(m[1]));
   }
  }
  return response;
 };
 const client=new OllamaGeneratorClient(config.base_url,30000,transport);
 const rag=await createAuthenticatedDocumentRag({sql:new PgSqlClient(runtime),generator_config:config.generator,query_embedding_client:new OllamaQueryEmbeddingClient(config.base_url,120000,transport),generator_client:{async generate(input,recipe){
  trace.selected=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);trace.prompt_utf8_bytes=Buffer.byteLength(input.system_prompt+input.user_prompt);trace.prompt_sha256=createHash('sha256').update(input.system_prompt+input.user_prompt).digest('hex');
  if(phase==='capture')throw captureStop;
  trace.generation='REAL_OLLAMA_ATTEMPTED';const result=await client.generate(input,recipe);trace.prompt_eval_count=result.prompt_eval_count;trace.done_reason=result.done_reason;return result;
 }}},'ccd_local');
 const cases=phase==='capture'?contextCases:contextCases.filter(c=>['canonical','expanded','brand','interaction','content','wellbeing','law','analytics','paraphrase','broad_topics','unknown','two_courses','near_query_limit','long_history'].includes(c.id));
 if(phase==='probe')cases.push({id:'explicit_multi_capacity',query:'Compara IA Generativa, Marca Personal Digital, Interacción Digital, Creación de Contenidos Digitales, Cuidado y bienestar digital, Marco Legal Digital y Habilidades en Analítica Digital.',history:[],intent:'multiple'});
 for(const c of cases){
  trace={id:c.id,intent:c.intent,query_chars:Array.from(c.query).length,generation:phase==='capture'?'NOT_EXECUTED':'NOT_STARTED'};
  try{const answer=await rag({release_id:release,query:c.query,history:c.history});trace.outcome='completed';trace.citations=answer.citations.map(c=>c.locator);trace.insufficient_evidence=answer.insufficient_evidence;trace.generation=trace.done_reason?'REAL_OLLAMA':'NOT_EXECUTED';}
  catch(error){if(error===captureStop){trace.outcome='prompt_captured';trace.generation='DOUBLE_CAPTURE_ONLY';}else{trace.outcome='rejected';trace.reason=error instanceof GeneratorClientError?error.reason:'dependency_or_invariant';}}
  if(c.expected&&trace.selected)trace.selection_matches_expected=JSON.stringify([...trace.selected].sort())===JSON.stringify([...c.expected].sort());
  report.cases.push(trace);console.log(JSON.stringify(trace));
 }
 const ps=await fetch(config.base_url+'/api/ps',{signal:AbortSignal.timeout(5000),redirect:'error'});if(ps.ok){const body=await ps.json() as any;const model=body.models?.find((m:any)=>m.name===config.generator.model);report.loaded_generator_context=Number.isSafeInteger(model?.context_length)?model.context_length:null;}
 report.integrity={corpus_unchanged:before.corpus===await fingerprint(admin,true),history_unchanged:before.history===await fingerprint(admin,true,true),corpus_sha256:before.corpus};assert.equal(report.integrity.corpus_unchanged,true);assert.equal(report.integrity.history_unchanged,true);
 report.generator=config.generator;
}catch{report.failure='PREFLIGHT_OR_AUDIT_FAILED';process.exitCode=1;}
finally{await Promise.all([admin.end(),runtime.end()]);const path=new URL(`eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-${phase}-${Date.now()}.json`,root);await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({report:path.pathname.split('/').at(-1),integrity:report.integrity,failure:report.failure??null}));}
