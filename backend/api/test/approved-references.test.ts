import assert from 'node:assert/strict';
import test from 'node:test';
import {createApprovedReferences} from '../src/chat/approved-references.js';
import type {DocumentRagDependencies} from '../src/chat/document-rag.js';
const release='11111111-1111-4111-8111-111111111111',pin='a'.repeat(64);
function fixture(){
 const manifest={schema_version:'banuchat-approved-ccd-1',synthetic:false,_database_sha256:pin,source_manifest_sha256:'fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852',source_release_id:'10af4ffd-effb-41fc-bbfe-4dc48cb3398f',embedding:{},documents:Array.from({length:107},(_,i)=>({document_key:'synthetic-'+i,metadata:{claim_id:'SYNTHETIC-'+i,knowledge_version:2,reference_status:'adopted',topics:[],course:null,period:'general',population:'synthetic',basis_kinds:[]}}))};
 const calls:string[]=[];
 const deps={sql:{async query<T>(sql:string){calls.push(sql);return {rows:(sql.includes('banuchat_reference.context')?[{manifest}]:[{title:'Guía de evaluación formativa sintética'}]) as T[]};}},query_embedding_client:{async embedQuery(){throw Error('Synthetic routing must not embed CCD');}},generator_client:{async generate(){throw Error('Synthetic routing must use the existing responder');}},generator_config:{}} as unknown as Omit<DocumentRagDependencies,'evidence_mode'|'retrieve_chunks'>;
 return {manifest,deps,calls};
}
test('full CCD corpus requires the exact reviewed manifest pin and source lineage',async()=>{
 for(const configured of [undefined,'b'.repeat(64),'invalid'])await assert.rejects(createApprovedReferences(fixture().deps,release,configured),/source pin rejected/u);
 for(const field of ['source_manifest_sha256','source_release_id'] as const){const f=fixture();f.manifest[field]='changed';await assert.rejects(createApprovedReferences(f.deps,release,pin),/source pin rejected/u);}
 const f=fixture();f.manifest.documents[1]!.document_key=f.manifest.documents[0]!.document_key;await assert.rejects(createApprovedReferences(f.deps,release,pin),/manifest rejected/u);
});
test('explicit synthetic material retains the existing document responder without CCD retrieval',async()=>{
 const f=fixture(),references=await createApprovedReferences(f.deps,release,pin);let fallback=0;
 for(const query of ['Quiero consultar el material ficticio','¿Qué indica la guía de evaluación formativa sintética?']){
  const result=await references.respond({release_id:release,query},async input=>{fallback++;return {release_id:input.release_id,content:'Respuesta sintética de prueba',citations:[],citation_records:[],insufficient_evidence:false};});assert.equal(result.content,'Respuesta sintética de prueba');
 }assert.equal(fallback,2);assert.equal(f.calls.length,2);
});
