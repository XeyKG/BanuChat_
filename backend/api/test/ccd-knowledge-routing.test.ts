import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedResponder} from '../src/auth/unified-product.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
import type {IntentRouter} from '../src/routing/intent-router-types.js';
test('adopted CCD recognition precedes synthetic completion orchestration',async()=>{
 let calls=0;
 const sql={async query(){return {rows:[{schema_version:'ccd-1.3.0'}],rowCount:1};}} as SqlQueryClient;
 const router={catalog_valid:true,catalog_version:'fixture',route(){return {route:'profile_progress',parameters:{},response_variant:null};}} as IntentRouter;
 const responder=unifiedResponder({sql,router,principal:'fixture',aux:{release_id:'aux',profile_key:'fixture',alias:'Fixture'},mcp_environment:{},rag:async q=>{calls++;return {release_id:q.release_id,content:'Documented recognition.',insufficient_evidence:false,citations:[],citation_records:[]};}});
 const answer=await responder({release_id:'documentary',query:'¿Qué reconocimiento obtengo cuando ya completé la ruta?',profile_key:'fixture',now:'2026-10-26T12:00:00Z'});
 assert.equal(calls,1);assert.equal(answer.content,'Documented recognition.');
});
