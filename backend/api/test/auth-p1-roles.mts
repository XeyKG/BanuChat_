import assert from "node:assert/strict";
import { readFile,writeFile } from "node:fs/promises";
import pg from "pg";
import { environment,pool } from "./auth-p1/environment.js";

const env=await environment();
const phase=JSON.parse(await readFile(new URL("../../../infra/local/auth-p1/phase-a.json",import.meta.url),"utf8")) as {database:string;result:string;deploymentId:string};
assert.equal(phase.database,env.database);assert.equal(phase.result,"PASS");assert.equal(phase.deploymentId,env.deploymentId);const db=pool(env);
try {
  assert.equal((await db.query("SELECT current_database() AS db")).rows[0].db,"banuchat_auth_p1_test");
  for(const [role,secret] of [[env.runtimeUser,env.runtimePassword],[env.provisionUser,env.provisionPassword]]) {
    assert.ok(role==="auth_p1_runtime" || role==="auth_p1_provisioner");assert.ok(secret);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname=$1",[role])).rows[0].n,0);
    await db.query(`CREATE ROLE ${pg.escapeIdentifier(role)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(secret)}`);
  }
  // Isolated task cluster ONLY; shared-cluster PUBLIC is never changed.
  for(const r of (await db.query("SELECT datname FROM pg_database")).rows)await db.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(String(r.datname))} FROM PUBLIC`);
  await db.query(`GRANT CONNECT ON DATABASE banuchat_auth_p1_test TO auth_p1_runtime,auth_p1_provisioner;
    GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO auth_p1_runtime,auth_p1_provisioner;
    GRANT USAGE ON TYPE banuchat.finite_time,banuchat.sha256_hex,banuchat.stable_key TO auth_p1_runtime,auth_p1_provisioner;
    GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.synthetic_profiles TO auth_p1_runtime,auth_p1_provisioner;
    GRANT SELECT ON banuchat_auth.accounts,banuchat_auth.password_credentials,banuchat_auth.sessions,
      banuchat_auth.refresh_tokens,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,
      banuchat_auth.corpus_grants,banuchat_auth.auth_rate_limits TO auth_p1_runtime;
    GRANT UPDATE(updated_at) ON banuchat_auth.accounts TO auth_p1_runtime;
    GRANT INSERT ON banuchat_auth.sessions,banuchat_auth.refresh_tokens,banuchat_auth.auth_rate_limits,
      banuchat_auth.security_events TO auth_p1_runtime;
    GRANT UPDATE(access_token_digest,access_issued_at,access_expires_at,last_seen_at,revoked_at)
      ON banuchat_auth.sessions TO auth_p1_runtime;
    GRANT UPDATE(consumed_at,replaced_by) ON banuchat_auth.refresh_tokens TO auth_p1_runtime;
    GRANT UPDATE(attempts) ON banuchat_auth.auth_rate_limits TO auth_p1_runtime;
    GRANT INSERT ON banuchat_auth.accounts,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,
      banuchat_auth.corpus_grants,banuchat_auth.security_events TO auth_p1_provisioner;
  `);
  const runtime=pool(env,"runtime");const provision=pool(env,"provision");
  try {
    for(const [name,p] of [["runtime",runtime],["provisioner",provision]] as const) {
      const row=(await p.query("SELECT current_user AS role,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
      assert.equal(row.rolsuper,false);assert.equal(row.rolcreatedb,false);assert.equal(row.rolcreaterole,false);assert.equal(row.rolreplication,false);assert.equal(row.rolbypassrls,false);
      let code:string|undefined;try {await p.query("CREATE TABLE banuchat_auth.forbidden_test(id int)");}catch(e){code=(e as {code?:string}).code;}
      assert.equal(code,"42501");console.log(JSON.stringify({role:name,superuser:false,ddlRejected:code}));
    }
    for(const q of ["SELECT * FROM banuchat_auth.password_credentials","SELECT * FROM banuchat.conversations"]) {
      let code:string|undefined;try{await provision.query(q);}catch(e){code=(e as {code?:string}).code;}assert.equal(code,"42501");
    }
    for(const q of ["DELETE FROM banuchat.synthetic_profiles","TRUNCATE banuchat_auth.sessions","INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES('BCH-DEMO-9999','demo-9999@banuchat.test')"]) {
      let code:string|undefined;try{await runtime.query(q);}catch(e){code=(e as {code?:string}).code;}assert.equal(code,"42501");
    }
  }finally {await runtime.end();await provision.end();}
  await writeFile(new URL("../../../infra/local/auth-p1/roles.json",import.meta.url),JSON.stringify({database:env.database,runtime:env.runtimeUser,provisioner:env.provisionUser,superuser:false,forbiddenOperations:"42501",sharedClusterTouched:false},null,2)+"\n");
}catch(e){console.error(JSON.stringify({result:"FAIL",code:(e as {code?:string}).code??"ASSERTION",message:"Isolated role validation failed"}));process.exitCode=1;}finally {await db.end();}
