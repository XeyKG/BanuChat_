import test from 'node:test';
import assert from 'node:assert/strict';
import {ccdKnowledgeMetadata} from '../src/chat/ccd-knowledge-manifest.js';
import {assertCcdKnowledgeReads} from '../src/application/ccd-knowledge-retrieval.js';
function manifest(){
 const claims=Array.from({length:87},(_,i)=>({claim_id:'T-'+i,document_key:'ccd-knowledge-'+i,topics:['academic'],course:null,period:'2026',reference_status:'adopted',basis:[{kind:'DOCUMENT_SOURCE',references:[{source:'fixture',sha256:'a'.repeat(64),locator:'section:1'}]}],presentation_units:[{key:'fact',aspects:['academic'],text:'Source-backed fixture statement.'}]}));
 return {schema_version:'ccd-1.3.0',synthetic:false,items:claims.map(c=>({kind:'document',key:c.document_key})),ccd_knowledge:{schema_version:'ccd-knowledge-1',claims}};
}
test('normal CCD metadata adopts references without an experimental admission flag',()=>{
 const input=manifest(),metadata=ccdKnowledgeMetadata(input);assert.equal(metadata.size,87);assert.equal(metadata.get('ccd-knowledge-0')?.reference_status,'adopted');assert.ok(!JSON.stringify(input).includes('isolated_evaluation_allowed'));
});
test('unknown, duplicate, pending-only and experimental-only claims fail closed',()=>{
 const missing=manifest();(missing.ccd_knowledge.claims[0] as unknown as Record<string,unknown>).reference_status=undefined;assert.throws(()=>ccdKnowledgeMetadata(missing));
 const duplicate=manifest();duplicate.ccd_knowledge.claims[0]!.claim_id=duplicate.ccd_knowledge.claims[1]!.claim_id;assert.throws(()=>ccdKnowledgeMetadata(duplicate));
 const pending=manifest();pending.ccd_knowledge.claims[0]!.basis[0]!.kind='PENDING_CLARIFICATION';assert.throws(()=>ccdKnowledgeMetadata(pending));
 const old=manifest();old.schema_version='ccd-isolated-pilot-1';assert.throws(()=>ccdKnowledgeMetadata(old));
});
test('normal scoped retrieval requires the hardened read surface before accepting database rows',async()=>{
 for(const safe of [false,undefined])await assert.rejects(assertCcdKnowledgeReads({async query<T>(){return {rows:[{safe}] as T[]};}}));
 await assertCcdKnowledgeReads({async query<T>(){return {rows:[{safe:true}] as T[]};}});
});
