/// <reference types="node" />
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {AuthSession} from '../src/auth/auth-session';
import {installAuthSession} from '../src/auth/runtime';
import {createConversation,deleteConversation,getConversation} from '../src/api/conversations';
import {sendMessage} from '../src/api/messages';
import {getProfileProgress} from '../src/api/progress';
import {getCalendarEvents} from '../src/api/calendar';
import {getAnnouncements} from '../src/api/announcements';
import {getDocumentArtifact} from '../src/api/documents';
import {demoAccounts} from '../../backend/api/test/auth-i1b/accounts';
process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';
process.env.EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:3004/api/v2';
process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse';
const account=(await demoAccounts())[0]!;
// Evaluation identity only. The application accepts current from /auth/me.
const expectedCurrent='f01c1c37-2d3f-4bc7-8940-fe724eb71c9a';
let saved:string|null=null;
const client=new AuthSession({available:async()=>true,get:async()=>saved,set:async v=>{saved=v;},clear:async()=>{saved=null;}},()=>process.env.EXPO_PUBLIC_API_BASE_URL!);
installAuthSession(client);
const report:{result:string;checks:Record<string,boolean>;boundary:string}={result:'FAIL',checks:{},boundary:'Actual Mobile service adapters and AuthSession over real HTTP; native UI and SecureStore not exercised'};
let conversationId:string|null=null;
try{
 await client.login(account.uid,account.password);
 assert.equal(client.getSnapshot().me!.release_id,expectedCurrent);
 assert.equal(client.getSnapshot().me!.evidence_mode,'ccd_local');
 assert.deepEqual(client.getSnapshot().me!.capabilities,['chat','history','progress','calendar','announcements','documents']);
 report.checks.observed_documentary_current=true;
 const profile=client.getSnapshot().me!.profile;
 const chat=await createConversation(profile.profile_key);
 conversationId=chat.conversation_id;
 const answer=await sendMessage(chat.conversation_id,'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?');
 const citation=answer.assistant_message.citations.find(c=>c.source_kind==='document');
 assert.ok(citation&&citation.document_version_id);assert.ok((await getDocumentArtifact(citation.document_version_id)).length>0);
 report.checks.chat_document_citation=true;
 const progress=await getProfileProgress({profileKey:profile.profile_key,statuses:['completed']});assert.ok(progress.courses.length>0);
 const calendar=await getCalendarEvents({dateFrom:'2026-10-01',dateTo:'2026-11-30'});assert.ok(calendar.events.length>0);
 const announcements=await getAnnouncements({temporalStatus:'all'});assert.ok(announcements.announcements.length>0);
 assert.equal(calendar.release_id,progress.release_id);assert.notEqual(calendar.release_id,client.getSnapshot().me!.release_id);report.checks.independent_structured_release=true;
 const multi=await sendMessage(chat.conversation_id,'Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?');
 assert.ok(multi.assistant_message.citations.some(c=>c.source_kind==='profile_course'));
 const detail=await getConversation(chat.conversation_id);assert.equal(detail.messages.length,4);assert.deepEqual(detail.messages[3],multi.assistant_message);
 report.checks.structured_sources_and_restored_history=true;report.result='PASS';
}finally{
 if(conversationId){try{await deleteConversation(conversationId);report.checks.test_conversation_deleted=true;}catch{report.result='FAIL';report.checks.test_conversation_deleted=false;}}
 report.checks.remote_logout_confirmed=await client.logout().catch(()=>false);
 if(!report.checks.remote_logout_confirmed)report.result='FAIL';
 const directory=new URL('../../data/ccd/local/p3-mobile-current-validation/',import.meta.url);
 await mkdir(directory,{recursive:true});
 const url=new URL('unified-client-results.json',directory);
 await writeFile(url,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 if(report.result!=='PASS')process.exitCode=1;
}

