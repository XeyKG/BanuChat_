/** Compare F1 with the reviewed I1B baseline without publishing private turns. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {root,evidence} from '../../backend/api/test/auth-i1b-f1/environment.js';
const file=process.argv[2];assert.match(file??'',/^503-f1-full-[0-9]+\.json$/u);
const baseline='full-1792769823958.json';
const load=async(name:string)=>readFile(new URL('data/ccd/evidence/auth-i1b/'+name,root));
const oldBytes=await load(baseline),bytes=await load(file!);
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(oldBytes),'73dcbae6ba92aec7fb0fb412d8f0bb29c3934b71bcbc7dc784c77afb06bfbdd2');
const old=JSON.parse(oldBytes.toString()),run=JSON.parse(bytes.toString());
const reviewed=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-comparison.json',root),'utf8'));
assert.equal(reviewed.current_sha256,hash(oldBytes));
assert.equal(run.operational_pass,true);assert.equal(run.turns.length,43);assert.deepEqual(run.generator,old.generator);
const comparisons=run.turns.map((t:any,i:number)=>{
 const prior=old.turns[i];assert.equal(t.scenario,prior.scenario);assert.equal(t.turn,prior.turn);assert.equal(t.question,prior.question);
 const a=t.result.body.assistant_message,b=prior.result.body.assistant_message;
 assert.equal(a.content,b.content);assert.equal(a.insufficient_evidence,b.insufficient_evidence);
 assert.deepEqual(a.citations.map((c:any)=>[c.locator,c.document_version_id,c.release_id]),b.citations.map((c:any)=>[c.locator,c.document_version_id,c.release_id]));
 assert.deepEqual(t.selected_locators,prior.selected_locators);
 for(const key of ['embedding_calls','retrieval_calls','generator_calls'])assert.equal(t[key],prior[key]);
 return{scenario:t.scenario,turn:t.turn,text_equal:true,citation_identity_equal:true,selection_equal:true,insufficiency_equal:true};
});
const summary={checkpoint:'BCH-05/CCD-AUTH-I1B-503-F1',at:new Date().toISOString(),baseline_report:baseline,current_report:file,
 baseline_sha256:hash(oldBytes),current_sha256:hash(bytes),same_generator_recipe_and_digest:true,same_questions:43,
 text_equal:43,citation_identity_equal:43,selection_equal:43,insufficiency_equal:43,
 review_method:'Exact text, source locator/version/release, selection and call-count equality against the previously reviewed I1B outputs; no new automatic semantic judgment or institutional approval.',
 classes:reviewed.classes.map((r:any)=>({scenario:r.scenario,baseline_class:r.current_class,current_class:r.current_class,review:r.review})),
 unresolved:['T01/2: prior loss of bounded orientation persists','T11: academic scenario remains pending'],
 controls:{baseline:old.check_metrics,current:run.check_metrics},comparisons,android:'not executed by agent'};
await evidence('comparison',summary);
console.log(JSON.stringify({text_equal:43,citation_identity_equal:43,selection_equal:43,unresolved:summary.unresolved}));
