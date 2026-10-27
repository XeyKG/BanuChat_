import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import {tmpdir} from 'node:os';
import {prepareKnowledgeCorpus,type KnowledgeAdoption} from '../src/ccd/knowledge.js';import {sha256} from '../src/crypto/sha256.js';import {storageCounts} from '../src/db/recipe.js';
async function fixture(t:{after:(f:()=>Promise<void>)=>void},n:number){
 const root=await mkdtemp(path.join(tmpdir(),'banuchat-knowledge-v2-'));t.after(async()=>{assert.equal(path.dirname(root),path.resolve(tmpdir()));assert.ok(path.basename(root).startsWith('banuchat-knowledge-v2-'));await rm(root,{recursive:true});});
 await mkdir(path.join(root,'documents/artifacts'),{recursive:true});
 const reference=Buffer.from('Fictitious source, no private records.\n'),reg=Buffer.from('{"sources":[]}\n'),review=Buffer.from('{"review":"fixture"}\n'),decision=Buffer.from('{"decision":"fixture"}\n');
 for(const [f,b]of [['reference.md',reference],['source-registry.json',reg],['source-review.jsonl',review],['domain-decisions.json',decision]] as const)await writeFile(path.join(root,f),b);
 const adoption:KnowledgeAdoption={schema_version:'ccd-knowledge-adoption-2',version:'bch-ccd-knowledge-2',source_registry_sha256:sha256(reg),source_review_sha256:sha256(review),domain_decision_sha256:sha256(decision),sources:[{path:'reference.md',sha256:sha256(reference),origin:'bundle'}],claims:[],artifacts:[]};
 for(let i=0;i<n;i++){const key='ccd-knowledge-fixture-'+i,title='Contenido del curso '+i,text='Un contenido académico acotado a esta edición.',file=`documents/artifacts/${key}.md`,content=Buffer.from('# '+title+'\n\n'+text+'\n');await writeFile(path.join(root,file),content);
 adoption.claims.push({claim_id:'REF-'+i,document_key:key,title,statement:text,period:'2026',population:'Fixture profesional',topics:['academic'],course:null,reference_status:'adopted',conditions:[],exceptions:[],basis:[{kind:'DOCUMENT_SOURCE',references:[{source:'reference.md',sha256:sha256(reference),locator:'paragraph:1'}]}],presentation_units:[{key:'fact',aspects:['academic'],text}],governance:{},sources:[],domain_metadata:{entity_type:'COURSE_OPTION',current:true,temporal_class:'CURRENT_GENERAL',source_access_class:'LOCAL_AUTHORIZED'}});adoption.artifacts.push({claim_id:'REF-'+i,document_key:key,title,path:file,sha256:sha256(content)});}
 const prepare=async()=>{const b=Buffer.from(JSON.stringify(adoption)+'\n');await writeFile(path.join(root,'adoption.json'),b);return prepareKnowledgeCorpus({corpusRoot:root,institutionalRoot:root,trustedAdoptionSha256:sha256(b)});};return {root,adoption,prepare};
}
test('v2 preparation derives counts and preserves source integrity at multiple cardinalities',async t=>{
 for(const n of [1,4]){const f=await fixture(t,n),p=await f.prepare();assert.equal(p.documents.length,n);assert.equal(p.manifest.schema_version,'ccd-1.4.0');assert.equal(p.manifest.ccd_knowledge.schema_version,'ccd-knowledge-2');assert.deepEqual(storageCounts({kind:'ccd_knowledge_v2',items:n}),{items:n,documents:n,chunks:n,perDocument:1});}
});
test('v2 rejects mismatched artifacts, duplicate identities, pending-only and corrupt sources',async t=>{
 for(const kind of ['mismatch','duplicate-id','duplicate-key','pending','source','registry','derivative','unit-outside-derivative']){
  const f=await fixture(t,2);
  if(kind==='mismatch')f.adoption.artifacts.pop();
  if(kind==='duplicate-id')f.adoption.claims[1]!.claim_id=f.adoption.claims[0]!.claim_id;
  if(kind==='duplicate-key')f.adoption.claims[1]!.document_key=f.adoption.claims[0]!.document_key;
  if(kind==='pending')f.adoption.claims[0]!.basis[0]!.kind='PENDING_CLARIFICATION';
  if(kind==='source')await writeFile(path.join(f.root,'reference.md'),'changed');
  if(kind==='registry')await writeFile(path.join(f.root,'source-registry.json'),'changed');
  if(kind==='derivative')await writeFile(path.join(f.root,f.adoption.artifacts[0]!.path),'changed');
  if(kind==='unit-outside-derivative')f.adoption.claims[0]!.presentation_units[0]!.text='Un hecho que no figura en el derivado citado.';
  await assert.rejects(f.prepare(),kind);
 }
});
