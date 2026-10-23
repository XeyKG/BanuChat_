import assert from 'node:assert/strict';
import test from 'node:test';
import {retrieveAuthenticatedDocumentChunks,assertAuthenticatedDocumentReads} from '../src/application/authenticated-document-retrieval.js';
import {DocumentRetrievalError} from '../src/application/document-retrieval-errors.js';
import {createAuthenticatedDocumentRag} from '../src/authenticated-runtime.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
const release='11111111-1111-4111-8111-111111111111';
const vector=[1,...Array<number>(1023).fill(0)];
const input={release_id:release,query_embedding:vector,top_k:5};
const row={chunk_id:'22222222-2222-4222-8222-222222222222',document_version_id:'33333333-3333-4333-8333-333333333333',document_id:'44444444-4444-4444-8444-444444444444',document_key:'fixture',title:'Documento ficticio',ordinal:0,content:'Describir la observación sin datos privados.',chunk_locator:'section:1',page_start:null,page_end:null,source_path:'documents/fixture.md',source_locator:'document:fixture',source_sha256:'a'.repeat(64),release_id:release,cosine_distance:0.1};
test('authenticated adapter reuses vector/release/top-k validation before SQL',async()=>{
 let calls=0;const sql:SqlQueryClient={async query<T>(){calls++;return{rows:[] as T[]};}};
 for(const candidate of [{...input,release_id:'bad'},{...input,query_embedding:[0,0]},{...input,query_embedding:vector.map(()=>0)},{...input,query_embedding:[NaN,...vector.slice(1)]},{...input,top_k:21}])await assert.rejects(retrieveAuthenticatedDocumentChunks(sql,candidate),DocumentRetrievalError);
 assert.equal(calls,0);
});
test('authenticated adapter binds only the fixed SQL function and preserves all normalized citation fields',async()=>{
 const sql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){assert.equal(text,'SELECT * FROM banuchat_auth.retrieve_document_chunks($1::uuid,$2::public.vector,$3::integer)');assert.deepEqual(values,[release,JSON.stringify(vector),5]);return{rows:[row] as T[]};}};
 assert.deepEqual(await retrieveAuthenticatedDocumentChunks(sql,input),[{...row,cosine_similarity:0.9}]);
});
test('authenticated adapter rejects invalid database rows with the existing normalizer',async()=>{
 for(const change of [{release_id:'55555555-5555-4555-8555-555555555555'},{source_sha256:'bad'},{chunk_locator:''},{cosine_distance:NaN}]){
  const sql:SqlQueryClient={async query<T>(){return{rows:[{...row,...change}] as T[]};}};
  await assert.rejects(retrieveAuthenticatedDocumentChunks(sql,input),e=>e instanceof DocumentRetrievalError&&e.reason==='invalid_database_result');
 }
});
test('authenticated adapter maps release/argument errors and preserves authorization/dependency errors',async()=>{
 for(const [code,reason] of [['P0409','release_not_available'],['P0400','invalid_argument']] as const){
  const sql:SqlQueryClient={async query(){throw{code};}};await assert.rejects(retrieveAuthenticatedDocumentChunks(sql,input),e=>e instanceof DocumentRetrievalError&&e.reason===reason);
 }
 for(const code of ['P0403','P0500','42501','ECONNRESET']){const original={code};const sql:SqlQueryClient={async query(){throw original;}};await assert.rejects(retrieveAuthenticatedDocumentChunks(sql,input),e=>e===original);}
});
test('authenticated product fails closed without the migration',async()=>{
 const sql:SqlQueryClient={async query<T>(){return{rows:[{available:false}] as T[]};}};
 await assert.rejects(assertAuthenticatedDocumentReads(sql),/AUTHENTICATED_DOCUMENT_READS_UNAVAILABLE/u);
});
test('trusted authenticated composition reaches the injected function, original generator and citation builder',async()=>{
 const calls:string[]=[];let embedded=0,generated=0;
 const sql:SqlQueryClient={async query<T>(text:string){calls.push(text);return{rows:(text.includes('pg_catalog.pg_proc')?[{available:true}]:text.includes('embedding_configs')?[{provider:'ollama',model:'qwen3-embedding:0.6b',model_revision:'b'.repeat(64),dimension:1024,distance_metric:'cosine',parameters:{runtime_version:'0.35.0',query:{dimensions:1024,truncate:false,input_prefix:null,normalization:'none',options:{num_ctx:4096}}}}]:[row]) as T[]};}};
 const responder=await createAuthenticatedDocumentRag({sql,query_embedding_client:{async embedQuery(){embedded++;return vector;}},generator_client:{async generate(prompt){generated++;assert.match(prompt.system_prompt,/evidencia sintética/u);assert.match(prompt.user_prompt,/Describir la observación/u);return{content:'Describe la observación sin compartir datos privados.',done_reason:'stop',prompt_eval_count:10,eval_count:8,total_duration_ms:1};}},generator_config:{provider:'ollama',model:'qwen3:4b-instruct',model_revision:'c'.repeat(64),runtime_version:'0.35.0',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}}});
 const result=await responder({release_id:release,query:'¿Cómo describo una incidencia técnica?'});
 assert.equal(embedded,1);assert.equal(generated,1);assert.equal(result.citation_records[0]?.source_sha256,row.source_sha256);assert.equal(result.citation_records[0]?.source_locator,row.chunk_locator);assert.equal(result.release_id,release);assert.equal(result.citations.length,1);
 assert.ok(calls.some(c=>c.includes('banuchat_auth.retrieve_document_chunks')));assert.ok(calls.every(c=>!c.includes('FROM banuchat.document_chunks')));
});
