import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
import {Argon2idHasher} from "../../src/auth/primitives.js";
export interface Environment {host:string;port:number;database:string;adminUser:string;adminPassword:string;runtimeUser:string;runtimePassword:string;deploymentId:string;rateKey:string;container:string;}
export async function environment():Promise<Environment>{
 const e=JSON.parse(await readFile(new URL("../../../../infra/local/auth-p21/environment.json",import.meta.url),"utf8")) as Environment;
 assert.equal(e.host,"127.0.0.1");assert.equal(e.port,55437);assert.equal(e.database,"banuchat_auth_p21_test");
 assert.equal(e.container,"banuchat-auth-p21-20261022");assert.equal(e.runtimeUser,"auth_p21_runtime");return e;
}
export const pool=(e:Environment,runtime=false)=>new Pool({host:e.host,port:e.port,database:e.database,user:runtime?e.runtimeUser:e.adminUser,
 password:runtime?e.runtimePassword:e.adminPassword,max:12,connectionTimeoutMillis:5000,statement_timeout:10000});
export const root=fileURLToPath(new URL("../../../../infra/local/auth-p21/artifacts/",import.meta.url));
export const phrase="frase ficticia exclusiva AUTH-P2.1";
export async function seedRelease(db:Pool):Promise<{release:string;document:string}> {
 const release=randomUUID(),run=randomUUID(),document=randomUUID();
 const bytes=Buffer.from("# Documento ficticio AUTH-P2.1\nTexto de prueba.\n");const hash=createHash("sha256").update(bytes).digest("hex");
 await mkdir(new URL("../../../../infra/local/auth-p21/artifacts/documents/",import.meta.url),{recursive:true});
 await writeFile(new URL("../../../../infra/local/auth-p21/artifacts/documents/auth-guide.md",import.meta.url),bytes);
 const records=[['profile','auth_fixture','profiles/auth-fixture.json','profile:auth_fixture'],['course','auth_course','courses/auth.json','course:auth_course'],
 ['profile_course','auth_fixture/auth_course','profiles/progress.json','progress:auth_fixture/auth_course'],
 ['calendar_event','auth_event','calendars/auth.json','calendar:auth_event'],['announcement','auth_announcement','announcements/auth.json','announcement:auth_announcement'],
 ['document','auth_guide','documents/auth-guide.md','document:auth_guide']];
 const manifest={synthetic:true,items:records.map(([kind,key,path,locator])=>({kind,key,path,locator,sha256:kind==='document'?hash:'f'.repeat(64),...(kind==='document'?{retrieval_mode:'full_document'}:{})}))};
 const client=await db.connect();try{await client.query('BEGIN');
 await client.query(`INSERT INTO banuchat.dataset_releases(id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id)
 VALUES($1,repeat('2',40),'auth-p21-fixture-only',$2,$3,'10000000-0000-4000-8000-000000000001')`,[release,JSON.stringify(manifest),JSON.stringify({fixture_only:true,fixture_id:release})]);
 await client.query(`INSERT INTO banuchat.ingestion_runs(id,dataset_release_id,attempt_no,workflow_ref,trigger_type) VALUES($1,$2,1,'auth-p21-fixture-only','manual')`,[run,release]);
 await client.query(`INSERT INTO banuchat.synthetic_profiles VALUES($1,'auth_fixture','Perfil ficticio compartido','profiles/auth-fixture.json','profile:auth_fixture',repeat('f',64))`,[release]);
 await client.query(`INSERT INTO banuchat.courses VALUES($1,'auth_course','Curso ficticio','Descripción ficticia','available','courses/auth.json','course:auth_course',repeat('f',64))`,[release]);
 await client.query(`INSERT INTO banuchat.profile_courses VALUES($1,'auth_fixture','auth_course','in_progress',25,'2026-01-01T00:00:00Z',NULL,'profiles/progress.json','progress:auth_fixture/auth_course',repeat('f',64))`,[release]);
 await client.query(`INSERT INTO banuchat.announcements VALUES($1,'auth_announcement','Anuncio ficticio','Descripción ficticia','2026-01-01T00:00:00Z','2027-01-01T00:00:00Z','announcements/auth.json','announcement:auth_announcement',repeat('f',64))`,[release]);
 await client.query(`INSERT INTO banuchat.calendar_events VALUES($1,'auth_event','Evento ficticio','general','2026-10-22T15:00:00Z',NULL,'Descripción ficticia',NULL,NULL,'calendars/auth.json','calendar:auth_event',repeat('f',64))`,[release]);
 await client.query(`INSERT INTO banuchat.document_versions(id,dataset_release_id,document_id,version_label,title,source_path,source_locator,source_sha256,content_sha256,mime_type,processing_status,ingestion_run_id)
 VALUES($1,$2,'20000000-0000-4000-8000-000000000001','auth-p21-fixture','Guía ficticia','documents/auth-guide.md','document:auth_guide',$3,$3,'text/markdown','ready',$4)`,[document,release,hash,run]);
 await client.query(`INSERT INTO banuchat.ingestion_items(dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,source_sha256,document_version_id,status,finished_at)
 SELECT $1,$2,r.source_kind::banuchat.source_kind,r.record_key,r.source_path,r.source_locator,r.source_sha256,r.document_version_id,'processed',clock_timestamp() FROM banuchat.release_records($1) r`,[release,run]);
 await client.query(`UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp() WHERE id=$1`,[run]);
 await client.query('SELECT banuchat.publish_release($1)',[release]);await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 return {release,document};
}
export async function account(db:Pool,digits:string,releases:string[]) {
 const id=randomUUID();const hasher=new Argon2idHasher();const hash=await hasher.hash(phrase);
 await db.query(`INSERT INTO banuchat_auth.accounts(id,synthetic_uid,recovery_email,status) VALUES($1,$2,$3,'active')`,[id,'BCH-DEMO-'+digits,'demo-'+digits+'@banuchat.test']);
 await db.query(`INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash) VALUES($1,$2)`,[id,hash]);
 await db.query(`INSERT INTO banuchat_auth.profile_bindings(principal_id,dataset_id,profile_key) VALUES($1,1,'auth_fixture')`,[id]);
 for(const release of releases)await db.query(`INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$2,'auth_fixture')`,[id,release]);
 await db.query(`INSERT INTO banuchat_auth.corpus_grants(principal_id,dataset_id) VALUES($1,1)`,[id]);return {id,uid:'BCH-DEMO-'+digits};
}
export async function fingerprint(db:Pool){const h=createHash('sha256');for(const table of ['datasets','dataset_releases','embedding_configs','documents','document_versions','document_chunks','synthetic_profiles','profile_courses','courses','calendar_events','announcements','ingestion_runs','ingestion_items']){
 const r=await db.query(`SELECT to_jsonb(r)::text AS r FROM banuchat.${table} r ORDER BY to_jsonb(r)::text`);h.update(table+JSON.stringify(r.rows));}return h.digest('hex');}
