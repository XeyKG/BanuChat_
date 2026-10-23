/** New isolated synthetic copy only; prove both UID formats and frozen business mode over real HTTP/SQL. */
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {environment,pool,fingerprint,evidence} from './auth-i1b/environment.js';
import {LocalPasswordAdministrator} from '../src/auth/local-password-administrator.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
const e=await environment('uid'),db=pool(e),runtime=pool(e,'runtime'),before=await fingerprint(db);
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
try{
 const admin=await LocalPasswordAdministrator.create({pool:runtime,database:e.database,deployment:e.deployment});
 const accounts=['BCH-DEMO-9401','U08000003'].map(uid=>({uid,password:randomBytes(30).toString('base64url')}));
 for(const a of accounts)await admin.establish(a.uid,a.password,true);
 server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),document_rag:async()=>{throw Error('UNEXPECTED_RAG');}});
 await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/v2`;
 async function request(path:string,token?:string,body?:unknown){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});return{status:response.status,body:response.status===204?null:await response.json() as any};}
 const checks=[];const owned:string[]=[];
 for(const a of accounts){
  const principal=(await db.query('SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid=$1',[a.uid])).rows[0].id;
  const login=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(login.status,200);const token=login.body.access_token;
  const me=await request('/auth/me',token);assert.equal(me.status,200);assert.equal(me.body.principal_id,principal);assert.equal(me.body.synthetic_uid,a.uid);assert.equal(me.body.evidence_mode,'synthetic');assert.deepEqual(me.body.capabilities,['chat','history','progress','calendar','announcements','documents']);
  const created=await request('/conversations',token,{});assert.equal(created.status,201);owned.push(created.body.conversation_id);assert.equal((await request('/conversations/'+created.body.conversation_id,token)).status,200);
  for(const prior of owned.slice(0,-1))assert.equal((await request('/conversations/'+prior,token)).status,404);
  assert.equal((await request('/me/progress',token)).status,200);
  const refresh=await request('/auth/refresh',undefined,{refresh_token:login.body.refresh_token});assert.equal(refresh.status,200);assert.equal((await request('/auth/me',token)).status,401);
  const logout=await fetch(base+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+refresh.body.access_token}});assert.equal(logout.status,204);assert.equal((await request('/auth/me',refresh.body.access_token)).status,401);
  checks.push({uid:a.uid,principal_preserved:true,login:200,me:200,create:201,own_detail:200,progress:200,refresh:200,old_access:401,logout:204});
 }
 assert.equal(await fingerprint(db),before);
 await evidence('synthetic-regression',{checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),database:e.database,checks,foreign_detail:404,corpus_before:before,corpus_after:await fingerprint(db),rag_tested:false,mail_sent:false});
 console.log(JSON.stringify({synthetic_http:true,uid_formats:2,corpus_unchanged:true,rag_tested:false}));
}finally{server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await Promise.all([db,runtime].map(p=>p.end()));}
