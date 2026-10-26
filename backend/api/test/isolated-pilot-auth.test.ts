import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {assertIsolatedPilotAuthScope} from '../src/auth/isolated-pilot-scope.js';
const scope={release_id:'11111111-1111-4111-8111-111111111111',manifest_sha256:'a'.repeat(64)};
const valid={database:'banuchat_p0_operational',role:'banuchat_pilot_http_runtime',marker:true,no_current:true,no_publisher:true,pinned:true,unsafe:false};
const pool=(row:unknown)=>({async query(){return {rows:row?[row]:[]};}} as unknown as Pool);
test('the isolated auth composition rejects product databases even if a query would appear valid',async()=>{
 await assert.rejects(assertIsolatedPilotAuthScope(pool(valid),'banuchat_unified',scope.release_id,scope));
});
test('isolated auth fails closed on missing marker, publication, wrong role, scope mismatch or excess permission',async()=>{
 for(const change of [{marker:false},{no_current:false},{no_publisher:false},{pinned:false},{unsafe:true},{role:'admin'},{database:'banuchat_unified'}])await assert.rejects(assertIsolatedPilotAuthScope(pool({...valid,...change}),'banuchat_p0_operational',scope.release_id,scope));
 await assert.rejects(assertIsolatedPilotAuthScope(pool(undefined),'banuchat_p0_operational',scope.release_id,scope));
 await assertIsolatedPilotAuthScope(pool(valid),'banuchat_p0_operational',scope.release_id,scope);
});
