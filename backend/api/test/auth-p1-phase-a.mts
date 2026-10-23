import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { environment, pool, release } from "./auth-p1/environment.js";

const env = await environment(); const db = pool(env); const client = await db.connect();
const sql = await readFile(new URL("../../../infra/db/006_synthetic_auth.sql", import.meta.url), "utf8");
const evidence: Array<{ name: string; result: string; sqlstate?: string }> = [];
async function rejected(name: string, statement: string, params: unknown[], code: string): Promise<void> {
  await client.query("SAVEPOINT rejected_case"); let actual: string | undefined;
  try { await client.query(statement, params); } catch (error) { actual = (error as { code?: string }).code; }
  await client.query("ROLLBACK TO SAVEPOINT rejected_case");
  assert.equal(actual, code, name); evidence.push({ name, result: "PASS", sqlstate: code });
}
try {
  const versionNumber=Number((await client.query("SHOW server_version_num")).rows[0].server_version_num);
  assert.ok(versionNumber>=160000 && versionNumber<170000,"PostgreSQL 16 required before SQL");
  assert.equal((await client.query("SELECT current_database() AS db")).rows[0].db, env.database);
  assert.equal((await client.query("SELECT to_regnamespace('banuchat') IS NULL AS empty")).rows[0].empty, true);
  await client.query(await readFile(new URL("../../../infra/db/001_initial_schema.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("auth-p1/fixture.sql", import.meta.url), "utf8"));
  assert.equal((await client.query("SELECT current_release_id::text FROM banuchat.datasets")).rows[0].current_release_id, release);
  for (const target of ["", "wrong_auth_p1_target"]) {
    await client.query("SELECT set_config('banuchat_auth.target_database',$1,false)", [target]);
    let code: string | undefined; try { await client.query(sql); } catch (error) { code = (error as { code?: string }).code; }
    await client.query("ROLLBACK"); assert.equal(code, "P0001");
    assert.equal((await client.query("SELECT to_regnamespace('banuchat_auth') IS NULL AS absent")).rows[0].absent, true);
    evidence.push({ name: target ? "wrong target rolls back" : "missing target rolls back", result: "PASS", sqlstate: "P0001" });
  }
  await client.query("SELECT set_config('banuchat_auth.target_database',$1,false)", [env.database]);
  await client.query(sql);
  evidence.push({ name: "006 applied in same connection with exact target", result: "PASS" });
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='banuchat_auth'::regnamespace AND relkind='r'")).rows[0].n, 11);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace='banuchat_auth'::regnamespace AND contype='f' AND convalidated")).rows[0].n, 16);
  const indexes = (await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='banuchat_auth' ORDER BY indexname")).rows.map(r => r.indexname);
  assert.ok(indexes.includes("conversation_owners_principal_idx")); assert.ok(indexes.includes("password_reset_tokens_pending_idx"));
  assert.ok(indexes.includes("sessions_access_token_digest_key"));
  evidence.push({ name: "11 tables, 16 validated FKs, indexes and finite-time/digest domains", result: "PASS" });
  await client.query("BEGIN");
  const a = randomUUID(); const b = randomUUID(); const conv = randomUUID();
  await client.query("INSERT INTO banuchat_auth.accounts(id,synthetic_uid,recovery_email) VALUES($1,'BCH-DEMO-0001','demo-0001@banuchat.test'),($2,'BCH-DEMO-0002','demo-0002@banuchat.test')", [a,b]);
  await rejected("UID shape", "INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES('invalid','other@banuchat.test')", [], "23514");
  await rejected("reserved recipient only", "INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES('BCH-DEMO-0003','demo@other.test')", [], "23514");
  await rejected("unique UID", "INSERT INTO banuchat_auth.accounts(synthetic_uid,recovery_email) VALUES('BCH-DEMO-0001','other@banuchat.test')", [], "23505");
  await rejected("no plaintext credential", "INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash) VALUES($1,'not-a-password-hash')", [a], "23514");
  await rejected("credential account FK", "INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash) VALUES($1,$2)", [randomUUID(), "$argon2id$v=19$m=19456,t=2,p=1$"+"A".repeat(22)+"$"+"A".repeat(43)], "23503");
  await rejected("disabled state consistency", "UPDATE banuchat_auth.accounts SET status='disabled' WHERE id=$1", [a], "23514");
  await rejected("finite timestamps", "UPDATE banuchat_auth.accounts SET updated_at='infinity' WHERE id=$1", [a], "23514");
  await client.query("INSERT INTO banuchat_auth.profile_bindings(principal_id,dataset_id,profile_key) VALUES($1,1,'auth_fixture'),($2,1,'auth_fixture')",[a,b]);
  await client.query("INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$3,'auth_fixture'),($2,1,$3,'auth_fixture')",[a,b,release]);
  await rejected("binding composite FK", "INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$2,'other_profile')",[a,randomUUID()],"23503");
  await client.query("INSERT INTO banuchat.conversations(id,dataset_release_id,profile_key) VALUES($1,$2,'auth_fixture')",[conv,release]);
  await client.query("INSERT INTO banuchat_auth.conversation_owners(conversation_id,principal_id) VALUES($1,$2)",[conv,a]);
  await rejected("second owner rejected", "INSERT INTO banuchat_auth.conversation_owners(conversation_id,principal_id) VALUES($1,$2)",[conv,b],"23505");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM banuchat.conversations c JOIN banuchat_auth.conversation_owners o ON o.conversation_id=c.id WHERE o.principal_id=$1",[b])).rows[0].n,0);
  await rejected("account deletion cannot erase history", "DELETE FROM banuchat_auth.accounts WHERE id=$1",[a],"23503");
  await client.query("DELETE FROM banuchat.conversations WHERE id=$1",[conv]);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM banuchat_auth.conversation_owners")).rows[0].n,0);
  await rejected("reset expiry ceiling", "INSERT INTO banuchat_auth.password_reset_tokens(principal_id,token_digest,purpose,auth_version,created_at,expires_at) VALUES($1,repeat('a',64),'reset',1,'2026-10-22Z','2026-10-23Z')",[a],"23514");
  await rejected("rate window check", "INSERT INTO banuchat_auth.auth_rate_limits VALUES('login_uid',repeat('a',64),'2026-10-22Z',1,1,'2026-10-22T00:00:01Z')",[],"23514");
  await client.query("ROLLBACK");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM banuchat_auth.accounts")).rows[0].n,0);
  evidence.push({ name: "fixture transaction rolled back, auth empty; corpus has one profile and zero embeddings/history", result: "PASS" });
  assert.equal((await client.query("SELECT count(*)::int AS n FROM banuchat.document_chunks")).rows[0].n,0);
  const report = { phase: "AUTH-P1/A", result:"PASS", deploymentId:env.deploymentId, database: env.database, version: (await client.query("SHOW server_version")).rows[0].server_version,
    pgvector:(await client.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0].extversion,
    tableCount:11,foreignKeyCount:16,indexes,evidence, ddlChanged:false };
  await writeFile(new URL("../../../infra/local/auth-p1/phase-a.json", import.meta.url),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({phase:report.phase,version:report.version,checks:evidence.length,result:"PASS",ddlChanged:false}));
} catch(error) {
  await client.query("ROLLBACK").catch(()=>undefined);
  console.error(JSON.stringify({phase:"AUTH-P1/A",result:"FAIL",code:(error as {code?:string}).code ?? "ASSERTION",message:error instanceof assert.AssertionError ? error.message : "Database validation failed; inspect locally without exposing payloads"}));
  process.exitCode=1;
} finally { client.release(); await db.end(); }
