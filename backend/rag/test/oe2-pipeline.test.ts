import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CATEGORIES,SOURCES,POLICY,hash,plannedFixtureIdentity,prepareDemoCandidate,revalidateCandidate,requireApproval,ProjectionError,type DemoApproval} from '../src/oe2/pipeline/projection.js';
import {extractOe2Fixture} from '../src/oe2/flow.js';
import type {Oe2Category} from '../src/oe2/types.js';

async function fixtures(){const result={} as Record<Oe2Category,Buffer>;for(const c of CATEGORIES)result[c]=await readFile(new URL('../../../eval/oe2/fixtures/'+(c==='academic_offer'?'academic-offer':c)+'.json',import.meta.url));return result;}
function snapshots(files:Record<Oe2Category,Buffer>,at='2026-10-30T12:00:00Z'){
 return Object.fromEntries(CATEGORIES.map(category=>[category,Buffer.from(JSON.stringify({schema_version:'oe2-snapshot-1',category,source_id:SOURCES[category],source_sha256:hash(files[category]),available_at:at,records:extractOe2Fixture(files[category],category,SOURCES[category])},null,2)+'\n')])) as Record<Oe2Category,Buffer>;
}
test('projection preserves programming semantics and never creates catalogue courses',async()=>{
 const c=prepareDemoCandidate(snapshots(await fixtures()));assert.equal(c.programming.length,2);
 const p=c.programming.find(p=>p.record_id==='OFF-001')!;
 assert.equal(p.course_code,'DEMO-CCD-01');assert.equal(p.period,'DEMO-2026-10');assert.equal(p.mode,'virtual');assert.equal(p.start_date,'2026-11-03');assert.equal(p.end_date,'2026-11-28');
 assert.ok(!('courses' in c));assert.match(p.title,/FICTICIA/u);assert.match(p.source_path,/^programming\//u);
});
test('calls use opening and closing, while news retains publication and no invented expiration',async()=>{
 const f=await fixtures(),earlierPublication=JSON.parse(f.calls.toString());
 earlierPublication.records[0].published_at='2026-09-01T08:00:00-05:00';f.calls=Buffer.from(JSON.stringify(earlierPublication)+'\n');
 const c=prepareDemoCandidate(snapshots(f));
 const call=c.announcements.find(a=>a.record_id==='CALL-001')!,news=c.announcements.find(a=>a.record_id==='NEWS-001')!;
 assert.equal(call.valid_from,'2026-10-02T09:15:00-05:00');assert.equal(call.valid_until,'2026-10-09T17:00:00-05:00');assert.match(call.description,/estudiantes de demostración/u);
 assert.equal(c.origins.find(o=>o.record_id==='CALL-001')!.published_at,'2026-09-01T08:00:00-05:00');
 assert.equal(news.valid_from,'2026-10-05T11:30:00-05:00');assert.equal(news.valid_until,null);assert.match(news.description,/Contenido sintético/u);
 assert.equal(c.origins.find(o=>o.record_id==='NEWS-001')!.source_version,'fixture-2026-10-a');
});
test('actual snapshot bytes, source hashes and per-record locators remain verifiable',async()=>{
 const input=snapshots(await fixtures()),c=prepareDemoCandidate(input);revalidateCandidate(c);
 for(const a of c.announcements){const artifact=c.artifacts.find(s=>s.category===a.category)!;assert.equal(hash(artifact.json),a.source_sha256);
  const row=JSON.parse(artifact.json).records[Number(a.source_locator.split('/').at(-1))];assert.equal(row.source_record_id,a.record_id);
  assert.equal(c.origins.find(o=>o.record_id===a.record_id)!.record_sha256,row.content_sha256);
 }
});
test('approval binds complete logical source versions and is independent of observation time',async()=>{
 const f=await fixtures(),a=prepareDemoCandidate(snapshots(f)),b=prepareDemoCandidate(snapshots(f,'2026-10-30T13:00:00Z'));
 assert.equal(a.content_sha256,b.content_sha256);assert.notEqual(a.artifacts[0]!.snapshot_sha256,b.artifacts[0]!.snapshot_sha256);
 assert.equal(a.content_sha256,plannedFixtureIdentity(f));
 const approval:DemoApproval={scope:'fictional_auxiliary_only',policy:POLICY,candidate_sha256:a.content_sha256,approval_ref:'OE2-PIPELINE-02/unit'};requireApproval(a,approval);
 assert.throws(()=>requireApproval(a,{...approval,candidate_sha256:'a'.repeat(64)}),ProjectionError);
});
test('tampered, empty, incomplete, ambiguous and unauthorized snapshots fail closed',async()=>{
 const input=snapshots(await fixtures());
 for(const change of ['source','hash','ambiguous','empty']){
  const value=JSON.parse(input.calls.toString());
  if(change==='source')value.source_id='real-institution';if(change==='hash')value.records[0].content_sha256='0'.repeat(64);
  if(change==='ambiguous')value.records[0].fields.conditions='Inferred';if(change==='empty')value.records=[];
  assert.throws(()=>prepareDemoCandidate({...input,calls:Buffer.from(JSON.stringify(value)+'\n')}),ProjectionError);
 }
 const candidate=prepareDemoCandidate(input);candidate.announcements[0]!.title='Altered';assert.throws(()=>revalidateCandidate(candidate),ProjectionError);
});
