import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {prepareKnowledgeCorpus} from '../src/ccd/knowledge.js';
import {sha256} from '../src/crypto/sha256.js';
import {finalizeCandidate} from '../src/db/finalize.js';
import type {WriterLease} from '../src/db/writer-lock.js';
async function fixture(t:{after:(fn:()=>Promise<void>)=>void}){
 const root=await mkdtemp(path.join(tmpdir(),'banuchat-knowledge-'));t.after(async()=>{assert.equal(path.dirname(root),path.resolve(tmpdir()));assert.ok(path.basename(root).startsWith('banuchat-knowledge-'));await rm(root,{recursive:true});});
 await mkdir(path.join(root,'documents/artifacts'),{recursive:true});const source=Buffer.from('Fictitious reference source.\n');await writeFile(path.join(root,'reference.md'),source);
 const claims=[],artifacts=[];for(let i=0;i<87;i++){const key='ccd-knowledge-'+i,title='Fictitious reference '+i,content=Buffer.from('# '+title+'\n\nA source-backed conditional statement.\n'),p=`documents/artifacts/${key}.md`;await writeFile(path.join(root,p),content);claims.push({claim_id:'TEST-'+i,document_key:key,title,statement:'A source-backed conditional statement.',period:'2026',population:'Fictitious fixture',topics:['academic'],course:null,reference_status:'adopted',conditions:[],exceptions:[],basis:[{kind:'DOCUMENT_SOURCE',references:[{source:'reference.md',sha256:sha256(source),locator:'paragraph:1'}]}],presentation_units:[{key:'fact',aspects:['academic'],text:'A source-backed conditional statement.'}],governance:{},sources:[],domain_metadata:{}});artifacts.push({claim_id:'TEST-'+i,document_key:key,title,path:p,sha256:sha256(content)});}
 const adoption={schema_version:'ccd-knowledge-adoption-1',version:'bch-ccd-knowledge-1',source_registry_sha256:'a'.repeat(64),source_review_sha256:'b'.repeat(64),domain_decision_sha256:'c'.repeat(64),sources:[{path:'reference.md',sha256:sha256(source)}],claims,artifacts};const bytes=Buffer.from(JSON.stringify(adoption)+'\n');await writeFile(path.join(root,'adoption.json'),bytes);
 return {root,adoption,hash:sha256(bytes)};
}
test('normal preparation binds all 87 sanitized artifacts and source provenance',async t=>{
 const f=await fixture(t);const p=await prepareKnowledgeCorpus({corpusRoot:f.root,institutionalRoot:f.root,trustedAdoptionSha256:f.hash});assert.equal(p.documents.length,87);assert.equal(p.derivatives.length,87);assert.equal(p.manifest.synthetic,false);assert.equal(p.manifest.schema_version,'ccd-1.3.0');assert.ok(!JSON.stringify(p.manifest).includes('NO_PUBLICATION'));
});
test('normal preparation rejects a modified derivative without trusting the old approval hash',async t=>{
 const f=await fixture(t);await writeFile(path.join(f.root,f.adoption.artifacts[0]!.path),'Changed bytes');await assert.rejects(prepareKnowledgeCorpus({corpusRoot:f.root,institutionalRoot:f.root,trustedAdoptionSha256:f.hash}));
});
test('candidate finalization closes and validates the normal run without publishing current',async()=>{
 const calls:string[]=[];const lease={async transaction<T>(fn:()=>Promise<T>){return fn();},async query(sql:string){calls.push(sql);if(sql.includes('current_release_id FROM'))return {rows:[{current_release_id:'predecessor'}],rowCount:1};if(sql.includes('SELECT status FROM banuchat.dataset_releases'))return {rows:[{status:'staging'}],rowCount:1};if(sql.includes('SELECT status FROM banuchat.ingestion_runs'))return {rows:[{status:'running'}],rowCount:1};if(sql.includes('count(*)'))return {rows:[{total:87,processed:87,ready:87,valid:87}],rowCount:1};return {rows:[{id:'fixture'}],rowCount:1};}} as unknown as WriterLease;
 await finalizeCandidate(lease,'release','run','ccd_knowledge_v1',{expectedRelease:'predecessor'});assert.ok(calls.some(q=>q.includes('assert_release_complete')));assert.ok(calls.some(q=>q.includes("status='succeeded'")));assert.ok(!calls.some(q=>q.includes('publish_release')||q.includes('SET current_release_id')));
});
