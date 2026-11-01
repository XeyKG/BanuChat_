import assert from 'node:assert/strict';
import test from 'node:test';
import {WebChatCache} from '../src/session/web-chat-cache';

test('one session retains separate conversation drafts and uncertain operations across screen remounts',()=>{
 const cache=new WebChatCache();cache.reset(1);
 const draft=cache.slot(1,'a','draft',''),other=cache.slot(1,'b','draft','');cache.update(draft,'borrador sintético');
 assert.equal(cache.slot(1,'a','draft','').value,'borrador sintético');assert.equal(other.value,'');
 const pending=cache.slot<null|{content:string}>(1,'a','pending',null);cache.update(pending,{content:'envío sintético sin confirmar'});
 assert.deepEqual(cache.slot(1,'a','pending',null).value,{content:'envío sintético sin confirmar'});
});
test('logout clears existing references and ignores late async results of the previous account',()=>{
 const cache=new WebChatCache();cache.reset(1);const old=cache.slot<string[]>(1,'same-conversation','messages',[]);cache.update(old,['privado sintético']);cache.reset(null);
 assert.deepEqual(old.value,[]);cache.update(old,['respuesta tardía']);assert.deepEqual(old.value,[]);
 cache.reset(2);const next=cache.slot<string[]>(2,'same-conversation','messages',[]);cache.update(old,['otra respuesta tardía']);assert.deepEqual(next.value,[]);
});
test('pending completion updates only the original conversation and notifies its subscribers once',()=>{
 const cache=new WebChatCache();cache.reset(1);const first=cache.slot(1,'first','sending',false),second=cache.slot(1,'second','sending',false);let notified=0;first.listeners.add(()=>notified++);
 cache.update(first,true);cache.update(first,false);cache.update(first,false);assert.equal(notified,2);assert.equal(second.value,false);
});
