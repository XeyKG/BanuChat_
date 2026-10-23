/** Additional real HTTP owner and artifact denials; no generator call is allowed. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {environment,pool,fingerprint,evidence,storage} from './auth-i1b/environment.js';
import {demoAccounts} from './auth-i1b/accounts.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
const e=await environment(),db=pool(e),runtime=pool(e,'runtime'),accounts=await demoAccounts(),before=await fingerprint(db,true);
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
try{
 let ragCalls=0;server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deployment,rateKey:Buffer.from(e.rateKey,'hex'),evidence_mode:'ccd_local',artifacts:storage,document_rag:async()=>{ragCalls++;throw Error('UNEXPECTED_RAG');}});
 await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`,base=origin+'/api/v2';
 async function request(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const response=await fetch((path.startsWith('/api/')?origin:base)+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  return{status:response.status,body:response.status===204?null:await response.json() as any};
 }
 const tokens=[];for(const a of accounts){const login=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(login.status,200);tokens.push(login.body.access_token as string);}
 const a=tokens[0]!,b=tokens[1]!,created=await request('/conversations',b,{});assert.equal(created.status,201);const id=created.body.conversation_id;
 assert.equal((await request('/conversations/'+id,b)).status,200);
 for(const method of ['GET','DELETE'])assert.equal((await request('/conversations/'+id,a,undefined,method)).status,404);
 assert.equal((await request('/conversations/'+id+'/messages',a,{content:'Consulta ajena'})).status,404);
 const list=await request('/conversations',a);assert.equal(list.status,200);assert.ok(list.body.conversations.every((c:any)=>c.conversation_id!==id));
 assert.equal((await request('/conversations/'+id,b,undefined,'DELETE')).status,204);assert.equal((await request('/conversations/'+id,b)).status,404);
 const version=(await db.query('SELECT id FROM banuchat.document_versions ORDER BY id LIMIT 1')).rows[0].id;
 assert.equal((await request(`/documents/${version}/artifact`)).status,401);
 assert.equal((await request(`/documents/${randomUUID()}/artifact`,a)).status,404);
 assert.equal((await request(`/documents/${version}/artifact?path=external`,a)).status,400);
 assert.equal((await request(`/api/v1/documents/${version}/artifact`)).status,404);
 for(const token of tokens)assert.equal((await request('/auth/logout',token,undefined,'POST')).status,204);
 assert.equal(ragCalls,0);assert.equal(await fingerprint(db,true),before);
 await evidence('boundaries',{checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),a_reads_b:404,a_posts_b:404,a_deletes_b:404,a_list_excludes_b:true,b_deletes_own:204,deleted_detail:404,anonymous_artifact:401,unknown_artifact:404,external_path_query:400,v1_artifact:404,rag_calls:0,corpus_before:before,corpus_after:await fingerprint(db,true)});
 console.log(JSON.stringify({owner_reverse:true,artifact_boundaries:true,corpus_unchanged:true}));
}catch{console.error('I1B boundary check failed; no automatic POST retry.');process.exitCode=1;}
finally{server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await Promise.all([db,runtime].map(p=>p.end()));}
