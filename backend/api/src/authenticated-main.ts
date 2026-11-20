import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createAuthenticatedRuntimeServer,createAuthenticatedDocumentRag} from './authenticated-runtime.js';
import {PgSqlClient} from './data/pg-client.js';
import {loadGeneratorRuntimeConfig} from './generation/generator-client.js';
import {OllamaGeneratorClient} from './generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from './retrieval/ollama-query-embedding-client.js';
import {knowledgeMode} from './auth/knowledge-mode.js';
import {loadN8nConversationRuntimeConfig,N8nConversationOrchestrator} from './orchestration/n8n-conversation.js';
import {publishedOe2Reader} from './operations/oe2-published-reader.js';
import {loadLocalOe2Reader} from './operations/oe2-local-reader.js';
import {createApprovedReferences} from './chat/approved-references.js';
import type {ManagedMcpRuntime} from './agent/managed-mcp-agent.js';

/** Static CCD artifact allowlist shared by normal startup and focused checks. */
export function ccdArtifactStorage(){
 return {root:fileURLToPath(new URL('../../../data/ccd/local/m01-m12/',import.meta.url)),version_roots:{
  'bch03-m01-m12-local-1':fileURLToPath(new URL('../../../data/ccd/local/m01-m12/',import.meta.url)),
  'bch03-ccd-local-2':fileURLToPath(new URL('../../../data/ccd/local/expanded-v2/',import.meta.url)),
  'bch03-ccd-local-3':fileURLToPath(new URL('../../../data/ccd/local/guidance-v3/',import.meta.url)),
  'bch-ccd-knowledge-1':fileURLToPath(new URL('../../../data/ccd/local/product-knowledge-v1/',import.meta.url)),
  'bch-ccd-knowledge-2':fileURLToPath(new URL('../../../data/ccd/local/product-knowledge-v2/',import.meta.url))}};
}

