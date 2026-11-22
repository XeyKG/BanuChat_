/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {createMemoryRefreshStore} from '../src/auth/memory-store';
import {AuthSession, SessionError} from '../src/auth/auth-session';
import {webApiBaseUrl, LOCAL_WEB_ORIGIN} from '../src/config/web-origin';

test('public web only uses the configured HTTPS origin for authenticated requests', () => {
  const origin = 'https://demo.banuchat.test';
  assert.equal(webApiBaseUrl(origin, origin), origin + '/api/v2');
  assert.throws(() => webApiBaseUrl(LOCAL_WEB_ORIGIN, origin));
  assert.throws(() => webApiBaseUrl('https://other.test', origin));
  assert.throws(() => webApiBaseUrl('http://demo.banuchat.test', 'http://demo.banuchat.test'));
});
import {Alert} from '../src/ui/confirmation.web';

test('web channel accepts only its exact loopback origin; no remote, credentials or alternate ports', () => {
  assert.equal(webApiBaseUrl(LOCAL_WEB_ORIGIN), LOCAL_WEB_ORIGIN+'/api/v2');
  for (const origin of ['https://example.com','http://localhost:8085','http://127.0.0.1:3004','http://0.0.0.0:8085','http://127.0.0.1:8085.evil.test','http://user:pass@127.0.0.1:8085','null']) assert.throws(() => webApiBaseUrl(origin));
});
test('memory stores isolate tabs and reloads; restore does not touch the network; clear removes refresh', async () => {
  const first = createMemoryRefreshStore(), tab = createMemoryRefreshStore(), reload = createMemoryRefreshStore();
  await first.set('synthetic-test-value');
  assert.equal(await tab.get(),null); assert.equal(await reload.get(),null);
  const client = new AuthSession(reload, () => webApiBaseUrl(LOCAL_WEB_ORIGIN), async () => {throw new Error('Network must not be used');});
  await client.restore(); assert.equal(client.getSnapshot().phase,'signed_out');
  await first.clear(); assert.equal(await first.get(),null);
});

test('login distinguishes rejected credentials from service failure without exposing response payloads or retrying', async () => {
  for (const [status,kind] of [[401,'credentials'],[503,'unavailable'],[0,'unavailable']] as const) {
    let calls=0;
    const client = new AuthSession(createMemoryRefreshStore(), () => webApiBaseUrl(LOCAL_WEB_ORIGIN), async () => {
      calls++; if(!status) throw new Error('private transport details');
      return Response.json({private_detail:'must never be shown'}, {status});
    });
    await assert.rejects(client.login('U08000001','ficticio'), error => error instanceof SessionError && 'kind' in error && error.kind === kind && !error.message.includes('private'));
    assert.equal(calls,1); assert.equal(client.getSnapshot().phase,'signed_out');
  }
});

test('web memory session rotates once on demand and logout clears both tokens through AuthSession', async () => {
  process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';
  const id='11111111-1111-4111-8111-111111111111',base=webApiBaseUrl(LOCAL_WEB_ORIGIN);
  const me={principal_id:id,synthetic_uid:'U08000001',session_id:id,release_id:id,evidence_mode:'ccd_local',session_expires_at:'2035-01-01T00:00:00Z',profile:{profile_key:'fictional',alias:'Ficticio'},capabilities:['chat','history','progress','calendar','announcements','documents']};
  const pair={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:me.session_expires_at};
  let now=1000,refreshes=0,revocations=0;
  const store=createMemoryRefreshStore();
  const client=new AuthSession(store,()=>base,async(url,init)=>{
    if(String(url).endsWith('/auth/login'))return Response.json(pair);
    if(String(url).endsWith('/auth/me'))return Response.json(me);
    if(String(url).endsWith('/auth/refresh')){refreshes++;return Response.json({...pair,refresh_token:'C'.repeat(42)+'A'});}
    if(String(url).endsWith('/auth/logout')){revocations++;return new Response(null,{status:204});}
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer '+pair.access_token);return Response.json({});
  },()=>now);
  await client.login(me.synthetic_uid,'ficticio');now+=901000;
  await Promise.all([client.resource(base+'/me/progress'),client.resource(base+'/announcements')]);
  const media=base+'/editorial/attachments/'+id;
  assert.equal((await client.resource(media)).status,200);
  for(const url of [base+'/editorial/news',base+'/editorial/login',media+'?redirect=anything',base+'/editorial/images/../news']){
    await assert.rejects(client.resource(url),SessionError);
  }
  await assert.rejects(client.resource(media,{method:'POST'}),SessionError);
  assert.equal(refreshes,1);assert.equal(await store.get(),'C'.repeat(42)+'A');
  assert.equal(await client.logout(),true);assert.equal(revocations,1);assert.equal(await store.get(),null);
  await assert.rejects(client.resource(base+'/me/progress'));assert.equal(client.getSnapshot().me,null);
});

test('web destructive confirmation dismisses without executing and accepts exactly one action', () => {
  const original=Object.getOwnPropertyDescriptor(globalThis,'window');let accepted=false,actions=0,cancellations=0,dialogs=0;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{confirm:(text:string)=>{dialogs++;assert.match(text,/Eliminar/);return accepted;},alert:()=>{}}});
  try{
    const buttons=[{text:'Cancelar',style:'cancel' as const,onPress:()=>{cancellations++;}},{text:'Eliminar',style:'destructive' as const,onPress:()=>{actions++;}}];
    Alert.alert('Eliminar conversación','Solo la conversación propia.',buttons);assert.equal(actions,0);assert.equal(cancellations,1);
    accepted=true;Alert.alert('Eliminar conversación','Solo la conversación propia.',buttons);assert.equal(actions,1);assert.equal(dialogs,2);
  }finally{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');}
});
