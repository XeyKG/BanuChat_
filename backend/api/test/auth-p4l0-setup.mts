import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {environment,pool,seedRelease} from './auth-p4l0/environment.js';
const e=await environment(),db=pool(e);try{
 assert.equal((await db.query("SELECT current_database() AS db,to_regnamespace('banuchat') IS NULL AS empty")).rows[0].empty,true);
 await db.query(await readFile(new URL('../../../infra/db/001_initial_schema.sql',import.meta.url),'utf8'));
 await db.query(`INSERT INTO banuchat.datasets(id,name) VALUES(1,'banuchat-synthetic');
 INSERT INTO banuchat.embedding_configs(id,provider,model,model_revision,parameters) VALUES('10000000-0000-4000-8000-000000000001','fixture','auth-p4l0-no-model','AUTH-P4L0-NO-EMBEDDINGS','{"query":{},"document":{},"runtime_version":"fixture-only"}');
 INSERT INTO banuchat.documents(id,dataset_id,document_key,retrieval_mode) VALUES('20000000-0000-4000-8000-000000000001',1,'auth_guide','full_document');`);
 const first=await seedRelease(db),second=await seedRelease(db);
 const c=await db.connect();try{
 await c.query("SELECT set_config('banuchat_auth.target_database',$1,false)",[e.database]);
 await c.query(await readFile(new URL('../../../infra/db/006_synthetic_auth.sql',import.meta.url),'utf8'));
 await c.query(`CREATE ROLE auth_p4l0_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(e.runtimePassword)}`);
 await c.query("SELECT set_config('banuchat_auth.runtime_role',$1,false),set_config('banuchat_auth.deployment_id',$2,false)",[e.runtimeUser,e.deploymentId]);
 await c.query(await readFile(new URL('../../../infra/db/007_authenticated_resources.sql',import.meta.url),'utf8'));
 await c.query("INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES('BCH-DEMO-0001','legacy@banuchat.test')" );
 await c.query(await readFile(new URL('../../../infra/db/008_verified_recovery_email.sql',import.meta.url),'utf8'));
 }finally{c.release();}
 for(const r of (await db.query('SELECT datname FROM pg_database')).rows)await db.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(String(r.datname))} FROM PUBLIC`);
 await db.query(`GRANT CONNECT ON DATABASE banuchat_auth_p4l0_test TO auth_p4l0_runtime;
 GRANT USAGE ON SCHEMA banuchat,banuchat_auth,public TO auth_p4l0_runtime;
 GRANT USAGE ON TYPE banuchat.finite_time,banuchat.sha256_hex,banuchat.stable_key TO auth_p4l0_runtime;
 GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.embedding_configs,banuchat.synthetic_profiles,banuchat.profile_courses,
 banuchat.courses,banuchat.calendar_events,banuchat.announcements,banuchat.documents,banuchat.document_versions,
 banuchat.conversations,banuchat.messages,banuchat.message_citations TO auth_p4l0_runtime;
 GRANT SELECT ON banuchat_auth.accounts,banuchat_auth.password_credentials,banuchat_auth.sessions,banuchat_auth.refresh_tokens,
 banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,banuchat_auth.auth_rate_limits,banuchat_auth.conversation_owners TO auth_p4l0_runtime;
 GRANT UPDATE(updated_at) ON banuchat_auth.accounts TO auth_p4l0_runtime;
 GRANT INSERT ON banuchat_auth.sessions,banuchat_auth.refresh_tokens,banuchat_auth.auth_rate_limits,banuchat_auth.security_events,
 banuchat.conversations,banuchat_auth.conversation_owners TO auth_p4l0_runtime;
 GRANT DELETE ON banuchat.conversations TO auth_p4l0_runtime;
 GRANT UPDATE(access_token_digest,access_issued_at,access_expires_at,last_seen_at,revoked_at) ON banuchat_auth.sessions TO auth_p4l0_runtime;
 GRANT UPDATE(consumed_at,replaced_by) ON banuchat_auth.refresh_tokens TO auth_p4l0_runtime;
 GRANT UPDATE(attempts) ON banuchat_auth.auth_rate_limits TO auth_p4l0_runtime;
 GRANT EXECUTE ON FUNCTION banuchat.current_retrieval_context(),banuchat.search_chunks_cosine(public.vector,integer,uuid) TO auth_p4l0_runtime;`);
 await writeFile(new URL('../../../infra/local/auth-p4l0/fixture.json',import.meta.url),JSON.stringify({first,second})+'\n');
 await db.query(`CREATE ROLE auth_p4l0_provisioner LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral((e as unknown as {provisionPassword:string}).provisionPassword)}; GRANT CONNECT ON DATABASE banuchat_auth_p4l0_test TO auth_p4l0_provisioner; GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO auth_p4l0_provisioner; GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.synthetic_profiles TO auth_p4l0_provisioner; GRANT INSERT ON banuchat_auth.accounts,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,banuchat_auth.security_events TO auth_p4l0_provisioner;`);
 console.log('AUTH-P4-L0 isolated schema, named-account provisioning and fixture ready.');
}catch(error){console.error({result:'FAIL',code:(error as {code?:string}).code??'ASSERTION',message:(error as {message?:string}).message?.startsWith('AUTH')?(error as Error).message:'Isolated setup rejected'});process.exitCode=1;}finally{await db.end();}
