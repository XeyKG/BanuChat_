/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {AuthSession,type RefreshStore} from '../src/auth/auth-session';
import {installAuthSession} from '../src/auth/runtime';
import {getApiBaseUrl} from '../src/config/api';
import {createConversation,listConversations} from '../src/api/conversations';
import {sendMessage,MessageRequestError,isCitation} from '../src/api/messages';
import {getProfileProgress} from '../src/api/progress';
import {getCalendarEvents} from '../src/api/calendar';
import {getAnnouncements} from '../src/api/announcements';
import {getDocumentArtifact} from '../src/api/documents';

const id='11111111-1111-4111-8111-111111111111',base='http://127.0.0.1:3002/api/v2';
const access='A'.repeat(43),refresh='B'.repeat(42)+'A',next='C'.repeat(42)+'A';
const me={principal_id:id,synthetic_uid:'BCH-DEMO-4101',session_id:id,release_id:id,evidence_mode:'synthetic',session_expires_at:'2035-01-01T00:00:00Z',profile:{profile_key:'shared_fixture',alias:'Perfil ficticio compartido'},capabilities:['chat','history','progress','calendar','announcements','documents']};
const tokens={access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:900,session_expires_at:me.session_expires_at};
function store(initial:string|null=null){let value=initial;return {available:async()=>true,get:async()=>value,set:async(v:string)=>{value=v;},clear:async()=>{value=null;},inspect:()=>value} satisfies RefreshStore&{inspect():string|null};}
type Fetch=typeof fetch;
const response=(value:unknown,status=200)=>Response.json(value,{status});
function fixture(handler?:Fetch){const vault=store();const calls:Array<{url:string;init:RequestInit|undefined}>=[];
 const request:Fetch=async(url,init)=>{calls.push({url:String(url),init});if(String(url).endsWith('/auth/login'))return response(tokens);if(String(url).endsWith('/auth/me'))return response(me);if(String(url).endsWith('/auth/logout'))return new Response(null,{status:204});return handler?handler(url,init):response({});};
 return {vault,calls,client:new AuthSession(vault,()=>base,request)};
}
test.beforeEach(()=>{process.env.EXPO_PUBLIC_DEMO_MODE='synthetic';process.env.EXPO_PUBLIC_API_BASE_URL=base;process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';});

test('authenticated transport requires explicit local channel/v2 and rejects anonymous LAN/public/CCD targets',()=>{
 assert.equal(getApiBaseUrl(),base);
 for(const value of ['http://192.168.1.2:3002/api/v2','http://127.0.0.1:3000/api/v1','https://example.test/api/v2','http://user:pass@127.0.0.1:3002/api/v2']){process.env.EXPO_PUBLIC_API_BASE_URL=value;assert.throws(getApiBaseUrl);}
 process.env.EXPO_PUBLIC_API_BASE_URL=base;delete process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL;assert.throws(getApiBaseUrl);
});
test('login validates me, stores only refresh in vault and exposes no token/password in snapshots',async()=>{
 const f=fixture();await f.client.login(me.synthetic_uid,'contraseña ficticia para prueba');assert.equal(f.vault.inspect(),refresh);assert.equal(f.client.getSnapshot().me?.synthetic_uid,me.synthetic_uid);
 assert.ok(!JSON.stringify(f.client.getSnapshot()).includes(access));assert.ok(!JSON.stringify(f.client.getSnapshot()).includes(refresh));
 assert.equal(new Headers(f.calls[1].init?.headers).get('Authorization'),'Bearer '+access);
 assert.deepEqual(JSON.parse(String(f.calls[0].init?.body)),{synthetic_uid:me.synthetic_uid,password:'contraseña ficticia para prueba'});
});
test('unsupported storage and failed credentials cannot establish a simulated session',async()=>{
 let calls=0;const client=new AuthSession({...store(),available:async()=>false},()=>base,async()=>{calls++;return response(tokens);});await assert.rejects(client.login(me.synthetic_uid,'ficticio'));assert.notEqual(client.getSnapshot().phase,'authenticated');assert.equal(calls,0);
 const vault=store(),denied=new AuthSession(vault,()=>base,async()=>response({},401));await assert.rejects(denied.login(me.synthetic_uid,'incorrecta'));assert.equal(vault.inspect(),null);assert.equal(denied.getSnapshot().me,null);
});
test('refresh serializes concurrent expiry work, rotates vault and never persists access',async()=>{
 let now=1000,refreshes=0;const vault=store();const client=new AuthSession(vault,()=>base,async(url)=>{if(String(url).endsWith('/auth/login'))return response(tokens);if(String(url).endsWith('/auth/me'))return response(me);if(String(url).endsWith('/auth/refresh')){refreshes++;await new Promise(r=>setTimeout(r,5));return response({...tokens,refresh_token:next});}return response({});},()=>now);
 await client.login(me.synthetic_uid,'ficticio');now+=901000;await Promise.all([client.resource(base+'/me/progress'),client.resource(base+'/announcements')]);assert.equal(refreshes,1);assert.equal(vault.inspect(),next);
});
test('restart restores via refresh and server me; uncertain refresh removes its persisted predecessor without retry',async()=>{
 const vault=store(refresh);let calls=0;const client=new AuthSession(vault,()=>base,async(url)=>{calls++;return String(url).endsWith('/auth/refresh')?response({...tokens,refresh_token:next}):response(me);});await client.restore();assert.equal(client.getSnapshot().phase,'authenticated');assert.equal(calls,2);assert.equal(vault.inspect(),next);
 const uncertainStore=store(refresh),uncertain=new AuthSession(uncertainStore,()=>base,async()=>{throw new Error('Network');});await uncertain.restore();assert.equal(uncertainStore.inspect(),null);assert.equal(uncertain.getSnapshot().me,null);
});
test('401 invalidates memory/vault and logout cleans locally even when revocation cannot be confirmed',async()=>{
 const f=fixture(async()=>response({},401));await f.client.login(me.synthetic_uid,'ficticio');await assert.rejects(f.client.resource(base+'/announcements'));assert.equal(f.vault.inspect(),null);assert.equal(f.client.getSnapshot().me,null);
 let offline=false;const vault=store(),client=new AuthSession(vault,()=>base,async(url)=>{if(offline)throw new Error('Offline');return String(url).endsWith('/auth/login')?response(tokens):response(me);});await client.login(me.synthetic_uid,'ficticio');offline=true;assert.equal(await client.logout(),false);assert.equal(vault.inspect(),null);assert.equal(client.getSnapshot().logoutRemoteConfirmed,false);
});
test('late resource bodies cannot expose the previous signed-out account',async()=>{
 let release!:()=>void;const held=new Promise<void>(r=>release=r);const f=fixture(async()=>{const r=response({private_fixture:true});r.json=async()=>{await held;return {private_fixture:true};};return r;});await f.client.login(me.synthetic_uid,'ficticio');const r=await f.client.resource(base+'/announcements');const reading=r.json();await f.client.logout();release();await assert.rejects(reading);assert.equal(f.client.getSnapshot().me,null);
});
test('existing resource adapters use Bearer, exact v2 bodies/paths and protected citations; POST conflicts never retry',async()=>{
 let resourceCalls=0;const f=fixture(async(url,init)=>{resourceCalls++;const path=String(url).slice(base.length);
  if(path==='/conversations'&&init?.method==='POST'){assert.deepEqual(JSON.parse(String(init.body)),{});return response({conversation_id:id,profile_key:'shared_fixture',profile_alias:me.profile.alias,created_at:'2026-10-23T00:00:00Z'},201);}
  if(path.startsWith('/conversations?')){assert.ok(!path.includes('profile_key'));return response({conversations:[]});}
  if(path.includes('/messages'))return response({},409);
  if(path==='/me/progress')return response({release_id:id,profile:me.profile,courses:[]});
  if(path.startsWith('/calendar/events?'))return response({release_id:id,events:[]});
  if(path.startsWith('/announcements?'))return response({release_id:id,reference_time:'2026-10-23T00:00:00Z',announcements:[]});
  if(path.endsWith('/artifact'))return new Response('Documento ficticio');throw new Error('Unexpected path');});
 await f.client.login(me.synthetic_uid,'ficticio');installAuthSession(f.client);await createConversation('shared_fixture');await listConversations('shared_fixture');await getProfileProgress({profileKey:'shared_fixture'});await getCalendarEvents({dateFrom:'2026-10-23',dateTo:'2026-10-23'});await getAnnouncements({temporalStatus:'active'});await getDocumentArtifact(id);
 await assert.rejects(sendMessage(id,'hola'),e=>e instanceof MessageRequestError&&e.kind==='conflict');assert.equal(resourceCalls,7);
 for(const call of f.calls.slice(2))assert.equal(new Headers(call.init?.headers).get('Authorization'),'Bearer '+access);
 const citation={index:0,source_kind:'document',label:'Ficticio',locator:'document:fixture',release_id:id,document_version_id:id,artifact_url:`/api/v2/documents/${id}/artifact`};assert.equal(isCitation(citation),true);assert.equal(isCitation({...citation,artifact_url:`/api/v1/documents/${id}/artifact`}),false);
});
test('logout during a pending refresh discards its result and revokes the returned access once',async()=>{
 let now=1000,release!:()=>void,entered!:()=>void,revokes=0;const held=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>entered=r),vault=store();
 const client=new AuthSession(vault,()=>base,async(url)=>{
  if(String(url).endsWith('/auth/login'))return response(tokens);if(String(url).endsWith('/auth/me'))return response(me);
  if(String(url).endsWith('/auth/refresh')){entered();await held;return response({...tokens,access_token:next,refresh_token:next});}
  if(String(url).endsWith('/auth/logout')){revokes++;return new Response(null,{status:204});}return response({});
 },()=>now);
 await client.login(me.synthetic_uid,'ficticio');now+=901000;const pending=client.resource(base+'/announcements');await begun;
 await client.logout();release();await assert.rejects(pending);assert.equal(client.getSnapshot().me,null);assert.equal(vault.inspect(),null);assert.equal(revokes,1);
});
