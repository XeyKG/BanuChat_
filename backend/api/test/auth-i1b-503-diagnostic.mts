/** Diagnostic only. No product changes, original databases, raw errors, text, vectors or secrets in output. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {environment,root,evidence} from './auth-i1b/environment.js';
import {validateQueryEmbeddingConfig} from '../src/application/document-query-retrieval.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
const phase=process.argv[2]??'preflight';assert.equal(phase,'preflight');
const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
const common={host:'127.0.0.1',port:e.port,database:e.database,connectionTimeoutMillis:5000,statement_timeout:15000,options:'-c default_transaction_read_only=on'};
const admin=new Pool({...common,user:e.admin,password:e.adminPassword}),runtime=new Pool({...common,user:e.runtime,password:e.runtimePassword});
try{
 const scope=(await admin.query('SELECT database_name,evidence_mode,dataset_name FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0];assert.equal(scope.database_name,e.database);assert.equal(scope.evidence_mode,'ccd_local');
 await new PgAuthStore(runtime).assertRuntime(e.database,'ccd_local');
 const configs=(await runtime.query(`SELECT r.id AS release_id,r.status,d.current_release_id=r.id AS current,ec.provider,ec.model,ec.model_revision,ec.dimension,ec.distance_metric,ec.parameters FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.dataset_id=d.id JOIN banuchat.embedding_configs ec ON ec.id=r.embedding_config_id ORDER BY r.id`)).rows;
 const current=configs.find(r=>r.current);assert.ok(current);const embedding=validateQueryEmbeddingConfig(current);
 const metadata=async(path:string,body?:unknown)=>{const r=await fetch('http://127.0.0.1:11434'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);return await r.json() as any;};
 const version=await metadata('/api/version'),tags=await metadata('/api/tags');
 const expected=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
 const generator=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:expected.model,BANUCHAT_GENERATOR_MODEL_REVISION:expected.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:expected.runtime_version}).generator;
 const models=[];
 for(const name of [embedding.model,generator.model]){
  const tag=tags.models.find((m:any)=>m.name===name||m.model===name);assert.ok(tag);const show=await metadata('/api/show',{model:name});const architecture=show.model_info?.['general.architecture'];
  models.push({name,digest:tag.digest,capabilities:show.capabilities,architecture,native_embedding_dimension:show.model_info?.[architecture+'.embedding_length'],native_context_length:show.model_info?.[architecture+'.context_length'],parameters:show.parameters});
 }
 const counts=(await admin.query(`SELECT r.id,d.current_release_id=r.id AS current,(SELECT count(*)::int FROM banuchat.document_versions v WHERE v.dataset_release_id=r.id) AS versions,(SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS chunks,(SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id AND c.embedding IS NOT NULL AND public.vector_dims(c.embedding)=1024) AS vectors_1024 FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id ORDER BY r.id`)).rows;
 const activity=(await admin.query(`SELECT count(*)::int AS connections,count(*) FILTER(WHERE state='idle in transaction')::int AS idle_in_transaction,count(*) FILTER(WHERE wait_event_type='Lock')::int AS waiting_locks FROM pg_stat_activity WHERE datname=current_database()`)).rows[0];
 const privileges=(await runtime.query("SELECT has_any_column_privilege('banuchat.document_chunks','SELECT') AS direct_chunk_select,has_function_privilege('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)','EXECUTE') AS retrieval_execute")).rows[0];
 const report={checkpoint:'BCH-05/CCD-AUTH-I1B/503 diagnosis',at:new Date().toISOString(),phase,database:e.database,host:'127.0.0.1',port:e.port,scope,runtime_guard:true,release_configurations:configs,embedding,ollama_version:version.version,models,generator,matching:{embedding_runtime:embedding.runtime_version===version.version,embedding_digest:embedding.model_revision===models[0]!.digest,embedding_dimension:embedding.dimension===models[0]!.native_embedding_dimension,generator_runtime:generator.runtime_version===version.version,generator_digest:generator.model_revision===models[1]!.digest},counts,activity,privileges,source_database_accessed:false,embedding_or_generation_executed:false};
 await evidence('503-preflight',report);console.log(JSON.stringify(report));
}finally{await Promise.all([admin,runtime].map(p=>p.end()));}
