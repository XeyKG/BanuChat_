import assert from 'node:assert/strict';
import test from 'node:test';
import {assessApi,assessExpo,assessContainer,assessPublicMobile,assessModel,authorizedSerials,assessAdbReverse,assessListener,assessProbeFailure} from '../src/operations/ccd-preflight.js';
const secret='SENSITIVE_SENTINEL';
test('OPS distinguishes absent components, rejected configuration and unavailable permission',()=>{
 for(const [name,code,status] of [['dependencies','ENOENT','FAIL'],['postgres_identity','ERR_ASSERTION','FAIL'],['api_v2_anonymous','ECONNREFUSED','FAIL'],['postgres_identity','EACCES','NOT_EVALUABLE'],['adb','ENOENT','NOT_EVALUABLE']]){
  const r=assessProbeFailure(name!,{message:secret,cause:{code},private:secret});assert.equal(r.status,status);assert.ok(!JSON.stringify(r).includes(secret));
 }
 assert.equal(assessProbeFailure('ollama',null).status,'NOT_EVALUABLE');
});
test('OPS recognizes authenticated v2 but never claims running revision from 401',()=>{
 assert.equal(assessApi(401,{error:{code:'UNAUTHENTICATED',request_id:'12345678-1234-1234-1234-123456789012'}}).status,'PASS');
 for(const [status,body] of [[200,{token:secret}],[401,{error:{code:secret}}],[503,{error:secret}],[401,null]] as const){const r=assessApi(status,body);assert.equal(r.status,'FAIL');assert.ok(!JSON.stringify(r).includes(secret));}
});
test('OPS rejects missing dependencies and wrong Expo major',()=>{
 assert.equal(assessExpo('~57.0.26','57.0.26').status,'PASS');
 for(const pair of [['~57.0.26',undefined],['~56.0.0','56.0.0'],['~57.0.26','58.0.0'],[secret,secret]])assert.equal(assessExpo(pair[0],pair[1]).status,'FAIL');
});
test('OPS checks container identity, volume, network and exclusive loopback',()=>{
 const expected={id:'container',network:'isolated',volume:'ccd'};
 const good={Id:'container',Name:'/banuchat-ccd-auth-i1b-test',State:{Running:true},Config:{Labels:{'banuchat.task':'BCH05-CCD-AUTH-I1B'},Env:[secret]},Mounts:[{Type:'volume',Name:'ccd'}],NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55443'}]},Networks:{isolated:{}}}};
 assert.equal(assessContainer(good,expected).status,'PASS');
 assert.deepEqual(assessContainer({...good,State:{Running:false},NetworkSettings:{Ports:{},Networks:{}}},expected),{check:'postgres_container',status:'FAIL',reason:'EXPECTED_LAB_CONTAINER_STOPPED'});
 for(const bad of [null,{...good,Id:'other'},{...good,Name:'/banuchat_ccd_dev'},{...good,Mounts:[]},{...good,State:{Running:false}},{...good,NetworkSettings:{...good.NetworkSettings,Networks:{other:{}}}},{...good,NetworkSettings:{...good.NetworkSettings,Ports:{'5432/tcp':[{HostIp:'0.0.0.0',HostPort:'55443'}]}}}]){const r=assessContainer(bad,expected);assert.equal(r.status,'FAIL');assert.ok(!JSON.stringify(r).includes(secret));}
});
test('OPS distinguishes unavailable shell config from incorrect configuration',()=>{
 assert.equal(assessPublicMobile({}).status,'NOT_EVALUABLE');
 const correct={EXPO_PUBLIC_DEMO_MODE:'ccd_authenticated',EXPO_PUBLIC_API_BASE_URL:'http://127.0.0.1:3003/api/v2',EXPO_PUBLIC_AUTH_LOCAL_CHANNEL:'adb_reverse'};
 assert.equal(assessPublicMobile(correct).status,'PASS');
 for(const key of Object.keys(correct))assert.equal(assessPublicMobile({...correct,[key]:secret}).status,'FAIL');
});
test('OPS rejects model mismatch and missing capabilities without copying raw metadata',()=>{
 const expected={model:'fixture',digest:'a'.repeat(64),capability:'embedding',dimension:1024};
 const tags={models:[{name:'fixture',digest:expected.digest}]},show={capabilities:['embedding'],model_info:{'general.architecture':'qwen3','qwen3.embedding_length':1024},template:secret};
 assert.equal(assessModel(tags,show,expected,'embedding').status,'PASS');
 for(const pair of [[{},show],[tags,{}],[tags,{...show,capabilities:[]}],[tags,{...show,model_info:{}}]]){const r=assessModel(pair[0],pair[1],expected,'embedding');assert.equal(r.status,'FAIL');assert.ok(!JSON.stringify(r).includes(secret));}
});
test('OPS separates multiple authorized devices and never emits serials',()=>{
 const serials=authorizedSerials(`List of devices attached\n${secret}\tdevice\nSECOND\tdevice\nLOCKED\tunauthorized\nOFFLINE\toffline\n`);assert.deepEqual(serials,[secret,'SECOND']);
 const r=assessAdbReverse(`${secret} tcp:3003 tcp:3003\n${secret} tcp:8084 tcp:8084`,1);assert.equal(r.status,'PASS');assert.ok(!JSON.stringify(r).includes(secret));
 assert.equal(assessAdbReverse(`${secret} tcp:3003 tcp:3003`,2).status,'FAIL');assert.equal(assessAdbReverse('',1).status,'FAIL');
});
test('OPS rejects wildcard/LAN listeners and absent API listener',()=>{
 assert.equal(assessListener(['127.0.0.1']).status,'PASS');
 for(const addresses of [[],['0.0.0.0'],['::'],['192.168.1.2'],['127.0.0.1','0.0.0.0']])assert.equal(assessListener(addresses).status,'FAIL');
});
