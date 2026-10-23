import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {environment,pool,fingerprint,evidence} from './auth-i1a/environment.js';
import {retrieveDocumentChunks} from '../src/application/document-retrieval.js';
import {retrieveAuthenticatedDocumentChunks} from '../src/application/authenticated-document-retrieval.js';
import type {SqlQueryClient} from '../src/data/sql-client.js';
const vector=[1,...Array<number>(1023).fill(0)];
const call='SELECT * FROM banuchat_auth.retrieve_document_chunks($1::uuid,$2::public.vector,$3::integer)';
const rejected=(code:string)=>(error:unknown)=>{assert.equal((error as {code?:string}).code,code);return true;};
test('I1A SQL: real least privilege, exact retrieval, scope and rollback',async t=>{
 const e=await environment(),db=pool(e),runtime=pool(e,'runtime');const checks:Array<{name:string;passed:boolean}>=[];
 const run=async(name:string,work:()=>Promise<void>)=>t.test(name,async()=>{try{await work();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false});throw error;}});
 const before=await fingerprint(db),scopeBefore=(await db.query('SELECT * FROM banuchat_auth.runtime_scope')).rows;
 const release=(await db.query('SELECT current_release_id FROM banuchat.datasets')).rows[0].current_release_id as string;
 try{
 await run('prior direct SELECT remains denied; existing search and new retrieval work',async()=>{
  await assert.rejects(retrieveDocumentChunks(runtime,{release_id:release,query_embedding:vector,top_k:5}),rejected('42501'));
  assert.equal((await runtime.query('SELECT count(*)::int n FROM banuchat.search_chunks_cosine($1::public.vector,5,$2)',[JSON.stringify(vector),release])).rows[0].n,5);
  assert.equal((await retrieveAuthenticatedDocumentChunks(runtime,{release_id:release,query_embedding:vector,top_k:5})).length,5);
 });
 let privileges:unknown;
 await run('effective runtime privileges exclude chunk SELECT, corpus UPDATE, executor membership and DDL',async()=>{
  privileges=(await runtime.query(`SELECT current_user AS runtime,
   has_any_column_privilege('banuchat.document_chunks','SELECT') AS chunk_select,
   has_any_column_privilege('banuchat.conversations','UPDATE') AS conversation_update,
   has_any_column_privilege('banuchat.datasets','UPDATE') AS dataset_update,
   has_any_column_privilege('banuchat.dataset_releases','UPDATE') AS release_update,
   pg_has_role(current_user,'banuchat_auth_executor','MEMBER') AS executor_member,
   has_schema_privilege('banuchat_auth','CREATE') AS auth_ddl,
   has_table_privilege('banuchat_auth.runtime_scope','UPDATE') AS scope_update`)).rows[0];
  for(const [key,value] of Object.entries(privileges as Record<string,unknown>))if(key!=='runtime')assert.equal(value,false,key);
  for(const table of ['datasets','dataset_releases','document_chunks','document_versions','embedding_configs'])await assert.rejects(runtime.query(`UPDATE banuchat.${table} SET id=id WHERE false`),rejected('42501'));
  await assert.rejects(runtime.query('SET ROLE banuchat_auth_executor'),rejected('42501'));
 });
 let definition:unknown;
 await run('NOLOGIN owner, STABLE, safe search_path, PUBLIC and outsider denied effectively',async()=>{
  definition=(await db.query(`SELECT p.prosecdef,p.provolatile,p.proconfig,r.rolname,r.rolcanlogin,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
   has_schema_privilege(r.rolname,'banuchat_auth','CREATE') AS owner_ddl,
   EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
   FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)'::regprocedure`)).rows[0];
  const d=definition as Record<string,unknown>;assert.equal(d.prosecdef,true);assert.equal(d.provolatile,'s');assert.equal(d.rolname,'banuchat_auth_executor');assert.deepEqual(d.proconfig,['search_path=pg_catalog, banuchat_auth, pg_temp']);
  for(const key of ['rolcanlogin','rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','owner_ddl','public_execute'])assert.equal(d[key],false,key);
  const outsider=await db.connect();try{await outsider.query('BEGIN');await outsider.query('SET LOCAL ROLE auth_i1a_outsider');await assert.rejects(outsider.query(call,[release,JSON.stringify(vector),5]),rejected('42501'));}finally{await outsider.query('ROLLBACK');outsider.release();}
 });
 await run('exact normalized columns, hashes, locators, distances and ordering for top-k 1/5/20',async()=>{
  for(const top_k of [1,5,20]){const input={release_id:release,query_embedding:vector,top_k};assert.deepEqual(await retrieveAuthenticatedDocumentChunks(runtime,input),await retrieveDocumentChunks(db,input));}
 });
 await run('invalid vector, nulls and top-k rejected; pgvector rejects NaN and infinity',async()=>{
  for(const args of [[null,JSON.stringify(vector),5],[release,null,5],[release,'[1,0]',5],[release,JSON.stringify(vector.map(()=>0)),5],[release,JSON.stringify(vector),0],[release,JSON.stringify(vector),21],[release,JSON.stringify(vector),null]])await assert.rejects(runtime.query(call,args),rejected('P0400'));
  for(const value of ['NaN','Infinity','-Infinity'])await assert.rejects(runtime.query(call,[release,'['+value+','+vector.slice(1).join(',')+']',5]),rejected('22000'));
 });
 await run('unknown release rejected; second dataset blocked by the frozen schema',async()=>{
  await assert.rejects(runtime.query(call,[randomUUID(),JSON.stringify(vector),5]),rejected('P0409'));
  const c=await db.connect();try{await c.query('BEGIN');await assert.rejects(c.query("INSERT INTO banuchat.datasets(id,name) VALUES(2,'foreign-fixture')"),rejected('23514'));}finally{await c.query('ROLLBACK');c.release();}
 });
 await run('wrong fixed database scope rejected and rolled back',async()=>{
  const c=await db.connect();try{await c.query('BEGIN');await c.query("UPDATE banuchat_auth.runtime_scope SET database_name='unapproved_fixture'");await c.query('SET LOCAL ROLE auth_i1a_runtime');await assert.rejects(c.query(call,[release,JSON.stringify(vector),5]),rejected('P0403'));}finally{await c.query('ROLLBACK');c.release();}
 });
 await run('underlying SQL failure becomes fixed P0500 with no private detail; rollback restores ACL',async()=>{
  const c=await db.connect();try{await c.query('BEGIN');await c.query('REVOKE SELECT ON banuchat.document_chunks FROM banuchat_auth_executor');await c.query('SET LOCAL ROLE auth_i1a_runtime');await assert.rejects(c.query(call,[release,JSON.stringify(vector),5]),error=>{const x=error as {code?:string;message?:string;detail?:string};assert.equal(x.code,'P0500');assert.equal(x.message,'Document read rejected');assert.equal(x.detail,undefined);return true;});}finally{await c.query('ROLLBACK');c.release();}
 });
 await run('controlled ties across versions and ordinals at top-k boundary; historical rejection; full_document exclusion',async()=>{
  const c=await db.connect();try{
   await c.query('BEGIN');const fixture=randomUUID(),run=randomUUID(),config=(await c.query('SELECT embedding_config_id FROM banuchat.dataset_releases WHERE id=$1',[release])).rows[0].embedding_config_id;
   const items=[{kind:'profile',key:'i1a_fixture',path:'profiles/i1a.json',locator:'profile:i1a',sha256:'f'.repeat(64)},...['i1a-z-fixture','i1a-a-fixture','i1a-full-fixture'].map(key=>({kind:'document',key,path:`documents/${key}.md`,locator:`document:${key}`,sha256:'f'.repeat(64),retrieval_mode:key.includes('full')?'full_document':'chunked'}))];
   await c.query(`INSERT INTO banuchat.dataset_releases(id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id) VALUES($1,$2,'i1a-transactional-fixture',$3,'{"fixture_only":true,"vectors":"controlled, not Ollama runtime"}',$4)`,[fixture,randomBytes(20).toString('hex'),JSON.stringify({synthetic:true,items}),config]);
   await c.query("INSERT INTO banuchat.ingestion_runs(id,dataset_release_id,attempt_no,workflow_ref,trigger_type) VALUES($1,$2,1,'i1a-transactional-fixture','manual')",[run,fixture]);
   await c.query("INSERT INTO banuchat.synthetic_profiles VALUES($1,'i1a_fixture','Perfil ficticio I1A','profiles/i1a.json','profile:i1a',repeat('f',64))",[fixture]);
   const versions=['00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000103'];
   for(const [i,key] of ['i1a-z-fixture','i1a-a-fixture','i1a-full-fixture'].entries()){
    const doc=randomUUID(),full=i===2;
    await c.query('INSERT INTO banuchat.documents(id,document_key,retrieval_mode) VALUES($1,$2,$3)',[doc,key,full?'full_document':'chunked']);
    await c.query(`INSERT INTO banuchat.document_versions(id,dataset_release_id,document_id,title,source_path,source_locator,source_sha256,content_sha256,mime_type,processing_status,ingestion_run_id) VALUES($1,$2,$3,$4,$5,$6,repeat('f',64),repeat('f',64),'text/markdown','ready',$7)`,[versions[i],fixture,doc,key,`documents/${key}.md`,`document:${key}`,run]);
    if(!full)for(let ordinal=0;ordinal<3;ordinal++)await c.query(`INSERT INTO banuchat.document_chunks(dataset_release_id,document_version_id,ordinal,content,locator,embedding,embedding_generated_at,generation_run_id) VALUES($1,$2,$3::integer,'Contenido ficticio controlado','section:'||$3::integer::text,$4::public.vector,clock_timestamp(),$5)`,[fixture,versions[i],ordinal,JSON.stringify(vector),run]);
   }
   await c.query(`INSERT INTO banuchat.ingestion_items(dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,source_sha256,document_version_id,status,finished_at)
    SELECT $1,$2,r.source_kind::banuchat.source_kind,r.record_key,r.source_path,r.source_locator,r.source_sha256,r.document_version_id,'processed',clock_timestamp() FROM banuchat.release_records($1) r`,[fixture,run]);
   await c.query("UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp() WHERE id=$1",[run]);await c.query('SELECT banuchat.publish_release($1)',[fixture]);
   const input={release_id:fixture,query_embedding:vector,top_k:5},expected=await retrieveDocumentChunks(c,input);
   assert.deepEqual(expected.map(r=>[r.document_version_id,r.ordinal]),[[versions[0],0],[versions[0],1],[versions[0],2],[versions[1],0],[versions[1],1]]);
   assert.ok(expected.every(r=>r.cosine_distance===0&&!r.document_key.includes('full')));
   await c.query('SET LOCAL ROLE auth_i1a_runtime');assert.deepEqual(await retrieveAuthenticatedDocumentChunks(c as SqlQueryClient,input),expected);
   await assert.rejects(c.query(call,[release,JSON.stringify(vector),5]),rejected('P0409'));
  }finally{await c.query('ROLLBACK');c.release();}
 });
 await run('010 missing target, wrong target or deployment aborts without partial DDL',async()=>{
  const migration=await readFile(new URL('../../../infra/db/010_authenticated_document_reads.sql',import.meta.url),'utf8');
  for(const [target,deployment] of [['',e.deployment],['unapproved_fixture',e.deployment],[e.database,randomUUID()]]){
   const c=await db.connect();try{await c.query('BEGIN');await c.query('DROP FUNCTION banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)');
    await c.query("SELECT set_config('banuchat_auth.target_database',$1,false),set_config('banuchat_auth.runtime_role',$2,false),set_config('banuchat_auth.deployment_id',$3,false)",[target,e.runtime,deployment]);
    await assert.rejects(c.query(migration),rejected('P0001'));
   }finally{await c.query('ROLLBACK');c.release();}
   assert.ok((await db.query("SELECT to_regprocedure('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)') AS fn")).rows[0].fn);
  }
 });
 await run('corpus, vectors, releases and runtime_scope unchanged after all SQL tests',async()=>{assert.equal(await fingerprint(db),before);assert.deepEqual((await db.query('SELECT * FROM banuchat_auth.runtime_scope')).rows,scopeBefore);});
 await evidence('sql',{checkpoint:'BCH-05/CCD-AUTH-I1A',at:new Date().toISOString(),checks,privileges,definition,corpus_before:before,corpus_after:await fingerprint(db),fixture:'controlled tie vectors in a single rolled-back transaction; not runtime embeddings'});
 }finally{await runtime.end();await db.end();}
});
