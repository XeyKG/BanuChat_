import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import {request as httpRequest} from 'node:http';
import {prepareDemoCandidate,CATEGORIES,SOURCES,hash} from '../../rag/src/oe2/pipeline/projection.js';
import {extractOe2Fixture} from '../../rag/src/oe2/flow.js';
import type {Oe2Category} from '../../rag/src/oe2/types.js';
import {projectOe2Publication,readOe2Demo,type Oe2Publication} from '../src/application/oe2-demo.js';
import {createAuthenticatedApiServer} from '../src/http/api-v2-server.js';
import {AuthError} from '../src/auth/primitives.js';
import type {AuthService} from '../src/auth/auth-service.js';
const now='2026-10-06T12:00:00Z',release='11111111-1111-4111-8111-111111111111';
async function publication():Promise<Oe2Publication>{
 const inputs={}as Record<Oe2Category,Buffer>;for(const category of CATEGORIES){const bytes=await readFile(new URL('../../../eval/oe2/fixtures/'+(category==='academic_offer'?'academic-offer':category)+'.json',import.meta.url));
  inputs[category]=Buffer.from(JSON.stringify({schema_version:'oe2-snapshot-1',category,source_id:SOURCES[category],source_sha256:hash(bytes),available_at:now,records:extractOe2Fixture(bytes,category,SOURCES[category])})+'\n');}
 const candidate=prepareDemoCandidate(inputs);
 return {valid:true,release_id:release,published_at:now,candidate,
  programming:candidate.programming.map(({key,...r})=>({programming_key:key,...r})),announcements:candidate.announcements.map(({key,...r})=>({announcement_key:key,...r}))};
}
test('OE2 published SQL projection preserves civil dates, types, hashes and temporal boundaries without paths',async()=>{
 const p=await publication(),programming=projectOe2Publication(p,'programming',{},'2026-11-03T04:59:59Z');assert.ok('programming'in programming);
 assert.equal(programming.programming[0]!.start_date,'2026-11-03');assert.equal(programming.programming[0]!.temporal_status,'upcoming');
 const begun=projectOe2Publication(p,'programming',{},'2026-11-03T05:00:00Z');assert.ok('programming'in begun);assert.equal(begun.programming[0]!.temporal_status,'in_progress');
 for(const [reference,status]of [['2026-10-01T00:00:00Z','upcoming'],[now,'active'],['2026-12-01T00:00:00Z','expired']]as const){const r=projectOe2Publication(p,'announcements',{type:'calls'},reference);assert.ok('announcements'in r);assert.ok(r.announcements.every(a=>a.temporal_status===status));}
 const news=projectOe2Publication(p,'announcements',{type:'news'},'2036-01-01T00:00:00Z');assert.ok('announcements'in news);assert.ok(news.announcements.every(a=>a.valid_until===null&&a.temporal_status==='published'));
 assert.doesNotMatch(JSON.stringify(programming),/source_path|candidate_text|snapshot_json|fields|password/u);assert.match(programming.programming[0]!.source.snapshot_sha256,/^[a-f0-9]{64}$/u);
});
test('OE2 empty/filter/limit and invalid source fail safely with one publication read',async()=>{
 const p=await publication();let calls=0;const reader={read:async()=>{calls++;return p;}};
 const empty=await readOe2Demo(reader,'programming',{query:'not-present'},now);assert.ok('programming'in empty);assert.equal(empty.programming.length,0);assert.equal(empty.release_id,release);assert.equal(calls,1);
 const one=await readOe2Demo(reader,'programming',{mode:'virtual',limit:1},now);assert.ok('programming'in one);assert.equal(one.programming.length,1);
 await assert.rejects(readOe2Demo(undefined,'programming',{},now),e=>e instanceof AuthError&&e.code==='DEPENDENCY_UNAVAILABLE');
 p.programming[0]!.period='altered';assert.throws(()=>projectOe2Publication(p,'programming',{},now),e=>e instanceof AuthError&&e.code==='DEPENDENCY_UNAVAILABLE');
});
test('OE2 HTTP uses existing Bearer auth; rejects selectors, duplicate filters, bodies and write methods; optional failure stays local',async()=>{
 const token='A'.repeat(43);let reads=0;const data=await publication();
 const resources={demoOe2:async(_token:string,kind:'programming'|'announcements',filters:object)=>{reads++;return projectOe2Publication(data,kind,filters,now);},list:async()=>({conversations:[]})} as unknown as Parameters<typeof createAuthenticatedApiServer>[0]['resources'];
 const auth={verifyAccess:async(value:string)=>{if(value!==token)throw new AuthError('UNAUTHENTICATED');}} as unknown as AuthService;
 const server=createAuthenticatedApiServer({auth,resources,oe2_demo:true,now:()=>now});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address()as AddressInfo).port;const get=(path:string,options:RequestInit={})=>fetch(base+'/api/v2'+path,{headers:{Authorization:'Bearer '+token},...options});
 try{
  assert.equal((await get('/demo/oe2/programming',{headers:{}})).status,401);assert.equal(reads,0);
  for(const path of ['?limit=0','?limit=51','?limit=1&limit=2','?query=x','?mode=../file','?profile_key=foreign','?release_id='+release,'?sql=select','?query=%00x'])assert.equal((await get('/demo/oe2/programming'+path)).status,400,path);
  for(const path of ['?type=course','?type=news&type=calls','?temporal_status=unknown','?mode=virtual'])assert.equal((await get('/demo/oe2/announcements'+path)).status,400,path);
  const write=await get('/demo/oe2/programming',{method:'POST',body:'{}'});assert.equal(write.status,405);assert.equal(write.headers.get('allow'),'GET');assert.equal(reads,0);
  const bodyStatus=await new Promise<number>((resolve,reject)=>{const r=httpRequest(base+'/api/v2/demo/oe2/programming',{method:'GET',headers:{Authorization:'Bearer '+token,'Content-Length':'2'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode!));});r.on('error',reject);r.end('{}');});assert.equal(bodyStatus,400);assert.equal(reads,0);
  const result=await get('/demo/oe2/programming');assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('vary'),'Authorization');assert.equal((await result.json()).evidence_mode,'fictional_auxiliary');
  resources.demoOe2=async()=>{throw Error('private SQL path credential');};const bad=await get('/demo/oe2/announcements');assert.equal(bad.status,500);assert.doesNotMatch(await bad.text(),/private|credential|SQL/u);
  resources.demoOe2=async()=>{throw new AuthError('DEPENDENCY_UNAVAILABLE');};assert.equal((await get('/demo/oe2/programming')).status,503);assert.equal((await get('/conversations')).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
 const historical=createAuthenticatedApiServer({auth,resources});await new Promise<void>(r=>historical.listen(0,'127.0.0.1',r));
 try{assert.equal((await fetch('http://127.0.0.1:'+(historical.address()as AddressInfo).port+'/api/v2/demo/oe2/programming')).status,404);}finally{historical.closeAllConnections();await new Promise<void>(r=>historical.close(()=>r()));}
});
