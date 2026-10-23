import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {connect} from 'node:net';
import {createRequire} from 'node:module';
import test from 'node:test';
import {AuthService} from '../src/auth/auth-service.js';
import {createAuthenticatedRuntimeServer} from '../src/authenticated-runtime.js';
import type {DocumentRagResponder} from '../src/application/messages.js';
import {environment,pool,account,phrase,root,fingerprint} from './auth-p21/environment.js';
const obj=(v:unknown)=>v as Record<string,unknown>;
const require=createRequire(new URL('../../mcp-server/package.json',import.meta.url));
interface Validator {(v:unknown):boolean;errors?:unknown;}
interface Compiler {addSchema(v:unknown):void;compile(v:unknown):Validator;addFormat(n:string,v:boolean):void;}
const Ajv=(require('ajv/dist/2020.js') as {default:new(v:unknown)=>Compiler}).default;
test('AUTH-P2.1 phase E: real HTTP loopback and PostgreSQL with A/B isolation',async t=>{
 const phase=obj(JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/phase-c.json',import.meta.url),'utf8')));assert.equal(phase.result,'PASS','Phase C is mandatory before HTTP integration');
 const e=await environment(),db=pool(e),runtime=pool(e,true);const before=await fingerprint(db);
 const fixture=JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/fixture.json',import.meta.url),'utf8')) as {first:{release:string;document:string};second:{release:string;document:string}};
 const r=fixture.second,bytes=await readFile(root+'/documents/auth-guide.md'),hash=createHash('sha256').update(bytes).digest('hex');
 assert.equal(phase.deploymentId,e.deploymentId);assert.equal(phase.database,e.database);assert.equal(phase.release,r.release);
 const spec=obj(JSON.parse(await readFile(new URL('../openapi-v2.yaml',import.meta.url),'utf8')));
 const compiler=new Ajv({strict:true,strictTypes:false,allErrors:true});(require('ajv-formats') as (c:Compiler)=>void)(compiler);compiler.addFormat('binary',true);
 compiler.addSchema({$id:'urn:banuchat:auth-p21', $defs:JSON.parse(JSON.stringify(obj(spec.components).schemas).replaceAll('#/components/schemas/','#/$defs/'))});
 function valid(name:string,value:unknown){const check=compiler.compile({$ref:'urn:banuchat:auth-p21#/$defs/'+name});assert.equal(check(value),true,JSON.stringify(check.errors));}
 await db.query('DELETE FROM banuchat_auth.auth_rate_limits'); // task-only fixtures, never production cleanup.
 const sequence=Number((await db.query("SELECT GREATEST(COALESCE(max(substring(synthetic_uid from 10)::integer),2200),2200) n FROM banuchat_auth.accounts")).rows[0].n);
 const a=await account(db,String(sequence+1),[r.release,fixture.first.release]),b=await account(db,String(sequence+2),[r.release,fixture.first.release]);
 const core=await AuthService.create({pool:runtime,expectedDatabase:e.database,deploymentId:e.deploymentId,rateKey:Buffer.from(e.rateKey,'hex')});
 let generationCalls=0;let generate:DocumentRagResponder=async input=>({release_id:input.release_id,content:'Respuesta documental ficticia.',insufficient_evidence:false,
  citations:[{index:0,source_kind:'document',label:'Documento ficticio',locator:'document:auth_guide',release_id:input.release_id,document_version_id:r.document,artifact_url:`/api/v1/documents/${r.document}/artifact`}],
  citation_records:[{citation_index:0,dataset_release_id:input.release_id,source_kind:'document',source_path:'documents/auth-guide.md',source_locator:'document:auth_guide',source_sha256:hash,document_version_id:r.document,chunk_id:null,course_key:null,event_key:null,announcement_key:null,profile_key:null}]});
 const server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deploymentId,rateKey:Buffer.from(e.rateKey,'hex'),
  router:{catalog_valid:true,catalog_version:'test-only',route:input=>input.content==='hola'?{route:'basic_social',parameters:{},response_variant:'greeting'}:{route:'agent_fallback',parameters:{},response_variant:null}},
  document_rag:async input=>{generationCalls++;return generate(input);},artifacts:{root},now:()=> '2026-10-22T15:00:00Z'});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address==='object');const port=address.port;
 type Result={status:number;headers:Record<string,string|string[]|undefined>;body:Record<string,unknown>;bytes:Buffer};
 async function req(method:string,path:string,token?:string,body?:unknown,headers:Record<string,string|string[]>={}):Promise<Result>{
  const data=body===undefined?undefined:Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));
  return new Promise((resolve,reject)=>{const request=httpRequest({host:'127.0.0.1',port,method,path,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json','Content-Length':String(data.length)}:{}),...headers}},response=>{
   const chunks:Buffer[]=[];response.on('data',(v:Buffer)=>chunks.push(v));response.on('end',()=>{const bytes=Buffer.concat(chunks);let body:Record<string,unknown>={};if(String(response.headers['content-type']).startsWith('application/json'))body=obj(JSON.parse(bytes.toString('utf8')));resolve({status:response.statusCode!,headers:response.headers,body,bytes});});
  });request.setTimeout(7000,()=>request.destroy(new Error('Isolated HTTP timeout')));request.on('error',reject);request.end(data);});
 }
 async function raw(target:string,header:string){return new Promise<string>((resolve,reject)=>{const s=connect(port,'127.0.0.1',()=>s.end(`GET ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n${header}\r\n`));let text='';s.on('data',d=>text+=d.toString());s.on('end',()=>resolve(text));s.on('error',reject);s.setTimeout(7000,()=>s.destroy(new Error('Raw HTTP timeout')));});}
 function error(result:Result,status:number){assert.equal(result.status,status);assert.equal(result.headers['cache-control'],'no-store');assert.equal(result.headers.vary,'Authorization');assert.ok(obj(result.body.error).request_id);assert.equal(Object.keys(result.body).join(','),'error');assert.deepEqual(Object.keys(obj(result.body.error)).sort(),['code','message','request_id']);assert.ok(!JSON.stringify(result.body).includes(phrase));}
 const checks:Array<{name:string;result:string}>=[];let failed=0;
 const run=(name:string,work:()=>Promise<void>)=>t.test(name,async()=>{try{await work();checks.push({name,result:'PASS'});}catch(err){failed++;checks.push({name,result:'FAIL'});throw err;}});
 let ta='',tb='',chat='';
 try{
 await run('real login/me; separate synthetic principals share only the academic profile',async()=>{
  const ra=await req('POST','/api/v2/auth/login',undefined,{synthetic_uid:a.uid,password:phrase}),rb=await req('POST','/api/v2/auth/login',undefined,{synthetic_uid:b.uid,password:phrase});
  assert.equal(ra.status,200);valid('token_response',ra.body);valid('token_response',rb.body);ta=String(ra.body.access_token);tb=String(rb.body.access_token);
  const me=await req('GET','/api/v2/auth/me',ta);valid('current_session',me.body);assert.equal(me.body.principal_id,a.id);assert.equal(obj(me.body.profile).profile_key,'auth_fixture');
 });
 await run('create conversation atomically with owner, closed request and exact Location',async()=>{
  const result=await req('POST','/api/v2/conversations',ta,{});assert.equal(result.status,201);valid('created_conversation',result.body);chat=String(result.body.conversation_id);assert.equal(result.headers.location,'/api/v2/conversations/'+chat);
  assert.equal((await db.query('SELECT principal_id FROM banuchat_auth.conversation_owners WHERE conversation_id=$1',[chat])).rows[0].principal_id,a.id);
  error(await req('POST','/api/v2/conversations',ta,{profile_key:'auth_fixture'}),400);
 });
 await run('A can send and read coherent historical document citations with v2 artifact links',async()=>{
  const result=await req('POST',`/api/v2/conversations/${chat}/messages`,ta,{content:'Consulta documental ficticia'});assert.equal(result.status,201);valid('send_message_response',result.body);
  const detail=await req('GET','/api/v2/conversations/'+chat.toUpperCase(),ta);assert.equal(detail.status,200);valid('conversation_detail',detail.body);
  const messages=detail.body.messages as Record<string,unknown>[];const cite=(obj(messages[1]).citations as Record<string,unknown>[])[0]!;assert.equal(cite.release_id,r.release);assert.equal(cite.artifact_url,`/api/v2/documents/${r.document}/artifact`);
 });
 await run('B cannot list/read/send/delete A chat; unknown UUID indistinguishable; legacy remains unowned',async()=>{
  const legacy=(await db.query("INSERT INTO banuchat.conversations(dataset_release_id,profile_key) VALUES($1,'auth_fixture') RETURNING id",[r.release])).rows[0].id as string;
  for(const id of [chat,randomUUID(),legacy]){error(await req('GET','/api/v2/conversations/'+id,tb),404);error(await req('POST',`/api/v2/conversations/${id}/messages`,tb,{content:'Consulta ficticia'}),404);error(await req('DELETE','/api/v2/conversations/'+id,tb),404);}
  const listB=await req('GET','/api/v2/conversations?limit=1',tb);valid('conversations_response',listB.body);assert.deepEqual(listB.body.conversations,[]);
  const listA=await req('GET','/api/v2/conversations?limit=1',ta);assert.equal((listA.body.conversations as Record<string,unknown>[])[0]?.conversation_id,chat);
 });
 await run('progress binding, calendar and announcements reuse real services and v2 schemas',async()=>{
  const progress=await req('GET','/api/v2/me/progress?statuses=in_progress',ta);assert.equal(progress.status,200);valid('progress_response',progress.body);assert.equal((progress.body.courses as Record<string,unknown>[])[0]?.progress_percent,25);
  const calendar=await req('GET','/api/v2/calendar/events?date_from=2026-10-22&date_to=2026-10-22',ta);assert.equal(calendar.status,200);valid('calendar_response',calendar.body);assert.equal((calendar.body.events as unknown[]).length,1);
  const announcements=await req('GET','/api/v2/announcements',ta);assert.equal(announcements.status,200);valid('announcements_response',announcements.body);assert.equal((announcements.body.announcements as unknown[]).length,1);
 });
 await run('common document authorization, historical exact bytes, Range ignored, no public link',async()=>{
  for(const id of [r.document,fixture.first.document]){const artifact=await req('GET',`/api/v2/documents/${id}/artifact`,tb,undefined,{Range:'bytes=0-4'});assert.equal(artifact.status,200);assert.deepEqual(artifact.bytes,bytes);assert.equal(artifact.headers['content-length'],String(bytes.length));assert.equal(artifact.headers['x-content-type-options'],'nosniff');assert.equal(artifact.headers['content-disposition'],`attachment; filename="${id}.bin"`);}
  error(await req('GET',`/api/v2/documents/${randomUUID()}/artifact`,ta),404);
 });
 await run('GET/POST/DELETE require session before UUID/filter validation; no v1 bypass',async()=>{
  const calls=generationCalls;for(const [method,path,body] of [['GET','/api/v2/conversations/bad',undefined],['POST',`/api/v2/conversations/${chat}/messages`,{content:'consulta'}],['DELETE','/api/v2/conversations/'+chat,undefined]] as const)error(await req(method,path,undefined,body),401);
  for(const path of ['/api/v1/profiles','/api/v1/conversations','/api/v1/conversations/'+chat,'/api/v2/profiles','/api/v2/auth/signup'])error(await req('GET',path,ta),404);
  error(await req('GET','/api/v2/auth/password/reset',ta),405); // AUTH-P3.1 mounts this POST route.
  assert.equal(generationCalls,calls);
 });
 await run('closed JSON, escaped duplicate members, invalid Unicode/types/content/query/UUID rejected',async()=>{
  for(const body of [Buffer.from('{"content":"a","cont\\u0065nt":"b"}'),Buffer.from('{"content":"\\ud800"}'),{content:4},{content:'  '},{content:'a',principal_id:a.id},Buffer.from([0xff])])error(await req('POST',`/api/v2/conversations/${chat}/messages`,ta,body),400);
  for(const path of ['/api/v2/conversations?profile_key=auth_fixture','/api/v2/conversations?limit=1&limit=2','/api/v2/conversations?limit=01','/api/v2/conversations/bad','/api/v2/me/progress?statuses=completed&statuses=completed','/api/v2/calendar/events?date_from=2026-02-30&date_to=2026-03-01','/api/v2/announcements?temporal_status=bad','/api/v2/announcements?query=%FF'])error(await req('GET',path,ta),400);
  error(await req('POST','/api/v2/conversations',ta,{}, {'Content-Encoding':'gzip'}),400);error(await req('GET','/api/v2/conversations',ta,Buffer.from('x')),400);
  const method=await req('PUT','/api/v2/conversations',ta);error(method,405);assert.equal(method.headers.allow,'GET, POST');
 });
 await run('body/target/header limits and duplicate Authorization sane HTTP errors',async()=>{
  error(await req('POST','/api/v2/conversations',ta,Buffer.alloc(16385,32)),413);
  error(await req('GET','/api/v2/conversations?x='+ 'a'.repeat(8200),ta),413);
  const oversized=await raw('/api/v2/conversations','X-Test: '+'a'.repeat(17000)+'\r\n');assert.ok(oversized.startsWith('HTTP/1.1 413'));assert.ok(oversized.includes('PAYLOAD_TOO_LARGE'));assert.ok(oversized.includes('no-store'));
  error(await req('GET','/api/v2/conversations',undefined,undefined,{Authorization:['Bearer '+ta,'Bearer '+tb]}),401);
 });
 await run('grant revoked is 403; foreign UUID is not revealed without corpus permission',async()=>{
  await db.query('UPDATE banuchat_auth.corpus_grants SET revoked_at=clock_timestamp() WHERE principal_id=$1',[b.id]);
  try{error(await req('GET','/api/v2/conversations/'+chat,tb),403);error(await req('GET','/api/v2/announcements',tb),403);}finally{await db.query('UPDATE banuchat_auth.corpus_grants SET revoked_at=NULL WHERE principal_id=$1',[b.id]);}
 });
 await run('user switch and revoked/altered/expired tokens retain no previous permissions',async()=>{
  error(await req('GET','/api/v2/conversations/'+chat,tb),404);error(await req('GET','/api/v2/conversations',ta.slice(0,20)+'A'+ta.slice(21)),401);
  const pair=await core.login({synthetic_uid:b.uid,password:phrase},{origin:'http-test',requestId:randomUUID()});const s=await core.authenticate(pair.access_token);
  await db.query("UPDATE banuchat_auth.sessions SET access_expires_at=access_issued_at+interval '1 millisecond' WHERE id=$1",[s.sessionId]);error(await req('GET','/api/v2/conversations',pair.access_token),401);
 });
 await run('revocation wins during controlled generation: no locks held, no partial turn',async()=>{
  const pair=await core.login({synthetic_uid:a.uid,password:phrase},{origin:'http-test',requestId:randomUUID()});const original=generate;let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),blocked=new Promise<void>(r=>release=r);
  generate=async input=>{enter();await blocked;return original(input);};const initial=(await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[chat])).rows[0].n;
  const pending=req('POST',`/api/v2/conversations/${chat}/messages`,pair.access_token,{content:'Pregunta ficticia detenida'});await entered;
  try{const probe=await db.connect();try{await probe.query('BEGIN');await probe.query('SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE NOWAIT',[a.id]);await probe.query('SELECT id FROM banuchat.conversations WHERE id=$1 FOR UPDATE NOWAIT',[chat]);await probe.query('ROLLBACK');}finally{probe.release();}
   error(await req('DELETE','/api/v2/conversations/'+chat,ta),409);const logout=await req('POST','/api/v2/auth/logout',pair.access_token);assert.equal(logout.status,204);
  }finally{release();generate=original;}error(await pending,401);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[chat])).rows[0].n,initial);
 });
 await run('create rollback on failed owner insert',async()=>{
  const before=(await db.query('SELECT count(*)::int n FROM banuchat.conversations')).rows[0].n;await db.query('REVOKE INSERT ON banuchat_auth.conversation_owners FROM auth_p21_runtime');
  try{error(await req('POST','/api/v2/conversations',ta,{}),500);}finally{await db.query('GRANT INSERT ON banuchat_auth.conversation_owners TO auth_p21_runtime');}
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.conversations')).rows[0].n,before);
 });
 await run('publication during generation returns 409; historical detail remains coherent',async()=>{
  const original=generate;let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),blocked=new Promise<void>(r=>release=r);
  generate=async input=>{enter();await blocked;return original(input);};
  const pending=req('POST',`/api/v2/conversations/${chat}/messages`,ta,{content:'Consulta ficticia concurrente a publicación'});await entered;
  try{await db.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[fixture.first.release]);release();error(await pending,409);
   const detail=await req('GET','/api/v2/conversations/'+chat,ta);assert.equal(detail.status,200);valid('conversation_detail',detail.body);
   assert.equal((detail.body.messages as unknown[]).length,2);
  }finally{release();generate=original;await db.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[r.release]);}
 });
 await run('missing current binding approval denies new/progress access, retains owned history',async()=>{
  await db.query('DELETE FROM banuchat_auth.profile_binding_versions WHERE principal_id=$1 AND dataset_release_id=$2',[a.id,r.release]);
  try{error(await req('POST','/api/v2/conversations',ta,{}),403);error(await req('GET','/api/v2/me/progress',ta),403);assert.equal((await req('GET','/api/v2/conversations/'+chat,ta)).status,200);}
  finally{await db.query("INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$2,'auth_fixture')",[a.id,r.release]);}
 });
 await run('composition rejects mismatched deployment and effective column UPDATE privilege',async()=>{
  const compose=()=>createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:e.deploymentId,rateKey:Buffer.from(e.rateKey,'hex'),document_rag:generate});
  await assert.rejects(createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:e.database,deploymentId:randomUUID(),rateKey:Buffer.from(e.rateKey,'hex'),document_rag:generate}),err=>obj(err).code==='DEPENDENCY_UNAVAILABLE');
  await db.query('GRANT UPDATE(id) ON banuchat.conversations TO auth_p21_runtime');try{await assert.rejects(compose(),err=>obj(err).code==='DEPENDENCY_UNAVAILABLE');}finally{await db.query('REVOKE UPDATE(id) ON banuchat.conversations FROM auth_p21_runtime');}
 });
 await run('own deletion cascades messages/citations/owner; repeat 404, common corpus unchanged',async()=>{
  const result=await req('DELETE','/api/v2/conversations/'+chat,ta);assert.equal(result.status,204);assert.equal(result.bytes.length,0);assert.equal(result.headers['content-type'],undefined);assert.equal(result.headers.vary,'Authorization');error(await req('DELETE','/api/v2/conversations/'+chat,ta),404);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.conversation_owners WHERE conversation_id=$1',[chat])).rows[0].n,0);assert.equal(await fingerprint(db),before);
 });
 await writeFile(new URL('../../../infra/local/auth-p21/phase-e.json',import.meta.url),JSON.stringify({result:failed?'FAIL':'PASS',checks,operations:9,realHttp:true,realPostgres:true,ollama:false,corpusBefore:before,corpusAfter:await fingerprint(db)},null,2)+'\n');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await runtime.end();await db.end();}
});
