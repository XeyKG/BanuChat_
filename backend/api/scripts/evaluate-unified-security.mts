import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {StdioMcpClientFactory} from '../src/agent/mcp-client.js';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
import {root} from '../test/auth-i1b/environment.js';
const c=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
assert.equal(c.database,'banuchat_unified');assert.equal(c.database_port,55463);assert.equal(c.api_port,3004);
const a=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8'));
const db=new Pool({host:'127.0.0.1',port:c.database_port,database:c.database,user:a.admin,password:a.adminPassword});
const reader=new Pool({host:'127.0.0.1',port:c.database_port,database:c.database,user:c.mcp_user,password:c.mcp_password});
const runtime=new Pool({host:'127.0.0.1',port:c.database_port,database:c.database,user:c.runtime_user,password:c.runtime_password});
const account=(await demoAccounts())[0]!,base='http://127.0.0.1:3004/api/v2';
const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({synthetic_uid:account.uid,password:account.password})});assert.equal(login.status,200);const token=(await login.json()).access_token;
const headers={Authorization:'Bearer '+token,'content-type':'application/json'};
const me=await (await fetch(base+'/auth/me',{headers})).json();
const factory=new StdioMcpClientFactory({args:['--import','tsx','src/unified-main.ts'],environment:{
 MCP_POSTGRES_DB:c.database,MCP_POSTGRES_PORT:String(c.database_port),MCP_POSTGRES_USER:c.mcp_user,MCP_POSTGRES_PASSWORD:c.mcp_password,
 MCP_PRINCIPAL_ID:me.principal_id,MCP_DOCUMENT_RELEASE:me.release_id,MCP_STRUCTURED_RELEASE:c.structured_release,BANUCHAT_OLLAMA_BASE_URL:c.ollama_base_url,
}});
const session=await factory.open(me.profile.profile_key);
const checks:Record<string,boolean>={};
try{
 const docs=await session.call('search_knowledge',{query:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'});
 assert.equal(docs.release_id,me.release_id);assert.ok((docs.matches as unknown[]).length>0);checks.ccd_vector_tool=true;
 const title=(await db.query('SELECT title FROM banuchat.document_versions WHERE dataset_release_id=$1 ORDER BY id LIMIT 1',[me.release_id])).rows[0].title;
 const found=await session.call('find_documents',{query:title});assert.equal(found.release_id,me.release_id);assert.ok((found.documents as unknown[]).length>0);checks.ccd_document_tool=true;
 for(const [tool,args] of [['get_courses',{}],['get_profile_progress',{}],['get_calendar_events',{date_from:'2026-10-01',date_to:'2026-11-30'}],['get_announcements',{temporal_status:'all'}]] as const){
  const r=await session.call(tool,args);assert.equal(r.release_id,c.structured_release);if(tool==='get_profile_progress')assert.equal((r.profile as {profile_key:string}).profile_key,me.profile.profile_key);
 }
 checks.six_real_tools=true;
 await assert.rejects(session.call('get_profile_progress',{profile_key:'other-account'}));checks.no_arbitrary_profile_argument=true;
 await assert.rejects(reader.query('UPDATE banuchat_aux.datasets SET id=id'),e=>(e as {code:string}).code==='25006');
 const permissionCheck=await reader.connect();try{await permissionCheck.query('SET default_transaction_read_only=off');
 await assert.rejects(permissionCheck.query('UPDATE banuchat_aux.datasets SET id=id'),e=>(e as {code:string}).code==='42501');}finally{permissionCheck.release();}
 checks.mcp_role_no_write=true;
 await assert.rejects(reader.query('SELECT * FROM banuchat_auth.password_credentials'),e=>(e as {code:string}).code==='42501');checks.mcp_role_no_password_access=true;
 const created=await (await fetch(base+'/conversations',{method:'POST',headers,body:'{}'})).json();
 const foreign=(await db.query('SELECT pc.* FROM banuchat_aux.profile_courses pc WHERE dataset_release_id=$1 AND profile_key<>$2 LIMIT 1',[c.structured_release,me.profile.profile_key])).rows[0];
 const record={citation_index:0,dataset_release_id:c.structured_release,source_kind:'profile_course',source_path:foreign.source_path,source_locator:foreign.source_locator,source_sha256:foreign.source_sha256,
  document_version_id:null,chunk_id:null,profile_key:foreign.profile_key,course_key:foreign.course_key,event_key:null,announcement_key:null};
 const presentation={index:0,release_id:c.structured_release,source_kind:'profile_course',label:'Curso',locator:foreign.source_locator,document_version_id:null,artifact_url:null};
 await assert.rejects(runtime.query('SELECT * FROM banuchat_auth.persist_unified_turn($1,$2,$3,0,$4,$5,false,$6,$7,$8) AS t(status text,user_message_id uuid,user_ordinal integer,user_content banuchat.nonblank,user_created_at banuchat.finite_time,assistant_message_id uuid,assistant_ordinal integer,assistant_content banuchat.nonblank,assistant_created_at banuchat.finite_time,assistant_insufficient_evidence boolean)',
 [token,created.conversation_id,me.release_id,'consulta','respuesta',JSON.stringify([record]),JSON.stringify([presentation]),c.structured_release]),e=>(e as {code:string}).code==='P0403');
 assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[created.conversation_id])).rows[0].n,0);checks.forged_foreign_progress_rejected_before_persist=true;
 console.log(JSON.stringify({result:'PASS',checks}));await writeFile(new URL('eval/unified/results/security-2026-10-25.json',root),JSON.stringify({result:'PASS',checks},null,2)+'\n');
}finally{await session.close();await fetch(base+'/auth/logout',{method:'POST',headers});await Promise.all([db.end(),runtime.end(),reader.end()]);}

