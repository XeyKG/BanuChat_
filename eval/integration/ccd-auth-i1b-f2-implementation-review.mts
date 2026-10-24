/** Compare F2 with the reviewed F1 baseline without publishing private turns. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {isCourseFailureContext,ccdGuidanceTopic,isCcdCourseDetailQuery} from '../../backend/api/src/chat/document-evidence.js';
import {resolveConversationQuery,isCcdCourseCatalogQuery,type ConversationMessage} from '../../backend/api/src/chat/conversation-context.js';
import {contextCases} from '../../backend/api/test/auth-i1b-f2/cases.js';
import {root,evidence} from '../../backend/api/test/auth-i1b-f2-implementation/environment.js';
const file=process.argv[2];assert.match(file??'',/^f2-implementation-full-[0-9]+-[0-9]+\.json$/u);
const baseline='503-f1-full-1792779633613.json';
const load=async(name:string)=>readFile(new URL('data/ccd/evidence/auth-i1b/'+name,root));
const oldBytes=await load(baseline),bytes=await load(file!);
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const baselineReview=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-f1-comparison.json',root),'utf8'));assert.equal(hash(oldBytes),baselineReview.current_sha256);
const old=JSON.parse(oldBytes.toString()),run=JSON.parse(bytes.toString());
const reviewed=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-f1-comparison.json',root),'utf8'));
assert.equal(reviewed.current_sha256,hash(oldBytes));
assert.equal(run.operational_pass,true);assert.equal(run.turns.length,43);assert.deepEqual(run.generator,old.generator);
let activeScenario='';let history:ConversationMessage[]=[];
const comparisons=run.turns.map((t:any,i:number)=>{
 if(t.scenario!==activeScenario){activeScenario=t.scenario;history=[];}
 assert.equal(isCcdCourseCatalogQuery(t.question)&&isCcdCourseDetailQuery(t.question),false);
 const bounded=resolveConversationQuery(t.question,history).history;assert.equal(isCourseFailureContext(t.question,bounded)&&ccdGuidanceTopic(t.question,bounded)!=='U03',false);
 history.push({role:'user',content:t.question},{role:'assistant',content:t.result.body.assistant_message.content});
 const prior=old.turns[i];assert.equal(t.scenario,prior.scenario);assert.equal(t.turn,prior.turn);assert.equal(t.question,prior.question);
 const a=t.result.body.assistant_message,b=prior.result.body.assistant_message;
 assert.equal(a.content,b.content);assert.equal(a.insufficient_evidence,b.insufficient_evidence);
 assert.deepEqual(a.citations.map((c:any)=>[c.locator,c.document_version_id,c.release_id]),b.citations.map((c:any)=>[c.locator,c.document_version_id,c.release_id]));
 assert.deepEqual(t.selected_locators,prior.selected_locators);
 for(const key of ['embedding_calls','retrieval_calls','generator_calls'])assert.equal(t[key],prior[key]);
 return{scenario:t.scenario,turn:t.turn,text_equal:true,citation_identity_equal:true,selection_equal:true,insufficiency_equal:true};
});
for(const c of contextCases){assert.equal(isCcdCourseCatalogQuery(c.query)&&isCcdCourseDetailQuery(c.query),false);const h=resolveConversationQuery(c.query,c.history).history;assert.equal(isCourseFailureContext(c.query,h)&&ccdGuidanceTopic(c.query,h)!=='U03',false);}
const summary={late_course_failure_scope_change_affects_measured_prompts:false,late_catalog_detail_guard_affects_measured_bank:false,checkpoint:'BCH-05/CCD-AUTH-I1B-F2 implementation',at:new Date().toISOString(),baseline_report:baseline,current_report:file,
 baseline_sha256:hash(oldBytes),current_sha256:hash(bytes),same_generator_recipe_and_digest:true,same_questions:43,
 text_equal:43,citation_identity_equal:43,selection_equal:43,insufficiency_equal:43,
 review_method:'Exact text, source locator/version/release, selection and call-count equality against the previously reviewed I1B outputs; no new automatic semantic judgment or institutional approval.',
 classes:reviewed.classes.map((r:any)=>({scenario:r.scenario,baseline_class:r.current_class,current_class:r.current_class,review:r.review})),
 unresolved:['T01/2: prior loss of bounded orientation persists','T11: academic scenario remains pending'],
 controls:{baseline:old.check_metrics,current:run.check_metrics},comparisons,android:'not executed by agent'};
await evidence('comparison',summary);
const latest=async(kind:string)=>{const names=(await readdir(new URL('eval/auth/results/',root))).filter(n=>n.startsWith('bch05-ccd-auth-i1b-f2-implementation-'+kind+'-'));return JSON.parse(await readFile(new URL('eval/auth/results/'+names.sort().at(-1),root),'utf8'));};
const before=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-f2-capture-1792782378649.json',root),'utf8')),after=await latest('capture'),probe=await latest('probe');
const sourceCounts=after.cases.map((c:any)=>{const prior=before.cases.find((x:any)=>x.id===c.id);return{id:c.id,before_sources:(prior.selected??prior.citations??[]).length,after_sources:(c.selected??c.citations??[]).length,prompt_equal:c.prompt_sha256?c.prompt_sha256===prior.prompt_sha256:null,generation_after:c.generation};});
assert.equal(sourceCounts.filter((c:any)=>c.prompt_equal===true).length,16);assert.ok(sourceCounts.every((c:any)=>c.prompt_equal!==false));
await evidence('selection-comparison',{checkpoint:summary.checkpoint,at:new Date().toISOString(),sourceCounts,retained_prompts_identical:16,capacity_residual:probe.cases.find((c:any)=>c.id==='explicit_multi_capacity'),semantic_note:'Development evidence, not an independent academic evaluation'});
console.log(JSON.stringify({text_equal:43,citation_identity_equal:43,selection_equal:43,unresolved:summary.unresolved}));
