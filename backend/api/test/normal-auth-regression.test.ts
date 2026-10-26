import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {AuthService} from '../src/auth/auth-service.js';
const deployment='11111111-1111-4111-8111-111111111111';
function database(unsafe=false){
 const queries:string[]=[];const base={database:'banuchat_unified',synthetic:false,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false,db_write:false,ddl:false,memberships:false,other_database:false,owns_objects:false,corpus_write:unsafe,conversation_update:false};
 const pool={async query(text:string){queries.push(text);assert.doesNotMatch(text,/pilot_scope|isolated_pilot_marker/u);return {rows:text.includes('SELECT version FROM banuchat_aux.product_config')?[{version:1}]:text.includes(' AS valid')?[{valid:true}]:[base]};}} as unknown as Pool;
 return {pool,queries};
}
const hasher={hash:async()=> 'controlled dummy hash',verify:async()=>false};
test('normal unified AuthService without isolated_pilot uses only normal runtime and corpus guards',async()=>{
 const db=database();const service=await AuthService.create({pool:db.pool,expectedDatabase:'banuchat_unified',deploymentId:deployment,rateKey:Buffer.alloc(32,1),hasher,evidence_mode:'ccd_local',unified:true});
 assert.ok(service);assert.equal(db.queries.length,3);assert.ok(db.queries.some(q=>q.includes('banuchat.datasets')));assert.ok(db.queries.some(q=>q.includes('banuchat_auth.runtime_scope')));
});
test('absent experimental option never substitutes a marker for failing normal privilege checks',async()=>{
 const db=database(true);await assert.rejects(AuthService.create({pool:db.pool,expectedDatabase:'banuchat_unified',deploymentId:deployment,rateKey:Buffer.alloc(32,1),hasher,evidence_mode:'ccd_local',unified:true}));assert.equal(db.queries.length,1);
});
