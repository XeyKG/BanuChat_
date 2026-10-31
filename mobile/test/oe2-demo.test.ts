import assert from 'node:assert/strict';
import test from 'node:test';
import {parseOe2Response,formatOe2CivilDate,getOe2Demo,Oe2Error,OE2_ERROR_TEXT,OE2_STATUS_TEXT} from '../src/api/oe2-demo';
import {AuthSession} from '../src/auth/auth-session';
import {installAuthSession} from '../src/auth/runtime';
const id='11111111-1111-4111-8111-111111111111',date='2026-10-30T12:00:00Z',base='http://127.0.0.1:3004/api/v2';
const source={source_id:'fixture-academic-offer-v1',record_id:'OFF-001',source_version:'fixture-v1',published_at:date,record_sha256:'a'.repeat(64),snapshot_sha256:'b'.repeat(64)};
const envelope={release_id:id,published_at:date,reference_time:date,evidence_mode:'fictional_auxiliary'};
const programming={...envelope,programming:[{id:'oe2-programming',title:'Programación ficticia',course_code:'DEMO-01',period:'DEMO-2026',mode:'virtual',start_date:'2026-11-03',end_date:'2026-11-28',temporal_status:'upcoming',source}]};
test('OE2 mobile keeps dates civil, requires fictional provenance and never presents news as an open call',()=>{
 assert.equal(formatOe2CivilDate('2026-11-03'),'03/11/2026');assert.throws(()=>formatOe2CivilDate('2026-02-30'));assert.equal(parseOe2Response(programming,'programming').programming?.length,1);
 for(const value of [{...programming,evidence_mode:'ccd_local'},{...programming,programming:[{...programming.programming[0],start_date:'2026-11-03T00:00:00Z'}]}])assert.throws(()=>parseOe2Response(value,'programming'));
 const news={...envelope,announcements:[{id:'news',type:'news',title:'Novedad ficticia',description:'Sin vencimiento',valid_from:date,valid_until:null,temporal_status:'published',source}]};
 assert.equal(parseOe2Response(news,'news').announcements?.length,1);assert.match(OE2_STATUS_TEXT.published!,/sin vencimiento/u);
 assert.throws(()=>parseOe2Response({...news,announcements:[{...news.announcements[0],temporal_status:'active'}]},'news'));
 assert.throws(()=>parseOe2Response(news,'calls'));assert.equal(parseOe2Response({...programming,programming:[]},'programming').programming?.length,0);
});
test('OE2 mobile uses authenticated v2 GET only; exposes safe unavailable/retry, session and connection states',async()=>{
 process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';process.env.EXPO_PUBLIC_API_BASE_URL=base;process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';
 let status=200;const requests:string[]=[];const me={principal_id:id,synthetic_uid:'U08000001',session_id:id,session_expires_at:'2035-01-01T00:00:00Z',release_id:id,evidence_mode:'ccd_local',profile:{profile_key:'account-001',alias:'Ficticio'},capabilities:['chat','history','progress','calendar','announcements','documents']};
 const pair={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:me.session_expires_at};
 const client=new AuthSession({available:async()=>true,get:async()=>null,set:async()=>{},clear:async()=>{}},()=>base,async(url,options)=>{
  if(String(url).endsWith('/auth/login'))return Response.json(pair);if(String(url).endsWith('/auth/me'))return Response.json(me);
  requests.push(String(url));assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer '+pair.access_token);
  if(status===0)throw Error('private network');return Response.json(status===200?programming:{error:{code:'DEPENDENCY_UNAVAILABLE'}},{status});
 });await client.login(me.synthetic_uid,'Fictitious independent secret');installAuthSession(client);
 assert.equal((await getOe2Demo('programming','DEMO')).programming?.length,1);assert.match(requests[0]!,/\/api\/v2\/demo\/oe2\/programming\?limit=20&query=DEMO$/u);
 status=503;await assert.rejects(getOe2Demo('programming'),e=>e instanceof Oe2Error&&e.kind==='unavailable');assert.match(OE2_ERROR_TEXT.unavailable,/demás funciones siguen separados/u);
 status=200;assert.equal((await getOe2Demo('programming')).programming?.length,1);status=0;await assert.rejects(getOe2Demo('programming'),e=>e instanceof Oe2Error&&e.kind==='connection');
 await assert.rejects(client.resource(base+'/demo/oe2/programming',{method:'POST'}));await assert.rejects(client.resource(base+'/demo/oe2/arbitrary'));
 status=401;await assert.rejects(getOe2Demo('programming'),e=>e instanceof Oe2Error&&e.kind==='session');assert.equal(client.getSnapshot().phase,'signed_out');assert.equal(client.getSnapshot().sessionExpired,true);
 await client.login(me.synthetic_uid,'Fictitious independent secret');assert.equal(client.getSnapshot().sessionExpired,undefined);
 assert.match(OE2_ERROR_TEXT.session,/sesión expiró/u);assert.ok(requests.every(url=>!url.includes('password')&&!url.includes('profile_key')));
});
