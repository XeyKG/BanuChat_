import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../src/notifications/model';

const principal='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333',release='22222222-2222-4222-8222-222222222222';
type Request={content:{data:model.BanuNotificationData;title:string};trigger:{date:Date}};
/** Execute the actual native adapter, replacing only Expo/OS/storage/network ports.
 * No React Native runtime, device state, new framework or implementation copy. */
function fixture(){
 let sequence=0;const now=Date.parse('2031-05-01T12:00:00-05:00'),storage=new Map<string,string>(),pending=new Map<string,Request>(),failCancellation=new Set<string>();
 let events=[{event_key:'demo-event',title:'Evento ficticio',description:'Dato sintético',event_type:'general',starts_at:'2031-05-04T10:00:00-05:00',ends_at:null,course_key:null,announcement_key:null}];
 const ports:Record<string,unknown>={
  'expo-constants':{expoVersion:null,expoConfig:{}},'expo-device':{isDevice:true},'react-native':{Platform:{OS:'android'}},
  'expo-secure-store':{WHEN_UNLOCKED_THIS_DEVICE_ONLY:1,async getItemAsync(key:string){return storage.get(key)??null;},async setItemAsync(key:string,value:string){storage.set(key,value);},async deleteItemAsync(key:string){storage.delete(key);}},
  'expo-notifications':{AndroidImportance:{DEFAULT:3},AndroidNotificationVisibility:{PRIVATE:0},SchedulableTriggerInputTypes:{DATE:'date'},async setNotificationChannelAsync(){},async scheduleNotificationAsync(request:Request){const id='native-'+(++sequence);pending.set(id,request);return id;},async cancelScheduledNotificationAsync(id:string){if(failCancellation.has(id))throw Error('OS_CANCEL_FAILED');pending.delete(id);}},
  '@/api/calendar':{async getCalendarEvents(){return {release_id:release,events};}},'@/api/announcements':{async getAnnouncements(){return {release_id:release,announcements:[]};}},
  '@/utils/bogota-date':{getBogotaCivilToday:()=> '2031-05-01',addCivilDays:()=> '2031-05-30'},'./model':model,
 };
 const source=readFileSync(new URL('../src/notifications/native-service.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,require:(name:string)=>{if(!(name in ports))throw Error('Unexpected dependency '+name);return ports[name];},Date:class extends Date{static now(){return now;}},Map,Set,Promise,JSON,Error},{filename:'native-service.fixture.js'});
 return {service:exports as typeof import('../src/notifications/native-service'),pending,storage,failCancellation,now,setEvents:(value:typeof events)=>{events=value;}};
}
test('native adapter schedules exactly 24 hours before an event and reconciles duplicates and updated dates',async()=>{
 const f=fixture(),input={principalId:principal,releaseId:release};await f.service.syncSyntheticReminders(input);assert.equal(f.pending.size,1);assert.equal([...f.pending.values()][0]!.trigger.date.toISOString(),'2031-05-03T15:00:00.000Z');
 await f.service.syncSyntheticReminders(input);assert.equal(f.pending.size,1);const old=[...f.pending.keys()][0]!;
 f.setEvents([{event_key:'demo-event',title:'Evento ficticio actualizado',description:'Dato sintético',event_type:'general',starts_at:'2031-05-05T10:00:00-05:00',ends_at:null,course_key:null,announcement_key:null}]);await f.service.syncSyntheticReminders(input);assert.equal(f.pending.size,1);assert.equal(f.pending.has(old),false);assert.equal([...f.pending.values()][0]!.trigger.date.toISOString(),'2031-05-04T15:00:00.000Z');assert.equal([...f.pending.values()][0]!.content.data.resource_key,'demo-event');
});
test('expired reminder times are not scheduled, even if the event itself is still future',async()=>{
 const f=fixture();f.setEvents([{event_key:'near',title:'Evento ficticio',description:'Dato sintético',event_type:'general',starts_at:'2031-05-01T18:00:00-05:00',ends_at:null,course_key:null,announcement_key:null}]);await f.service.syncSyntheticReminders({principalId:principal,releaseId:release});assert.equal(f.pending.size,0);
});
test('five-second test replacement leaves one pending test and persists the owning account preference',async()=>{
 const f=fixture();await f.service.scheduleSyntheticTest(principal);await f.service.scheduleSyntheticTest(principal);assert.equal(f.pending.size,1);assert.equal([...f.pending.values()][0]!.trigger.date.getTime(),f.now+5000);assert.equal((await f.service.loadNotificationPreference(principal)).enabled,true);assert.equal((await f.service.loadNotificationPreference(other)).enabled,false);
});
test('disable cancels only that account and leaves another account and its preference intact',async()=>{
 const f=fixture();await f.service.scheduleSyntheticTest(principal);await f.service.scheduleSyntheticTest(other);await f.service.disableNotificationsForAccount(principal);assert.equal(f.pending.size,1);assert.equal([...f.pending.values()][0]!.content.data.recipient_scope,other);assert.equal((await f.service.loadNotificationPreference(other)).enabled,true);assert.equal((await f.service.loadNotificationPreference(principal)).scheduled.length,0);
});
test('failed OS cancellation is reported and preserves the preference needed for explicit recovery',async()=>{
 const f=fixture();await f.service.scheduleSyntheticTest(principal);const id=[...f.pending.keys()][0]!;f.failCancellation.add(id);await assert.rejects(f.service.disableNotificationsForAccount(principal));assert.equal(f.pending.has(id),true);assert.equal((await f.service.loadNotificationPreference(principal)).scheduled[0]!.identifier,id);
 f.failCancellation.clear();await f.service.disableNotificationsForAccount(principal);assert.equal(f.pending.size,0);
});
test('an uncertain cancellation never blindly replaces a pending test with another duplicate',async()=>{
 const f=fixture();await f.service.scheduleSyntheticTest(principal);f.failCancellation.add([...f.pending.keys()][0]!);await assert.rejects(f.service.scheduleSyntheticTest(principal));assert.equal(f.pending.size,1);
});