/** v2 listens on loopback in both database profiles. */
export async function startAuthenticatedApi(){
 let pool:Pool|undefined;
 try{
  const requireValue=(name:string)=>{const v=process.env[name];if(!v)throw new Error();return v;};
  const database=requireValue('BANUCHAT_AUTH_DATABASE'),deploymentId=requireValue('BANUCHAT_AUTH_DEPLOYMENT'),key=requireValue('BANUCHAT_AUTH_RATE_KEY');
  const mode=knowledgeMode(process.env.BANUCHAT_AUTH_EVIDENCE_MODE);
  const unified=process.env.BANUCHAT_AUTH_PRODUCT==='unified';
  const profile=process.env.BANUCHAT_AUTH_POSTGRES_PROFILE??'local';
  if(profile!=='local'&&profile!=='managed')throw new Error();
  const dbPort=Number(requireValue('BANUCHAT_AUTH_DB_PORT')),port=Number(process.env.BANUCHAT_AUTH_API_PORT??'3002');
  if(!/^[a-f0-9]{64}$/iu.test(key)||(mode==='synthetic'?/ccd/iu.test(database):database!==(unified?'banuchat_unified':'banuchat_ccd_auth_i1b_test'))||![dbPort,port].every(v=>Number.isInteger(v)&&v>=1024&&v<=65535))throw new Error();
  const user=requireValue('BANUCHAT_AUTH_RUNTIME_USER');
  let host='127.0.0.1';
  let ssl:{ca:string;rejectUnauthorized:true;servername:string}|undefined;
  if(profile==='managed'){
   if(mode!=='synthetic'||unified||database!=='postgres'||dbPort!==5432)throw new Error();
   const project=requireValue('BANUCHAT_AUTH_DB_PROJECT_REF');
   host=requireValue('BANUCHAT_AUTH_DB_HOST');
   const direct=host===`db.${project}.supabase.co`;
   const session=/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/u.test(host)&&user.endsWith('.'+project);
   if(!/^[a-z0-9]{20}$/u.test(project)||(!direct&&!session))throw new Error();
   ssl={ca:await readFile(requireValue('BANUCHAT_AUTH_DB_CA_FILE'),'utf8'),rejectUnauthorized:true,servername:host};
  }else if([5432,55433].includes(dbPort))throw new Error();
  pool=new Pool({host,port:dbPort,database,user,password:requireValue('BANUCHAT_AUTH_RUNTIME_PASSWORD'),...(ssl?{ssl}:{}),connectionTimeoutMillis:5000,statement_timeout:15000});
  pool.on('error',()=>console.error('BanuChat: dependencia de persistencia no disponible.'));
  const runtime=loadGeneratorRuntimeConfig(),sql=new PgSqlClient(pool);
  const generationTimeout = profile === 'managed' && process.env.BANUCHAT_GENERATOR_TIMEOUT_MS !== undefined
   ? Number(requireValue('BANUCHAT_GENERATOR_TIMEOUT_MS'))
   : undefined;
  const cpuThreads = profile === 'managed' && process.env.BANUCHAT_GENERATOR_CPU_THREADS !== undefined
   ? Number(requireValue('BANUCHAT_GENERATOR_CPU_THREADS'))
   : undefined;
  const generator=new OllamaGeneratorClient(runtime.base_url,generationTimeout,fetch,cpuThreads),embedding=new OllamaQueryEmbeddingClient(runtime.base_url);
  const ragInput={sql,query_embedding_client:embedding,generator_client:generator,generator_config:runtime.generator};
  const referenceId=process.env.BANUCHAT_APPROVED_REFERENCE_RELEASE;
  if(referenceId&&(mode!=='synthetic'||unified))throw new Error();
  const references=referenceId?await createApprovedReferences(ragInput,referenceId,process.env.BANUCHAT_APPROVED_REFERENCE_MANIFEST_SHA256):undefined;
  const documentRag=await createAuthenticatedDocumentRag(ragInput,mode);
  const artifacts=mode==='ccd_local'?ccdArtifactStorage():
   {root:process.env.BANUCHAT_AUTH_ARTIFACT_ROOT??fileURLToPath(new URL('../../../data/synthetic/',import.meta.url))};
  const n8n=unified?loadN8nConversationRuntimeConfig():undefined;
  const oe2=unified?await loadLocalOe2Reader(new URL('../../../infra/local/unified/oe2-reader.json',import.meta.url)):publishedOe2Reader(process.env.BANUCHAT_OE2_PUBLICATION_FILE,process.env.BANUCHAT_OE2_PUBLICATION_SHA256);
  const mcp=unified?Object.fromEntries(['MCP_POSTGRES_DB','MCP_POSTGRES_USER','MCP_POSTGRES_PASSWORD','MCP_POSTGRES_PORT','BANUCHAT_OLLAMA_BASE_URL'].map(k=>[k,requireValue(k)])):undefined;
  const agentMode=process.env.BANUCHAT_AUTH_AGENT;
  if(agentMode!==undefined&&agentMode!=='managed_mcp')throw new Error();
  let managedAgent:ManagedMcpRuntime|undefined;
  if(agentMode==='managed_mcp'){
   if(profile!=='managed'||unified||mode!=='synthetic'||host!=='aws-0-us-west-2.pooler.supabase.com')throw new Error();
   const config=loadN8nConversationRuntimeConfig();if(!config)throw new Error();
   managedAgent={deployment_id:deploymentId,environment:{
    MCP_POSTGRES_DB:database,MCP_POSTGRES_HOST:host,MCP_POSTGRES_PORT:String(dbPort),
    MCP_PROJECT_REF:requireValue('BANUCHAT_AUTH_DB_PROJECT_REF'),
    MCP_POSTGRES_USER:`cloud_mcp_reader.${requireValue('BANUCHAT_AUTH_DB_PROJECT_REF')}`,
    MCP_POSTGRES_PASSWORD:requireValue('BANUCHAT_MCP_READER_PASSWORD'),MCP_SSLMODE:'verify-full',
    MCP_POSTGRES_CA_FILE:requireValue('BANUCHAT_AUTH_DB_CA_FILE'),BANUCHAT_OLLAMA_BASE_URL:runtime.base_url
   },orchestrator:new N8nConversationOrchestrator({...config,trace:r=>console.log(JSON.stringify({event:'managed_n8n',operation_id:r.operation_id,workflow:r.workflow,state:r.state,release_id:r.release_id}))}),
   trace:({operation_id,trace})=>console.log(JSON.stringify({event:'managed_agent',operation_id,
    selected_tools:trace.selected_tools,call_count:trace.call_count,terminal_reason:trace.terminal_reason}))};
  }
  const server=await createAuthenticatedRuntimeServer({pool,expectedDatabase:database,deploymentId,rateKey:Buffer.from(key,'hex'),evidence_mode:mode,unified,postgres_profile:profile,
   ...(managedAgent?{managed_agent:managedAgent}:{}),
   ...(oe2?{oe2_reader:oe2}:{}),...(mcp?{mcp_environment:mcp}:{}),...(n8n?{orchestrator:new N8nConversationOrchestrator({...n8n,trace:r=>console.log(JSON.stringify({event:'unified_n8n',operation_id:r.operation_id,workflow:r.workflow,state:r.state,release_id:r.release_id}))})}:{}),
   ...(references?{references}:{}),document_rag:references?query=>references.respond(query,documentRag):documentRag,artifacts});
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await pool?.end();};
  process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
  console.log('BanuChat v2 iniciado exclusivamente en loopback; recuperación suspendida.');
 }catch{await pool?.end().catch(()=>{});console.error('No se pudo iniciar BanuChat v2 con la configuración autorizada.');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void startAuthenticatedApi();
