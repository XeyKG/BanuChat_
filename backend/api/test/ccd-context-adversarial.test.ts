import assert from 'node:assert/strict';
import test from 'node:test';
import {contextCases} from './auth-i1b-f2/cases.js';
import {selectCcdEvidence} from '../src/chat/document-evidence.js';
import {resolveConversationQuery,isCcdCourseCatalogQuery} from '../src/chat/conversation-context.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
import {GeneratorClientError,type GeneratorConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
// Metadata fixtures for the twelve admitted units; no invented document contents.
const chunks=[['IA Generativa','M02:DOC-101'],['Marca Personal Digital','M02:DOC-103'],
 ['Interacción Digital','M02:DOC-102'],['Creación de Contenidos Digitales','M02:DOC-099'],
 ['Cuidado y bienestar digital','M02:DOC-100'],['Marco Legal Digital','M02:DOC-104'],
 ['Habilidades en Analítica Digital','M02:DOC-098'],['','M01'],['','M12'],['','TEST_ORIENTATION'],['','U03'],['','U04']]
 .map(([title,locator])=>({title,chunk_locator:'unit:'+locator} as RetrievedDocumentChunk));
for(const c of contextCases.filter(c=>c.expected))test('F2 deterministic '+c.id,()=>{
 const resolved=resolveConversationQuery(c.query,c.history);
 const selected=resolved.needs_clarification?[]:selectCcdEvidence(chunks,c.query,resolved.history).map(x=>x.chunk_locator).sort();
 assert.deepEqual(selected,[...c.expected!].sort());
 assert.ok(Array.from(resolved.retrieval_query).length<=4000);
 assert.ok(resolved.history.length<=8);
 assert.ok(resolved.history.reduce((n,m)=>n+Array.from(m.content).length,0)<=6000);
});
test('F2 characterizes unresolved fallback; ten fragments are NOT proof of relevance',()=>{
 for(const id of ['paraphrase','broad_topics','unknown']){
  const c=contextCases.find(c=>c.id===id)!;
  assert.equal(selectCcdEvidence(chunks,c.query,[]).length,10);
 }
 assert.equal(isCcdCourseCatalogQuery(contextCases.find(c=>c.id==='catalog')!.query),true);
});
test('F2 mocks distinguish no exact token counting and retained provider rejection mapping',async()=>{
 const config:GeneratorConfig={provider:'ollama',model:'qwen3:4b-instruct',model_revision:'a'.repeat(64),runtime_version:'0.35.0',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}};
 for(const body of [{error:'input exceeds context length'}, {error:'invalid model input'}, {private:'SENSITIVE_SENTINEL'}]){
  let posts=0;
  const transport:typeof fetch=async input=>{
   const path=new URL(String(input)).pathname;
   if(path==='/api/chat'){posts++;return Response.json(body,{status:400});}
   return Response.json(path==='/api/version'?{version:'0.35.0'}:path==='/api/tags'?{models:[{name:config.model,digest:config.model_revision}]}:{capabilities:['completion']});
  };
  await assert.rejects(new OllamaGeneratorClient('http://127.0.0.1:11434',30000,transport).generate({system_prompt:'fixture',user_prompt:'fixture'},config),(e:unknown)=>{
   assert.ok(e instanceof GeneratorClientError);assert.equal(e.reason,'invalid_generator_response');assert.ok(!JSON.stringify(e).includes('SENSITIVE_SENTINEL'));return true;
  });
  assert.equal(posts,1);
 }
});
