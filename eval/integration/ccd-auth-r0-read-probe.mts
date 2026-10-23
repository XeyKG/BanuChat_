/** Read-only confirmation of the retrieval/privilege conflict, no login or history writes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {retrieveDocumentChunks} from '../../backend/api/src/application/document-retrieval.js';
const require=createRequire(new URL('../../backend/api/package.json',import.meta.url));
const {Pool}=require('pg') as typeof import('pg');
const root=new URL('../../',import.meta.url);
const checks:unknown[]=[];
for(const [path,expectedDatabase,expectedPort] of [
 ['infra/local/auth-p4l1/deployment.json','banuchat_auth_p4l1_demo',55440],
 ['infra/local/ccd-auth-r0/deployment.json','banuchat_auth_r0_replay',55441],
] as const){
 const c=JSON.parse(await readFile(new URL(path,root),'utf8'));
 assert.equal(c.database,expectedDatabase);assert.equal(c.port,expectedPort);
 const admin=new Pool({host:'127.0.0.1',port:c.port,database:c.database,user:c.migrator,password:c.migratorPassword});
 const runtime=new Pool({host:'127.0.0.1',port:c.port,database:c.database,user:c.runtime,password:c.runtimePassword});
 async function fingerprint(){
  const h=createHash('sha256');
  const tables=(await admin.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('banuchat','banuchat_auth') ORDER BY schemaname,tablename")).rows;
  for(const {schemaname,tablename} of tables){assert.match(schemaname,/^banuchat(?:_auth)?$/u);assert.match(tablename,/^[a-z_]+$/u);
   const result=await admin.query(`SELECT to_jsonb(t)::text AS row FROM ${schemaname}.${tablename} t ORDER BY to_jsonb(t)::text`);h.update(schemaname+'.'+tablename+JSON.stringify(result.rows));}
  return h.digest('hex');
 }
 try{
  const before=await fingerprint();const client=await runtime.connect();
  try{
   await client.query('BEGIN READ ONLY');
   const metadata=(await client.query(`SELECT current_database() AS database,
    has_table_privilege('banuchat.document_chunks','SELECT') AS chunks_select,
    has_function_privilege('banuchat.search_chunks_cosine(public.vector,integer,uuid)','EXECUTE') AS search_execute,
    (SELECT current_release_id FROM banuchat.datasets WHERE id=1) AS release_id,
    (SELECT r.manifest->>'synthetic' FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.current_release_id=r.id WHERE d.id=1) AS synthetic`)).rows[0];
   await client.query('SAVEPOINT retrieval');let code:string|null=null,denied:string|null=null;
   const vector=Array.from({length:1024},(_,i)=>i===0?1:0);
   try{await retrieveDocumentChunks(client,{release_id:metadata.release_id,query_embedding:vector,top_k:1});}
   catch(error){code=(error as {code?:string}).code??'UNCLASSIFIED';denied=(error as Error).message.match(/permission denied for (?:table|function|schema) [a-z_0-9.]+/u)?.[0]??null;}
   await client.query('ROLLBACK TO SAVEPOINT retrieval');
   const functionRead=await client.query('SELECT count(*)::int AS n FROM banuchat.search_chunks_cosine($1::public.vector,1,$2)',[JSON.stringify(vector),metadata.release_id]);
   assert.equal(code,'42501');assert.equal(metadata.chunks_select,false);assert.equal(metadata.search_execute,true);
   checks.push({...metadata,service_query_sqlstate:code,denied,existing_function_query_succeeded:true,returned_rows:functionRead.rows[0].n});
   await client.query('ROLLBACK');
  }finally{client.release();}
  const after=await fingerprint();assert.equal(after,before);
  checks.push({database:expectedDatabase,all_table_sha256_before:before,all_table_sha256_after:after,unchanged:true});
 }finally{await runtime.end();await admin.end();}
}
const result={checkpoint:'BCH-05/CCD-AUTH-R0',observed_at:new Date().toISOString(),evidence:'real PostgreSQL; BEGIN READ ONLY; service versus granted function; artificial nonzero query vector, no embedding quality measurement',checks};
await writeFile(new URL('eval/integration/results/bch05-ccd-auth-r0-read-probe.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
