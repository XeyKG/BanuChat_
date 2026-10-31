import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import {prepareDemoCandidate,CATEGORIES,SOURCES,hash} from '../../rag/src/oe2/pipeline/projection.js';
import {extractOe2Fixture} from '../../rag/src/oe2/flow.js';
import type {Oe2Category} from '../../rag/src/oe2/types.js';
import type {Oe2Publication,Oe2PublicationHistory} from '../src/application/oe2-demo.js';
import {compareOe2History,readOe2Changes} from '../src/application/oe2-changes.js';
import {createAuthenticatedApiServer} from '../src/http/api-v2-server.js';
import type {AuthService} from '../src/auth/auth-service.js';
import {AuthError} from '../src/auth/primitives.js';
const oldId='ffffffff-ffff-4fff-8fff-ffffffffffff',newId='11111111-1111-4111-8111-111111111111';
type Fixtures=Record<Oe2Category,{schema_version:string;category:string;records:Record<string,string>[]} >;
async function fixtures():Promise<Fixtures>{const r={}as Fixtures;for(const c of CATEGORIES)r[c]=JSON.parse(await readFile(new URL('../../../eval/oe2/fixtures/'+(c==='academic_offer'?'academic-offer':c)+'.json',import.meta.url),'utf8'));return r;}
function publication(f:Fixtures,id=oldId,date='2026-10-30T12:00:00.000001Z',observed='2026-10-30T11:00:00Z'):Oe2Publication{
 const inputs=Object.fromEntries(CATEGORIES.map(category=>{const bytes=Buffer.from(JSON.stringify(f[category])+'\n');return [category,Buffer.from(JSON.stringify({schema_version:'oe2-snapshot-1',category,source_id:SOURCES[category],source_sha256:hash(bytes),available_at:observed,records:extractOe2Fixture(bytes,category,SOURCES[category])})+'\n')];}))as Record<Oe2Category,Buffer>;
 const candidate=prepareDemoCandidate(inputs);return {valid:true,release_id:id,published_at:date,candidate,programming:candidate.programming.map(({key,...r})=>({programming_key:key,...r})),announcements:candidate.announcements.map(({key,...r})=>({announcement_key:key,...r}))};
}
function history(current:Oe2Publication,previous:Oe2Publication|null):Oe2PublicationHistory {const publications=previous?[current,previous]:[current];return {current_release_id:current.release_id,publications,timeline:publications.map(p=>({release_id:p.release_id,published_at:p.published_at,content_sha256:p.candidate.content_sha256,approval_ref:'OE2-PIPELINE-02/unit-approved'}))};}
test('A/B/C/H: stable composite identity detects added, modified and removed news with only actual changed fields',async()=>{
 const f=await fixtures(),previous=publication(f),changed=structuredClone(f);changed.news.records[0]!.title+=' revisada';changed.news.records[0]!.summary='Resumen actualizado';changed.news.records[0]!.source_version='fixture-v2';
 changed.news.records[1]={...changed.news.records[1]!,id:'NEWS-003'};
 const current=publication(changed,newId,'2026-10-30T12:00:00.000002Z'),h=history(current,previous),before=JSON.stringify(h),result=compareOe2History(h);
 assert.deepEqual(result.counts,{created:1,modified:1,removed:1,unchanged:4});assert.equal(result.previous_release_id,oldId);assert.equal(result.current_release_id,newId);
 const modified=result.changes.find(c=>c.change_type==='modified')!;assert.deepEqual(modified.fields.map(f=>f.field),['title','summary','source_version']);assert.equal(modified.previous_source!.record_id,modified.current_source!.record_id);
 const removed=result.changes.find(c=>c.change_type==='removed')!;assert.equal(removed.current_available,false);assert.equal(removed.current_source,null);assert.ok(removed.fields.every(f=>f.after===null));
 assert.equal(JSON.stringify(h),before);assert.doesNotMatch(JSON.stringify(result),/source_path|snapshot_json|candidate|sha256|approval_ref/u);
});
test('D/E/K: unchanged records and observation-only metadata never become artificial news; comparison preserves history',async()=>{
 const f=await fixtures(),previous=publication(f),current=publication(f,newId,'2026-10-30T12:00:00.000002Z','2026-10-30T11:30:00Z');
 const h=history(current,previous),before=JSON.stringify(h),r=compareOe2History(h);assert.deepEqual(r.counts,{created:0,modified:0,removed:0,unchanged:6});assert.deepEqual(r.changes,[]);assert.equal(r.comparison_status,'compared');assert.equal(JSON.stringify(h),before);
});
test('Equivalent source instants expressed with another offset do not create semantic changes, even when validated record hashes differ',async()=>{
 const f=await fixtures(),previous=publication(f);f.news.records[0]!.published_at='2026-10-05T16:30:00Z';
 const current=publication(f,newId,'2026-10-30T12:00:00.000002Z');assert.notEqual(current.candidate.origins.find(o=>o.record_id==='NEWS-001')!.record_sha256,previous.candidate.origins.find(o=>o.record_id==='NEWS-001')!.record_sha256);
 const r=compareOe2History(history(current,previous));assert.equal(r.counts.unchanged,6);assert.deepEqual(r.changes,[]);
});
test('F/G: date changes are explicit before/after, source dates and observation dates retain different meanings',async()=>{
 const f=await fixtures(),previous=publication(f);f.academic_offer.records[0]!.end_date='2026-12-05';f.calls.records[0]!.closes_at='2026-10-20T17:00:00-05:00';f.calls.records[0]!.audience='Participantes ficticios';
 const r=compareOe2History(history(publication(f,newId,'2026-10-30T12:01:00.000000Z','2026-10-30T11:30:00Z'),previous));assert.equal(r.counts.modified,2);
 const program=r.changes.find(c=>c.category==='academic_offer')!;assert.deepEqual(program.fields,[{field:'end_date',before:'2026-11-28',after:'2026-12-05'}]);
 const call=r.changes.find(c=>c.category==='calls')!;assert.deepEqual(call.fields.map(f=>f.field),['audience','closes_at']);assert.notEqual(call.current_source!.observed_at,call.current_source!.source_published_at);assert.notEqual(call.current_source!.observed_at,r.current_published_at);
});
test('I: first approved publication explicitly has no previous comparison and creates no news',async()=>{
 const r=compareOe2History(history(publication(await fixtures()),null));assert.equal(r.comparison_status,'no_previous');assert.equal(r.previous_release_id,null);assert.equal(r.previous_published_at,null);assert.deepEqual(r.changes,[]);assert.deepEqual(r.counts,{created:0,modified:0,removed:0,unchanged:0});
});
test('J: corrupt, unapproved, noncomparable, ambiguous or nonlatest-current histories fail closed',async()=>{
 const f=await fixtures(),base=history(publication(f,newId,'2026-10-30T12:00:00.000002Z'),publication(f));
 for(const alter of [
  (h:Oe2PublicationHistory)=>{h.timeline[0]!.published_at=h.timeline[1]!.published_at;},
  (h:Oe2PublicationHistory)=>{h.current_release_id=oldId;},
  (h:Oe2PublicationHistory)=>{h.timeline[0]!.approval_ref='unapproved';},
  (h:Oe2PublicationHistory)=>{h.publications[0]!.valid=false;},
  (h:Oe2PublicationHistory)=>{h.publications[0]!.candidate.origins[0]!.source_id='institutional-api';},
  (h:Oe2PublicationHistory)=>{Object.assign(h.publications[0]!.candidate,{policy:'unsupported-policy'});},
  (h:Oe2PublicationHistory)=>{h.publications[1]!.announcements[0]!.title='Corrupt';},
  (h:Oe2PublicationHistory)=>{h.timeline[0]!.content_sha256='0'.repeat(64);},
  (h:Oe2PublicationHistory)=>{h.timeline[0]!.published_at='2026-02-30T00:00:00.000001Z';},
 ]){const h=structuredClone(base);alter(h);assert.throws(()=>compareOe2History(h),e=>e instanceof AuthError&&e.code==='DEPENDENCY_UNAVAILABLE');}
 assert.equal(compareOe2History(base).previous_published_at,'2026-10-30T12:00:00.000001Z'); // distinct microseconds, same JS millisecond
});
test('L/M/N: authenticated GET, bounded filters and isolated dependency failure preserve normal resources',async()=>{
 const token='A'.repeat(43),f=await fixtures();f.news.records[0]!.summary='Cambio';const h=history(publication(f,newId,'2026-10-30T12:01:00.000000Z'),publication(await fixtures()));
 const resources={oe2Changes:async(_token:string,filters:object)=>compareOe2History(h,filters),list:async()=>({conversations:[]})}as unknown as Parameters<typeof createAuthenticatedApiServer>[0]['resources'];
 const auth={verifyAccess:async(t:string)=>{if(t!==token)throw new AuthError('UNAUTHENTICATED');}}as unknown as AuthService;
 const server=createAuthenticatedApiServer({auth,resources,oe2_demo:true});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address()as AddressInfo).port+'/api/v2';
 const get=(path:string,init:RequestInit={})=>fetch(base+path,{headers:{Authorization:'Bearer '+token},...init});
 try{
  assert.equal((await get('/demo/oe2/changes',{headers:{}})).status,401);assert.equal((await get('/demo/oe2/changes',{method:'POST'})).status,405);
  for(const q of ['category=other','change_type=unchanged','limit=0','limit=51','limit=1&limit=2','category=news&category=calls','source_id=anything','current_release_id=x','sql=SELECT','path=private'])assert.equal((await get('/demo/oe2/changes?'+q)).status,400,q);
  const r=await get('/demo/oe2/changes?category=news&change_type=modified&limit=1');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).changes.length,1);
  const empty=compareOe2History(h,{category:'calls'});assert.equal(empty.matched_count,0);assert.equal(empty.counts.modified,1);
  resources.oe2Changes=async()=>readOe2Changes(undefined,{});const failed=await get('/demo/oe2/changes');assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/SQL|source_path|postgres|stack|password/u);assert.equal((await get('/conversations')).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
