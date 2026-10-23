/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {AuthSession,type RefreshStore} from '../src/auth/auth-session';
import {isCcdLocal,isCcdAuthenticated,isCcdKnowledge} from '../src/config/demo-mode';
import {getApiBaseUrl} from '../src/config/api';
import {installAuthSession,resourceFetch} from '../src/auth/runtime';
import {createConversation,listConversations} from '../src/api/conversations';
const id='11111111-1111-4111-8111-111111111111',base='http://127.0.0.1:3003/api/v2',token='A'.repeat(43),refresh='B'.repeat(42)+'A';
const me={principal_id:id,synthetic_uid:'U08000001',session_id:id,session_expires_at:'2035-01-01T00:00:00Z',release_id:id,evidence_mode:'ccd_local',profile:{profile_key:'ccd-local-demo',alias:'Demostración CCD local — sin identidad institucional'},capabilities:['chat','history','documents']};
const pair={access_token:token,refresh_token:refresh,token_type:'Bearer',expires_in:900,session_expires_at:me.session_expires_at};
function vault(){let value:string|null=null;return{available:async()=>true,get:async()=>value,set:async(v:string)=>{value=v;},clear:async()=>{value=null;},inspect:()=>value} satisfies RefreshStore&{inspect():string|null};}
test.beforeEach(()=>{process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';process.env.EXPO_PUBLIC_API_BASE_URL=base;process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';});
test('authenticated CCD is explicitly separate from historical v1 and rejects anonymous/LAN configuration',()=>{
 assert.equal(isCcdAuthenticated(),true);assert.equal(isCcdLocal(),false);assert.equal(isCcdKnowledge(),true);assert.equal(getApiBaseUrl(),base);
 for(const url of ['http://127.0.0.1:3001/api/v1','http://192.168.1.2:3003/api/v2']){process.env.EXPO_PUBLIC_API_BASE_URL=url;assert.throws(getApiBaseUrl);}
});
test('CCD U+8 login validates knowledge/capabilities and uses protected owner resources',async()=>{
 const store=vault(),calls:Array<{url:string;options:RequestInit|undefined}>=[];
 const client=new AuthSession(store,()=>base,async(url,options)=>{const path=String(url);calls.push({url:path,options});return Response.json(path.endsWith('/auth/login')?pair:path.endsWith('/auth/me')?me:options?.method==='POST'?{conversation_id:id,profile_key:me.profile.profile_key,profile_alias:me.profile.alias,created_at:'2026-10-23T00:00:00Z'}:{conversations:[]},{status:path.endsWith('/conversations')&&options?.method==='POST'?201:200});});
 await client.login(me.synthetic_uid,'Contraseña ficticia independiente');installAuthSession(client);assert.equal(store.inspect(),refresh);assert.equal(client.getSnapshot().me?.evidence_mode,'ccd_local');
 await createConversation('ccd-local-demo');await listConversations('ccd-local-demo');assert.ok(calls.every(c=>!c.url.includes('profile_key=')&&!c.url.includes('/api/v1/')));assert.equal(new Headers(calls.at(-1)!.options?.headers).get('Authorization'),'Bearer '+token);assert.equal(calls.find(c=>c.url.endsWith('/conversations')&&c.options?.method==='POST')?.options?.body,'{}');
 assert.ok(!JSON.stringify(client.getSnapshot()).includes(refresh));
});
test('CCD rejects synthetic knowledge, fabricated capabilities or an academic profile without falling back',async()=>{
 for(const change of [{evidence_mode:'synthetic'},{capabilities:['chat','history','progress','documents']},{profile:{profile_key:'student_001',alias:'Otro perfil'}}]){
  const store=vault();const client=new AuthSession(store,()=>base,async(url)=>String(url).endsWith('/auth/login')?Response.json(pair):String(url).endsWith('/auth/logout')?new Response(null,{status:204}):Response.json({...me,...change}));
  await assert.rejects(client.login(me.synthetic_uid,'Contraseña ficticia independiente'));assert.equal(store.inspect(),null);assert.equal(client.getSnapshot().me,null);
 }
});
test('authenticated CCD resourceFetch has no anonymous bypass',async()=>{
 const client=new AuthSession(vault(),()=>base,async()=>{throw Error('Unexpected network');});installAuthSession(client);await assert.rejects(resourceFetch(base+'/conversations'));
});
test('CCD rejects noncanonical UID before login transport',async()=>{
 const client=new AuthSession(vault(),()=>base,async()=>{throw Error('Unexpected network');});
 for(const uid of ['U08000001\n','U0800000１','u08000001','U080000001'])await assert.rejects(client.login(uid,'Contraseña ficticia independiente'));
});
