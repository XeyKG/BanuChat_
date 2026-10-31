import assert from 'node:assert/strict';
import test from 'node:test';
import {parseChangesResponse,formatChangeValue,getOe2Changes,CHANGE_LABELS,type ChangesResponse} from '../src/api/oe2-changes';
import {AuthSession} from '../src/auth/auth-session';
import {installAuthSession} from '../src/auth/runtime';
const current='11111111-1111-4111-8111-111111111111',previous='22222222-2222-4222-8222-222222222222';
const origin={source_id:'fixture-academic-offer-v1',record_id:'OFF-001',source_version:'fixture-v1',source_published_at:'2026-10-01T13:00:00Z',observed_at:'2026-10-30T10:00:00Z'};
function sample():ChangesResponse{return {evidence_mode:'fictional_auxiliary',comparison_status:'compared',current_release_id:current,previous_release_id:previous,current_published_at:'2026-10-30T12:00:00.000002Z',previous_published_at:'2026-10-30T12:00:00.000001Z',counts:{created:0,modified:1,removed:0,unchanged:5},matched_count:1,has_more:false,changes:[{id:'oe2-academic_offer-'+'a'.repeat(40),category:'academic_offer',change_type:'modified',title:'Programación ficticia',current_available:true,previous_source:origin,current_source:{...origin,source_version:'fixture-v2'},fields:[{field:'end_date',before:'2026-11-28',after:'2026-12-05'}]}]};}
test('Banu al día retains changed values, civil dates, distinct observation/publication times and microsecond order',()=>{
 const r=parseChangesResponse(sample());assert.equal(r.changes.length,1);assert.equal(formatChangeValue('end_date',r.changes[0]!.fields[0]!.before),'28/11/2026');assert.equal(formatChangeValue('end_date',r.changes[0]!.fields[0]!.after),'05/12/2026');
 assert.notEqual(r.current_published_at,r.changes[0]!.current_source!.source_published_at);assert.notEqual(r.current_published_at,r.changes[0]!.current_source!.observed_at);
 for(const alter of [(r:ChangesResponse)=>{r.changes[0]!.fields[0]!.after='2026-02-30';},(r:ChangesResponse)=>{r.changes[0]!.fields[0]!.after=r.changes[0]!.fields[0]!.before;},(r:ChangesResponse)=>{r.changes[0]!.current_source!.record_id='other';},(r:ChangesResponse)=>{r.previous_published_at=r.current_published_at;}]){const bad=sample();alter(bad);assert.throws(()=>parseChangesResponse(bad));}
});
test('Removed records have no current link or current source; first release and empty filtered comparison stay distinct',()=>{
 const r=sample();r.counts={created:0,modified:0,removed:1,unchanged:5};const row=r.changes[0]!;row.change_type='removed';row.current_available=false;row.current_source=null;row.fields[0]!.after=null;
 assert.equal(parseChangesResponse(r).changes[0]!.current_available,false);assert.equal(CHANGE_LABELS.removed,'Retirado');assert.equal(formatChangeValue('end_date',null),'No presente');
 const invalid=structuredClone(r);invalid.changes[0]!.current_available=true;assert.throws(()=>parseChangesResponse(invalid));
 const first={...sample(),comparison_status:'no_previous',previous_release_id:null,previous_published_at:null,changes:[],counts:{created:0,modified:0,removed:0,unchanged:0},matched_count:0};assert.equal(parseChangesResponse(first).comparison_status,'no_previous');assert.throws(()=>parseChangesResponse({...first,counts:{...first.counts,created:6}}));
 const empty={...sample(),changes:[],matched_count:0};assert.equal(parseChangesResponse(empty).comparison_status,'compared');assert.equal(parseChangesResponse(empty).counts.modified,1);
 assert.throws(()=>parseChangesResponse({...empty,candidate:'private'}));
});
test('Changes use the existing Bearer transport and closed GET route; outage/retry and expired session are safe',async()=>{
 const base='http://127.0.0.1:3004/api/v2';process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';process.env.EXPO_PUBLIC_API_BASE_URL=base;process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';let status=200;const requests:string[]=[];
 const me={principal_id:current,synthetic_uid:'U08000001',session_id:current,session_expires_at:'2035-01-01T00:00:00Z',release_id:current,evidence_mode:'ccd_local',profile:{profile_key:'account-001',alias:'Ficticio'},capabilities:['chat','history','progress','calendar','announcements','documents']};
 const pair={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:me.session_expires_at};
 const client=new AuthSession({available:async()=>true,get:async()=>null,set:async()=>{},clear:async()=>{}},()=>base,async(url,options)=>{if(String(url).endsWith('/auth/login'))return Response.json(pair);if(String(url).endsWith('/auth/me'))return Response.json(me);requests.push(String(url));assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer '+pair.access_token);return Response.json(status===200?sample():{error:{code:'DEPENDENCY_UNAVAILABLE'}},{status});});await client.login(me.synthetic_uid,'Fictitious independent secret');installAuthSession(client);
 assert.equal((await getOe2Changes('academic_offer','modified')).changes.length,1);assert.match(requests[0]!,/\/demo\/oe2\/changes\?limit=20&category=academic_offer&change_type=modified$/u);
 await assert.rejects(client.resource(base+'/demo/oe2/changes',{method:'POST'}));status=503;await assert.rejects(getOe2Changes(),e=>(e as {kind:string}).kind==='unavailable');status=200;assert.equal((await getOe2Changes()).changes.length,1);
 status=401;await assert.rejects(getOe2Changes(),e=>(e as {kind:string}).kind==='session');assert.equal(client.getSnapshot().phase,'signed_out');
});
