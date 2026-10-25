/// <reference types="node" />
/** In-memory vault/HTTP doubles only. Does not validate native SecureStore or UI. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {AuthSession,type RefreshStore} from '../src/auth/auth-session';
const base='http://127.0.0.1:3003/api/v2';
test('CCD account switch and restored session use only the current owner token/history',async()=>{
 process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';process.env.EXPO_PUBLIC_API_BASE_URL=base;process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 const access=['A'.repeat(43),'B'.repeat(42)+'A'],refresh=['C'.repeat(42)+'A','D'.repeat(42)+'A'];
 let saved:string|null=null;const revoked=new Set<string>();
 const vault:RefreshStore={available:async()=>true,get:async()=>saved,set:async value=>{saved=value;},clear:async()=>{saved=null;}};
 const transport:typeof fetch=async(url,init)=>{
  const path=String(url).slice(base.length),body=init?.body?JSON.parse(String(init.body)):null;
  const token=new Headers(init?.headers).get('Authorization')?.slice(7);let index=access.indexOf(token??'');
  if(path==='/auth/login')index=body.synthetic_uid==='U08000001'?0:1;
  if(path==='/auth/refresh')index=refresh.indexOf(body.refresh_token);
  if(path==='/auth/login'||path==='/auth/refresh')return Response.json({access_token:access[index],refresh_token:refresh[index],token_type:'Bearer',expires_in:900,session_expires_at:'2035-01-01T00:00:00Z'});
  if(index<0||revoked.has(token!))return Response.json({}, {status:401});
  if(path==='/auth/logout'){revoked.add(token!);return new Response(null,{status:204});}
  if(path==='/auth/me')return Response.json({principal_id:ids[index],synthetic_uid:index===0?'U08000001':'U08000002',session_id:ids[index],release_id:ids[0],session_expires_at:'2035-01-01T00:00:00Z',evidence_mode:'ccd_local',profile:{profile_key:'account-'+index,alias:'Usuario'},capabilities:['chat','history','progress','calendar','announcements','documents']});
  assert.equal(path,'/conversations');return Response.json({owner:ids[index],conversations:[{conversation_id:ids[index]}]});
 };
 const first=new AuthSession(vault,()=>base,transport);
 await first.login('U08000001','Contraseña ficticia de test');assert.equal((await(await first.resource(base+'/conversations')).json()).owner,ids[0]);
 assert.equal(await first.logout(),true);assert.equal(saved,null);await assert.rejects(first.resource(base+'/conversations'));
 await first.login('U08000002','Otra contraseña ficticia de test');assert.equal(first.getSnapshot().me?.principal_id,ids[1]);assert.equal(saved,refresh[1]);
 const restarted=new AuthSession(vault,()=>base,transport);await restarted.restore();assert.equal(restarted.getSnapshot().me?.principal_id,ids[1]);
 const history=await(await restarted.resource(base+'/conversations')).json();assert.deepEqual(history,{owner:ids[1],conversations:[{conversation_id:ids[1]}]});
 assert.equal(await restarted.logout(),true);assert.equal(saved,null);const afterLogout=new AuthSession(vault,()=>base,transport);await afterLogout.restore();assert.notEqual(afterLogout.getSnapshot().phase,'authenticated');
});
