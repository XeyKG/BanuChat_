import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Pool} from 'pg';
import {getAnnouncements} from '../../../api/src/application/announcements.js';
import {extractOe2Fixture} from '../../src/oe2/flow.js';
import {CATEGORIES,SOURCES,POLICY,hash,prepareDemoCandidate,ProjectionError,type DemoApproval} from '../../src/oe2/pipeline/projection.js';
import type {Oe2Category} from '../../src/oe2/types.js';
import {currentDemoRelease,publishDemoCandidate,demoReadSql,getDemoProgramming} from '../../src/oe2/pipeline/publication.js';

const writer=new Pool({host:'127.0.0.1',database:'postgres',user:'banuchat_oe2_pipeline_writer',password:process.env.OE2_PIPELINE_WRITER_PASSWORD,max:4});
const reader=new Pool({host:'127.0.0.1',database:'postgres',user:'banuchat_oe2_pipeline_reader',password:process.env.OE2_PIPELINE_READER_PASSWORD,options:'-c default_transaction_read_only=on'});
const checks:Record<string,unknown>[]=[];
const check=async(name:string,work:()=>Promise<unknown>)=>{const started=performance.now();const evidence=await work();checks.push({name,status:'PASS',duration_ms:Math.round(performance.now()-started),evidence});};
let result='PASS';
try{
 const sql=demoReadSql(reader),base=await currentDemoRelease(reader);assert.ok(base);
 await check('existing_rest_news_calls_and_temporal_semantics',async()=>{
  const request=async(query:string,status:string,date:string)=>{const response=await fetch('http://127.0.0.1:3032/api/v1/announcements?'+new URLSearchParams({query,temporal_status:status,reference_time:date}));assert.equal(response.status,200);return response.json();};
  const news=await request('NOVEDAD FICTICIA','all','2026-10-06T12:00:00Z');assert.equal(news.announcements.length,2);assert.ok(news.announcements.every((a:{valid_until:unknown})=>a.valid_until===null));
  assert.ok(news.announcements.some((a:{title:string})=>a.title.includes('actualizada por scheduler')));
  const before=await request('CONVOCATORIA FICTICIA','upcoming','2026-10-01T12:00:00Z');assert.equal(before.announcements.length,2);
  const during=await request('CONVOCATORIA FICTICIA','active','2026-10-06T12:00:00Z');assert.equal(during.announcements.length,2);
  const after=await request('CONVOCATORIA FICTICIA','expired','2026-10-20T12:00:00Z');assert.equal(after.announcements.length,2);
  const longAfter=await request('NOVEDAD FICTICIA','active','2036-10-20T12:00:00Z');assert.equal(longAfter.announcements.length,2);
  return {news,before,during,after,longAfter};
 });
 await check('programming_service_without_catalogue_fabrication',async()=>{
  const response=await getDemoProgramming(reader);assert.equal(response.programming.length,2);
  const row=response.programming.find(p=>p.record_id==='OFF-001')!;assert.equal(row.course_code,'DEMO-CCD-01');assert.equal(row.period,'DEMO-2026-10');assert.equal(row.mode,'virtual');
  assert.equal(row.start_date,'2026-11-03');assert.equal(row.end_date,'2026-11-28');
  assert.equal((await reader.query("SELECT to_regclass('public.oe2_pipeline_courses') IS NULL AS absent")).rows[0].absent,true);return response;
 });
 await check('origin_hashes_and_snapshot_references',async()=>{
  const answers=await getAnnouncements(sql,{temporal_status:'all',reference_time:'2026-10-06T12:00:00Z'});
  const sources=(await reader.query('SELECT * FROM public.oe2_pipeline_sources WHERE dataset_release_id=$1',[base])).rows;
  for(const answer of answers.announcements){const source=sources.find(s=>s.snapshot_sha256===answer.source.source_sha256)!;assert.ok(source);assert.equal(hash(source.snapshot_json),source.snapshot_sha256);
   const record=JSON.parse(source.snapshot_json).records[Number(answer.source.source_locator.split('/').at(-1))];assert.ok(record);
  }
  const original=(await reader.query("SELECT record_id FROM public.oe2_pipeline_origins WHERE dataset_release_id=$1 AND category='news' ORDER BY record_id",[base])).rows;
  assert.deepEqual(original.map(r=>r.record_id),['NEWS-001','NEWS-003']);return {answers,source_count:sources.length,news_ids:original};
 });
 const inputs={} as Record<Oe2Category,Buffer>;
 for(const category of CATEGORIES)inputs[category]=await readFile('/tmp/oe2-pipeline-state/'+category+'.json');
 const currentCandidate=prepareDemoCandidate(inputs);
 const currentApproval:DemoApproval={scope:'fictional_auxiliary_only',policy:POLICY,candidate_sha256:currentCandidate.content_sha256,approval_ref:'OE2-PIPELINE-02/explicit-check'};
 const count=async()=>Number((await reader.query('SELECT count(*) FROM public.oe2_pipeline_releases')).rows[0].count);
 await check('second_execution_is_idempotent',async()=>{const before=await count();const r=await publishDemoCandidate({pool:writer,candidate:currentCandidate,approval:currentApproval,expected_base_release_id:base});assert.equal(r.outcome,'unchanged');assert.equal(await count(),before);return r;});
 // A separate explicitly approved fixture candidate tests database failure/concurrency.
 const fixtureInputs={} as Record<Oe2Category,Buffer>;
 for(const category of CATEGORIES){const file=category==='academic_offer'?'academic-offer':category;fixtureInputs[category]=await readFile('/inputs/fixtures/'+file+'.json');}
 const changed=JSON.parse(fixtureInputs.news.toString());changed.records[0].summary+=' Cambio de prueba de rollback y concurrencia.';changed.records[0].source_version='fixture-rollback-concurrency-v3';fixtureInputs.news=Buffer.from(JSON.stringify(changed,null,2)+'\n');
 await mkdir('/outputs/explicit-candidate-v3',{recursive:true});
 for(const category of CATEGORIES){await writeFile('/outputs/explicit-candidate-v3/'+category+'.fixture.json',fixtureInputs[category]);inputs[category]=Buffer.from(JSON.stringify({schema_version:'oe2-snapshot-1',category,source_id:SOURCES[category],source_sha256:hash(fixtureInputs[category]),available_at:new Date().toISOString(),records:extractOe2Fixture(fixtureInputs[category],category,SOURCES[category])},null,2)+'\n');}
 const next=prepareDemoCandidate(inputs),approval:DemoApproval={...currentApproval,candidate_sha256:next.content_sha256,approval_ref:'OE2-PIPELINE-02/explicit-rollback-concurrency'};
 await check('rollback_after_records_before_pointer',async()=>{
  const before=await count();await assert.rejects(publishDemoCandidate({pool:writer,candidate:next,approval,expected_base_release_id:base,beforePointerSwap:async lease=>{await lease.query('SELECT 1/0');}}));
  assert.equal(await currentDemoRelease(reader),base);assert.equal(await count(),before);
  assert.equal((await reader.query("SELECT count(*)::int n FROM public.oe2_pipeline_releases WHERE status='staging'")).rows[0].n,0);return {unchanged_release:base,no_partial_staging:true};
 });
 await check('one_concurrent_writer_and_no_duplicate_publication',async()=>{
  const before=await count();let entered!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>{entered=r;}),hold=new Promise<void>(r=>{release=r;});
  const first=publishDemoCandidate({pool:writer,candidate:next,approval,expected_base_release_id:base,beforePointerSwap:async()=>{entered();await hold;}});
  await ready;try{await assert.rejects(publishDemoCandidate({pool:writer,candidate:next,approval,expected_base_release_id:base}));}finally{release();}
  const published=await first;assert.equal(published.outcome,'published');assert.equal(await count(),before+1);return published;
 });
 await check('stale_base_and_unapproved_source_rejection',async()=>{
  const before=await count();await assert.rejects(publishDemoCandidate({pool:writer,candidate:currentCandidate,approval:currentApproval,expected_base_release_id:base}),ProjectionError);
  await assert.rejects(publishDemoCandidate({pool:writer,candidate:next,approval:{...approval,candidate_sha256:'0'.repeat(64)},expected_base_release_id:await currentDemoRelease(reader)}),ProjectionError);
  const bad=JSON.parse(inputs.calls.toString());bad.source_id='unab-api-not-authorized';assert.throws(()=>prepareDemoCandidate({...inputs,calls:Buffer.from(JSON.stringify(bad)+'\n')}),ProjectionError);
  assert.equal(await count(),before);return {stale_or_older_candidate_rejected:true,unapproved_rejected:true,source_not_admitted_rejected:true};
 });
 await check('read_only_query_role_and_immutable_ready_releases',async()=>{
  await assert.rejects(reader.query("UPDATE public.oe2_pipeline_datasets SET name='forbidden'"));
  await assert.rejects(writer.query("UPDATE public.oe2_pipeline_releases SET status='staging',published_at=NULL WHERE id=$1",[base]));
  assert.equal((await reader.query('SELECT status FROM public.oe2_pipeline_releases WHERE id=$1',[base])).rows[0].status,'ready');
  return {reader_cannot_write:true,previous_release_immutable:true};
 });
}catch{result='FAIL';process.exitCode=1;}
finally{await writeFile('/outputs/checks.json',JSON.stringify({at:new Date().toISOString(),result,checks},null,2)+'\n');console.log(JSON.stringify({result,checks:checks.map(c=>({name:c.name,status:c.status,duration_ms:c.duration_ms}))}));await Promise.all([writer.end(),reader.end()]);}
