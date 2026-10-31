import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../src/notifications/model';

/** Run the actual provider callback with hook/OS ports, not a copy of its gates. */
function fixture(previousPrincipal:string|null=null,failCancellation=false){
 const principal='11111111-1111-4111-8111-111111111111',pushes:string[]=[],effects:Array<()=>unknown>=[];
 const errors:unknown[]=[];let refIndex=0,stateIndex=0;
 let response:((value:unknown)=>void)|undefined;
 const ports:Record<string,unknown>={
  react:{createContext:()=>({Provider:'provider'}),useCallback:(fn:unknown)=>fn,useContext:()=>null,useEffect:(fn:()=>unknown)=>{effects.push(fn);},useMemo:(fn:()=>unknown)=>fn(),useRef:(value:unknown)=>({current:refIndex++===0?previousPrincipal:value}),useState:(value:unknown)=>{const index=stateIndex++;return [value,(next:unknown)=>{if(index===4)errors.push(next);}];}},
  'react/jsx-runtime':{jsx:()=>null},'react-native':{Platform:{OS:'android'}},'expo-router':{useRouter:()=>({push:(path:string)=>{pushes.push(path);}})},
  '@/auth/auth-provider':{useAuth:()=>({snapshot:{phase:'authenticated',me:{principal_id:principal,release_id:'release',capabilities:['calendar','announcements']}}})},
  'expo-notifications':{addNotificationReceivedListener:()=>({remove(){}}),addNotificationResponseReceivedListener:(fn:(value:unknown)=>void)=>{response=fn;return {remove(){}};},getLastNotificationResponse:()=>null,clearLastNotificationResponse(){}},
  './native-service':{configureForegroundNotifications(){},async getNotificationPermission(){return 'granted';},getRemotePushState:()=> 'project_unconfigured',async loadNotificationPreference(){return {enabled:false,scheduled:[]};},reminderCount:()=>0,async disableNotificationsForAccount(){if(failCancellation)throw Error('OS_CANCEL_FAILED');}},'./model':model,
 };
 const source=readFileSync(new URL('../src/notifications/notification-provider.tsx',import.meta.url),'utf8'),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const exports:{NotificationProvider?:(props:{children:null})=>unknown}={};vm.runInNewContext(js,{exports,require:(name:string)=>{if(!(name in ports))throw Error('Unexpected dependency '+name);return ports[name];},Date,Set,Promise},{filename:'notification-provider.fixture.js'});exports.NotificationProvider!({children:null});effects.forEach(effect=>effect());assert.ok(response);
 const payload={schema:'banuchat-notification-1',destination:'calendar',recipient_scope:principal,dedupe_key:'test:calendar:synthetic-event',resource_key:'synthetic-event'};
 return {pushes,errors,send:(identifier:string,data:unknown=payload)=>response!({notification:{request:{identifier,content:{data}}}}),payload};
}
test('a new native notification for the same event can open again; repeated callbacks for one identifier cannot',()=>{
 const f=fixture();f.send('first-delivery');f.send('first-delivery');assert.deepEqual(f.pushes,['/calendar']);f.send('second-delivery');assert.deepEqual(f.pushes,['/calendar','/calendar']);
});
test('notification responses for another account or an invalid destination never navigate',()=>{
 const f=fixture();f.send('foreign',{...f.payload,recipient_scope:'33333333-3333-4333-8333-333333333333'});f.send('invalid',{...f.payload,destination:'/chat'});assert.deepEqual(f.pushes,[]);f.send('own');assert.deepEqual(f.pushes,['/calendar']);
});
test('account-change cancellation failures are handled and reported without an unhandled rejection',async()=>{
 const f=fixture('33333333-3333-4333-8333-333333333333',true);await new Promise(resolve=>setImmediate(resolve));assert.ok(f.errors.includes(true));
});
