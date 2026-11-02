import assert from 'node:assert/strict';
import test from 'node:test';
import {createMotionPreferenceSource} from '../src/ui/motion-preference';

test('motion consumers share one OS subscription and release it after the last unmount', async () => {
  let starts=0,stops=0;
  let emit: (value:boolean)=>void = () => {};
  const source=createMotionPreferenceSource({read:async()=>false,listen:listener=>{starts++;emit=listener;return {remove:()=>{stops++;}};}});
  const seenA:(boolean|undefined)[]=[],seenB:(boolean|undefined)[]=[];
  const a=source.subscribe(()=>seenA.push(source.getSnapshot()));
  const b=source.subscribe(()=>seenB.push(source.getSnapshot()));
  await Promise.resolve();assert.equal(starts,1);assert.deepEqual(seenA,[false]);assert.deepEqual(seenB,[false]);
  emit(true);emit(true);assert.deepEqual(seenA,[false,true]);assert.deepEqual(seenB,[false,true]);
  a();assert.equal(stops,0);emit(false);assert.deepEqual(seenA,[false,true]);assert.deepEqual(seenB,[false,true,false]);
  b();assert.equal(stops,1);assert.equal(source.getSnapshot(),undefined);
});

test('a live motion preference is not overwritten by a stale initial query or an unmounted generation', async () => {
  const queries:((value:boolean)=>void)[]=[];
  let emit: (value:boolean)=>void = () => {};
  const source=createMotionPreferenceSource({read:()=>new Promise(resolve=>queries.push(resolve)),listen:listener=>{emit=listener;return {remove:()=>{}};}});
  const stop=source.subscribe(()=>{});emit(true);queries[0]!(false);await Promise.resolve();assert.equal(source.getSnapshot(),true);
  const oldEvent=emit;stop();const next=source.subscribe(()=>{});oldEvent(true);assert.equal(source.getSnapshot(),undefined);
  queries[1]!(false);await Promise.resolve();assert.equal(source.getSnapshot(),false);next();
});

test('a failed native motion query does not reject outside the source or fabricate a preference', async () => {
  const source=createMotionPreferenceSource({read:async()=>{throw Error('UNAVAILABLE');},listen:()=>undefined});
  const stop=source.subscribe(()=>{});await Promise.resolve();assert.equal(source.getSnapshot(),undefined);stop();
});
