/** Opt-in, local evaluation only. No ingestion, production edits, POST retry or parameter tuning. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {connectCcdLocal} from '../../backend/rag/src/ccd/local-runtime.js';
import {assertCcdChatDatabase} from '../../backend/api/src/ccd-runtime.js';
import {createRuntimeApiServer} from '../../backend/api/src/main.js';
import {generateDocumentRagAnswer} from '../../backend/api/src/chat/document-rag.js';
import {resolveConversationQuery} from '../../backend/api/src/chat/conversation-context.js';
import {parseGroundedAnswer} from '../../backend/api/src/chat/document-evidence.js';
import {GeneratorClientError,loadGeneratorRuntimeConfig} from '../../backend/api/src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../../backend/api/src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
import {tracedGeneratorFetch,type ProviderEvent} from './ccd-generation-trace.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.join(root,'data/ccd/evidence/increment-5');await mkdir(out,{recursive:true});
const hash=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const scope=process.argv[2]??'all';assert.ok(['all','t11','reg','ia','missing'].includes(scope));
const runId=Date.now();const turns:any[]=[];const skipped:any[]=[];
const report:any={run_id:runId,started_at:new Date().toISOString(),scope,turns,skipped,production_parameters_changed:false,post_retries:0};
const {pool,identity}=await connectCcdLocal();report.identity=identity;
let server:Awaited<ReturnType<typeof createRuntimeApiServer>>|undefined;
let trace:any={};
const runtime=loadGeneratorRuntimeConfig();report.generator=runtime.generator;
const base='http://127.0.0.1:3003/api/v1';
function historySummary(messages:any[]){return {messages:messages.length,
 user_messages:messages.filter(m=>m.role==='user').length,
 ia_user_persisted:messages.some(m=>m.role==='user'&&/ia generativa/iu.test(m.content)),
 catalog_user_persisted:messages.some(m=>m.role==='user'&&/cursos.*competencias digitales/iu.test(m.content)),
 entries:messages.map(m=>({id:m.message_id,role:m.role,chars:m.content.length,content_sha256:hash(m.content),citations:m.citations?.map((c:any)=>c.locator)}))};}
async function capture(){
 const fixed:Record<string,unknown>={};
 for(const table of ['datasets','dataset_releases','documents','document_versions','document_chunks','embedding_configs','ccd_demo_contexts']){
  fixed[table]=(await pool.query(`SELECT banuchat.text_sha256(to_jsonb(t)::text) AS hash FROM banuchat.${table} t ORDER BY 1`)).rows;
 }
 const histories=(await pool.query(`SELECT c.id,banuchat.text_sha256(to_jsonb(c)::text) AS conversation_hash,
 (SELECT banuchat.text_sha256(coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.ordinal)::text,'null')) FROM banuchat.messages m WHERE m.conversation_id=c.id) AS messages_hash,
 (SELECT banuchat.text_sha256(coalesce(jsonb_agg(to_jsonb(mc) ORDER BY m.ordinal,mc.citation_index)::text,'null')) FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=c.id) AS citations_hash
 FROM banuchat.conversations c ORDER BY c.id`)).rows;
 const files:Record<string,string>={};
 async function scan(relative:string){for(const e of await readdir(path.join(root,relative),{withFileTypes:true})){const p=relative+'/'+e.name;if(e.isDirectory())await scan(p);else if(e.isFile())files[p]=hash(await readFile(path.join(root,p)));}}
 for(const p of ['data/ccd/local/m01-m12','data/ccd/local/expanded-v2','data/ccd/local/guidance-v3','data/ccd/schemas'])await scan(p);
 const previousReports:Record<string,string>={};for(const name of await readdir(out))if(name.endsWith('.json'))previousReports[name]=hash(await readFile(path.join(out,name)));
 return {fixed,histories,files,previousReports};
}
async function health(){try{
 const version=await(await fetch(runtime.base_url+'/api/version',{signal:AbortSignal.timeout(5000)})).json() as any;
 const ps=await(await fetch(runtime.base_url+'/api/ps',{signal:AbortSignal.timeout(5000)})).json() as any;
 return {version:version.version,models:ps.models?.map((m:any)=>({name:m.name,digest:m.digest,context_length:m.context_length,size_vram:m.size_vram}))};
}catch{return {available:false};}}
async function request(route:string,method='GET',body?:unknown){
 const response=await fetch(base+route,{method,signal:AbortSignal.timeout(180000),...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json() as any};
}
let before:Awaited<ReturnType<typeof capture>>|undefined;
try{
 await assertCcdChatDatabase(pool);before=await capture();report.before={histories:before.histories.length,fixed:before.fixed,files:before.files};
 report.health_before=await health();
 report.source_sha256=Object.fromEntries(await Promise.all([
  'eval/integration/ccd-generation-diagnostics.mts','eval/integration/ccd-generation-trace.mts',
  'eval/integration/ccd-guidance.mts','backend/api/src/generation/ollama-generator-client.ts',
  'backend/api/src/chat/document-rag.ts','backend/api/src/chat/conversation-context.ts',
 ].map(async p=>[p,hash(await readFile(path.join(root,p)))])));
 const embedder=new OllamaQueryEmbeddingClient(runtime.base_url);
 server=await createRuntimeApiServer(pool,async input=>{
  const start=performance.now();const resolved=resolveConversationQuery(input.query,input.history??[]);
  trace.rag_received_history=historySummary([...(input.history??[])]);
  trace.resolved_context={needs_clarification:resolved.needs_clarification,retrieval_chars:resolved.retrieval_query.length,history:historySummary(resolved.history)};
  try{return await generateDocumentRagAnswer({sql:pool,evidence_mode:'ccd_local',generator_config:runtime.generator,
   query_embedding_client:{async embedQuery(text,config){const t=performance.now();try{const vector=await embedder.embedQuery(text,config);trace.embedding={elapsed_ms:performance.now()-t,dimension:vector.length};return vector;}catch(error){trace.embedding={elapsed_ms:performance.now()-t,reason:(error as any)?.reason};throw error;}}},
   generator_client:{async generate(input,config){
    trace.retrieval_and_context_ms=performance.now()-start;
    const locators=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);
    trace.prompt={selected_locators:locators,fragments:locators.length,system_chars:input.system_prompt.length,user_chars:input.user_prompt.length,
     utf8_bytes:Buffer.byteLength(input.system_prompt+input.user_prompt),rough_tokens_chars_div_4:Math.ceil((input.system_prompt.length+input.user_prompt.length)/4),
     system_sha256:hash(input.system_prompt),user_sha256:hash(input.user_prompt)};
    const events:ProviderEvent[]=[];trace.provider_events=events;const t=performance.now();
    const client=new OllamaGeneratorClient(runtime.base_url,30000,tracedGeneratorFetch(events));
    try{const result=await client.generate(input,config);trace.generator_result={elapsed_ms:performance.now()-t,done_reason:result.done_reason,
      prompt_eval_count:result.prompt_eval_count,eval_count:result.eval_count,total_duration_ms:result.total_duration_ms,
      output_chars:result.content.length,source_protocol:result.content.trim()==='EVIDENCIA_INSUFICIENTE'?'insufficient_marker':parseGroundedAnswer(result.content,locators.length)?'valid':'invalid'};return result;
    }catch(error){trace.generator_failure={elapsed_ms:performance.now()-t,reason:error instanceof GeneratorClientError?error.reason:'unclassified'};throw error;}
   }},
  },input);}catch(error){const reason=(error as any)?.reason;trace.rag_failure={type:error instanceof Error?error.name:'unknown',...(typeof reason==='string'&&/^[a-z_]+$/.test(reason)?{reason}:{})};throw error;}
  finally{trace.rag_total_ms=performance.now()-start;}
 },undefined,{demo_mode:'ccd_local',document_artifact:{root:path.join(root,'data/ccd/local/m01-m12'),version_roots:{
  'bch03-m01-m12-local-1':path.join(root,'data/ccd/local/m01-m12'),'bch03-ccd-local-2':path.join(root,'data/ccd/local/expanded-v2'),'bch03-ccd-local-3':path.join(root,'data/ccd/local/guidance-v3')}}});
 await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(3003,'127.0.0.1',resolve);});
 const cases=[
  {id:'T11',scope:'t11',q:['Contacté al CCD, solicité y presenté las nuevas pruebas por primera vez sin costo. Otro estudiante en situación semejante también realizó la solicitud.','¿Puedo decirles a todos que tienen ese derecho?','¿Y si luego la repruebo?']},
  {id:'REG_VALID',scope:'reg',q:['¿Cuáles son los cursos de Competencias Digitales?','Háblame del de IA Generativa','¿Y qué temas tiene?','Corrijo: me refiero a Marca Personal, ¿qué temas aborda?','Cambiando de tema, ¿cuánto duran las pruebas diagnósticas de 202660?','Ahora quiero el contacto del CCD']},
  {id:'IA_VALID',scope:'ia',q:['Háblame del curso de IA Generativa','¿Y qué temas tiene?']},
  {id:'NO_ANTECEDENT',scope:'missing',q:['¿Y qué temas tiene?']},
  {id:'CATALOG_ONLY',scope:'missing',q:['¿Cuáles son los cursos de Competencias Digitales?','¿Y qué temas tiene?']},
 ].filter(c=>scope==='all'||c.scope===scope);
 report.plan=cases;
 for(const scenario of cases){
  const creation=await request('/conversations','POST',{profile_key:'ccd-local-demo'});assert.equal(creation.status,201);
  const id=creation.body.conversation_id as string;
  for(const [index,question] of scenario.q.entries()){
   const prior=await request(`/conversations/${id}`);assert.equal(prior.status,200);
   const priorSummary=historySummary(prior.body.messages);
   if((scenario.id==='REG_VALID'&&index===2)||(scenario.id==='IA_VALID'&&index===1))assert.equal(priorSummary.ia_user_persisted,true);
   if(scenario.id==='CATALOG_ONLY')assert.equal(priorSummary.ia_user_persisted,false);
   trace={};const start=performance.now();let result:any;
   try{result=await request(`/conversations/${id}/messages`,'POST',{content:question});}
   catch(error){result={status:null,uncertain_transport:true,exception_name:error instanceof Error?error.name:'unknown'};}
   const after=await request(`/conversations/${id}`);
   const answer=result.body?.assistant_message;
   const turn={scenario:scenario.id,turn:index+1,conversation_id:id,question,persisted_before:priorSummary,elapsed_ms:performance.now()-start,...trace,
    result:{status:result.status,error_code:result.body?.error?.code,uncertain_transport:result.uncertain_transport,
     answer:answer?{message_id:answer.message_id,chars:answer.content.length,content_sha256:hash(answer.content),insufficient_evidence:answer.insufficient_evidence,
      clarification:/¿A qué curso, prueba o tema te refieres/u.test(answer.content),citations:answer.citations.map((c:any)=>({locator:c.locator,release_id:c.release_id,document_version_id:c.document_version_id}))}:undefined},
    persisted_after:after.status===200?historySummary(after.body.messages):{status:after.status}};
   turns.push(turn);
   console.log(JSON.stringify({case:scenario.id,turn:index+1,status:result.status,reason:trace.generator_failure?.reason,fragments:trace.prompt?.fragments,prompt_bytes:trace.prompt?.utf8_bytes,clarification:turn.result.answer?.clarification}));
   if(result.status!==201){for(const [later,q] of scenario.q.entries())if(later>index)skipped.push({scenario:scenario.id,turn:later+1,question:q,status:'not_evaluable',because:`previous turn ${index+1} did not complete`,conversation_id:id});break;}
  }
 }
 report.health_after=await health();
 report.completed=true;
}catch(error){report.completed=false;report.fatal_type=error instanceof Error?error.name:'unknown';process.exitCode=1;}
finally{
 if(server?.listening)await new Promise<void>(resolve=>server!.close(()=>resolve()));
 if(before){try{const after=await capture();assert.deepEqual(after.fixed,before.fixed);assert.deepEqual(after.files,before.files);
  assert.deepEqual(after.histories.filter(h=>before!.histories.some(b=>b.id===h.id)),before.histories);
  for(const [name,digest]of Object.entries(before.previousReports))assert.equal(after.previousReports[name],digest);
  const created=[...new Set(turns.map(t=>t.conversation_id))];assert.deepEqual(after.histories.filter(h=>!before!.histories.some(b=>b.id===h.id)).map(h=>h.id).sort(),created.sort());
  report.integrity={passed:true,previous_histories_unchanged:before.histories.length,new_histories:created.length,local_files_unchanged:Object.keys(before.files).length,previous_evidence_unchanged:Object.keys(before.previousReports).length};
 }catch{report.integrity={passed:false};process.exitCode=1;}}
 await pool.end();report.finished_at=new Date().toISOString();const name=`diagnostics-52-${runId}.json`;
 await writeFile(path.join(out,name),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({evidence:name,completed:report.completed,attempted:turns.length,http_failures:turns.filter(t=>t.result.status!==201).length,not_evaluable:skipped.length,integrity:report.integrity}));
}
