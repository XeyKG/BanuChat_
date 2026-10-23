import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Static DDL inspection only: no pg client, SQL execution, Docker or existing DB.
const sql = await readFile(new URL("../../../infra/db/006_synthetic_auth.sql", import.meta.url), "utf8");
const initial = await readFile(new URL("../../../infra/db/001_initial_schema.sql", import.meta.url), "utf8");
const contract = JSON.parse(await readFile(new URL("../openapi-v2.yaml", import.meta.url), "utf8")) as {
  "x-auth-policy": Record<string, unknown>;
  "x-rate-limits": Array<{ action: string; window_seconds: number }>;
};
interface Table {
  columns: Map<string, string>;
  keys: string[][];
  foreignKeys: Array<{ columns: string[]; target: string; targetColumns: string[]; onDelete: string }>;
  body: string;
}
function names(value: string): string[] { return value.split(",").map(s => s.trim()); }
// Deliberately bounded to CREATE TABLE declarations in these files, not a PostgreSQL parser.
function tables(source: string): Map<string, Table> {
  const result = new Map<string, Table>();
  for (const match of source.matchAll(/^CREATE TABLE (banuchat(?:_auth)?\.\w+) \(\r?\n([\s\S]*?)^\);/gmu)) {
    const tableName = match[1]; const body = match[2];
    assert.ok(tableName && body);
    const columns = new Map<string, string>();
    const keys: string[][] = [];
    const foreignKeys: Table["foreignKeys"] = [];
    for (const column of body.matchAll(/^    ([a-z][a-z_0-9]*) (uuid|smallint|bigint|integer|text|numeric\([^)]*\)|boolean|banuchat\.\w+)([^\n]*)/gmu)) {
      assert.ok(column[1] && column[2]);
      columns.set(column[1], column[2]);
      if (/\bPRIMARY KEY\b|\bUNIQUE\b/u.test(column[3] ?? "")) keys.push([column[1]]);
      // Inline references can wrap onto the next line.
      const start = column.index ?? 0;
      const end = body.slice(start).search(/,(?:\r?\n)(?=    [a-zA-Z])/u);
      const definition = body.slice(start, end < 0 ? undefined : start + end);
      const ref = /REFERENCES (banuchat(?:_auth)?\.\w+)\(([^)]+)\)(?: ON DELETE (CASCADE|RESTRICT|SET NULL))?/u.exec(definition);
      if (ref?.[1] && ref[2]) foreignKeys.push({ columns: [column[1]], target: ref[1], targetColumns: names(ref[2]), onDelete: ref[3] ?? "NO ACTION" });
    }
    for (const key of body.matchAll(/^    (?:PRIMARY KEY|UNIQUE) \(([^)]+)\)/gmu)) {
      assert.ok(key[1]); keys.push(names(key[1]));
    }
    for (const fk of body.matchAll(/FOREIGN KEY \(([^)]+)\)\s+REFERENCES (banuchat(?:_auth)?\.\w+)\(([^)]+)\)(?: ON DELETE (CASCADE|RESTRICT|SET NULL))?/gu)) {
      assert.ok(fk[1] && fk[2] && fk[3]);
      foreignKeys.push({ columns: names(fk[1]), target: fk[2], targetColumns: names(fk[3]), onDelete: fk[4] ?? "NO ACTION" });
    }
    result.set(tableName, { columns, keys, foreignKeys, body });
  }
  return result;
}
const business = tables(initial);
const auth = tables(sql);
function table(name: string): Table {
  const result = auth.get(`banuchat_auth.${name}`);
  assert.ok(result, name); return result;
}
function compatible(type: string | undefined): string | undefined {
  return type === "banuchat.stable_key" || type === "banuchat.sha256_hex" ? "text" : type;
}

test("AUTH-P0 migration is additive, explicit-target guarded, transaction-scoped and has no seed/backfill/role mutation", () => {
  assert.equal(business.size, 16, "inspection helper must recognize all sixteen real business tables");
  assert.deepEqual([...auth.keys()], [
    "accounts", "password_credentials", "sessions", "refresh_tokens", "password_reset_tokens",
    "profile_bindings", "profile_binding_versions", "corpus_grants", "conversation_owners", "auth_rate_limits", "security_events",
  ].map(n => `banuchat_auth.${n}`));
  const statements = sql.replace(/--[^\n]*/gu, "");
  assert.match(statements, /^\s*BEGIN;/u);
  assert.match(statements, /COMMIT;\s*$/u);
  assert.match(sql, /current_setting\('banuchat_auth\.target_database', true\)/u);
  assert.match(sql, /current_database\(\) <> expected_database/u);
  assert.match(sql, /expected_database IS NULL OR expected_database = ''/u);
  assert.match(sql, /current_database\(\) ~\* 'ccd'/u);
  assert.match(sql, /to_regclass\('banuchat\.ccd_demo_contexts'\)/u);
  assert.match(sql, /d\.name = 'banuchat-synthetic'/u);
  assert.match(sql, /r\.manifest->'synthetic' = 'true'::jsonb/u);
  assert.match(sql, /AND c\.convalidated/u);
  assert.match(sql, /unnest\(c\.conkey\)/u);
  assert.match(sql, /unnest\(c\.confkey\)/u);
  assert.ok(sql.indexOf("$guard$;") < sql.indexOf("CREATE SCHEMA banuchat_auth"));
  assert.doesNotMatch(statements, /^\s*(?:INSERT INTO|UPDATE\s|DELETE FROM|TRUNCATE\s|DROP\s|CREATE ROLE|ALTER ROLE|CREATE DATABASE|GRANT\s)/imu);
  assert.doesNotMatch(statements, /\bALTER\s+(?:TABLE|FUNCTION|DOMAIN)\s+banuchat\./iu);
  assert.doesNotMatch(statements, /CREATE (?:FUNCTION|TRIGGER|TABLE IF NOT EXISTS|SCHEMA IF NOT EXISTS)/iu);
  assert.match(sql, /REVOKE ALL ON SCHEMA banuchat_auth FROM PUBLIC/u);
  assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_auth FROM PUBLIC/u);
});

test("AUTH-P0 every declared FK resolves to real compatible columns and a real primary/unique key", () => {
  const all = new Map([...business, ...auth]);
  let count = 0;
  for (const [name, child] of auth) for (const fk of child.foreignKeys) {
    count++;
    const parent = all.get(fk.target); assert.ok(parent, `${name} missing ${fk.target}`);
    assert.equal(fk.columns.length, fk.targetColumns.length);
    assert.ok(parent.keys.some(key => JSON.stringify(key) === JSON.stringify(fk.targetColumns)), `${name} references nonunique ${fk.target}(${fk.targetColumns.join(",")})`);
    for (let i = 0; i < fk.columns.length; i++) {
      const local = fk.columns[i]; const remote = fk.targetColumns[i]; assert.ok(local && remote);
      assert.ok(child.columns.has(local)); assert.ok(parent.columns.has(remote));
      assert.equal(compatible(child.columns.get(local)), compatible(parent.columns.get(remote)), `${name}.${local}`);
    }
  }
  assert.equal(count, 16, "all inline and composite FKs must be inspected, without silent omissions");
  const versions = table("profile_binding_versions");
  assert.ok(versions.foreignKeys.some(f => f.target === "banuchat.synthetic_profiles" && JSON.stringify(f.targetColumns) === '["dataset_release_id","profile_key"]'));
  assert.ok(versions.foreignKeys.some(f => f.target === "banuchat.dataset_releases" && JSON.stringify(f.targetColumns) === '["dataset_id","id"]'));
});

test("AUTH-P0 cascades remove only the owner of a deleted conversation, never account histories or corpus", () => {
  const deletes = [...auth.entries()].flatMap(([name, t]) => t.foreignKeys.map(f => ({ name, ...f })));
  assert.deepEqual(deletes.filter(f => f.onDelete === "CASCADE").map(f => [f.name, f.target]), [["banuchat_auth.conversation_owners", "banuchat.conversations"]]);
  assert.deepEqual(deletes.filter(f => f.onDelete === "SET NULL").map(f => [f.name, f.target]), [["banuchat_auth.security_events", "banuchat_auth.sessions"]]);
  for (const fk of deletes.filter(f => f.target === "banuchat_auth.accounts")) assert.equal(fk.onDelete, "RESTRICT");
  assert.ok(!table("sessions").foreignKeys.some(f => f.targetColumns.includes("auth_version")));
  assert.match(initial, /conversation_id uuid NOT NULL REFERENCES banuchat\.conversations\(id\) ON DELETE CASCADE/u);
  assert.match(initial, /REFERENCES banuchat\.messages\(id, answer_dataset_release_id\) ON DELETE CASCADE/u);
});

test("AUTH-P0 two accounts may bind the same fictional profile without sharing ownership or credentials", () => {
  const bindings = table("profile_bindings");
  assert.deepEqual(bindings.keys, [["principal_id"], ["principal_id", "dataset_id", "profile_key"]]);
  assert.deepEqual(table("conversation_owners").keys, [["conversation_id"]]);
  assert.match(sql, /conversation_owners_principal_idx\s+ON banuchat_auth\.conversation_owners\(principal_id, conversation_id\)/u);
  for (const t of auth.values()) {
    for (const column of ["alias", "grade", "progress_percent", "academic_record", "content", "embedding", "source_path", "source_sha256"]) assert.equal(t.columns.has(column), false);
  }
});

test("AUTH-P0 credential/token columns and state checks store verifiers and bounded finite timestamps", () => {
  for (const name of ["sessions", "refresh_tokens", "password_reset_tokens"]) {
    const t = table(name);
    const digest = name === "sessions" ? "access_token_digest" : "token_digest";
    assert.equal(t.columns.get(digest), "banuchat.sha256_hex");
    assert.ok(t.keys.some(k => JSON.stringify(k) === JSON.stringify([digest])));
    assert.match(t.body, new RegExp(`${digest} banuchat\\.sha256_hex NOT NULL UNIQUE`, "u"));
    for (const column of t.columns.keys()) assert.ok(column !== "token" && column !== "access_token" && column !== "refresh_token" && column !== "password");
  }
  assert.match(initial, /CREATE DOMAIN banuchat\.sha256_hex AS text CHECK \(VALUE ~ '\^\[0-9a-f\]\{64\}\$'\)/u);
  assert.match(initial, /CREATE DOMAIN banuchat\.finite_time AS timestamptz CHECK \(isfinite\(VALUE\)\)/u);
  const credentials = table("password_credentials");
  assert.match(credentials.body, /argon2id/u);
  assert.match(credentials.body, /BETWEEN 19456 AND 262144/u);
  assert.match(credentials.body, /BETWEEN 2 AND 10/u);
  assert.match(credentials.body, /p=1/u);
  assert.match(table("accounts").body, /status IN \('pending_password', 'active', 'disabled'\)/u);
  assert.match(table("accounts").body, /\(status = 'disabled'\) = \(disabled_at IS NOT NULL\)/u);
  assert.match(table("accounts").body, /auth_version > 0/u);
  for (const [name, t] of auth) for (const [column, type] of t.columns) {
    if (column.endsWith("_at")) assert.equal(type, "banuchat.finite_time", `${name}.${column}`);
  }
  assert.match(table("refresh_tokens").body, /\(consumed_at IS NULL\) = \(replaced_by IS NULL\)/u);
  assert.match(table("password_reset_tokens").body, /consumed_at IS NULL OR invalidated_at IS NULL/u);
  assert.match(table("password_reset_tokens").body, /purpose IN \('initial_set', 'reset'\)/u);
});

test("AUTH-P0 SQL time ceilings and limiter actions correspond to the frozen v2 policy", () => {
  const policy = contract["x-auth-policy"];
  for (const [name, field] of [["sessions", "access_ttl_seconds"], ["sessions", "session_absolute_seconds"], ["password_reset_tokens", "reset_ttl_seconds"]] as const) {
    assert.ok(table(name).body.includes(`interval '${String(policy[field])} seconds'`), field);
  }
  assert.match(table("sessions").body, /access_expires_at <= absolute_expires_at/u);
  assert.match(table("sessions").body, /last_seen_at < absolute_expires_at/u);
  const rate = table("auth_rate_limits");
  const actions = /action IN \(([\s\S]*?)\)/u.exec(rate.body)?.[1]; assert.ok(actions);
  const sqlActions = [...actions.matchAll(/'([^']+)'/gu)].map(m => m[1]);
  assert.deepEqual(sqlActions, contract["x-rate-limits"].map(r => r.action));
  assert.match(rate.body, /WHEN 'reset_uid' THEN 3600 WHEN 'hash_work' THEN 60 ELSE 900 END/u);
  for (const item of contract["x-rate-limits"]) assert.equal(item.window_seconds, item.action === "reset_uid" ? 3600 : item.action === "hash_work" ? 60 : 900);
  assert.match(rate.body, /bucket_key banuchat\.sha256_hex NOT NULL/u);
  assert.ok(!rate.foreignKeys.some(f => f.target === "banuchat_auth.accounts"));
  assert.match(sql, /password_reset_tokens_pending_idx[\s\S]*?WHERE consumed_at IS NULL AND invalidated_at IS NULL/u);
  assert.doesNotMatch(sql, /WHERE[^;]*now\(\)/u);
});

test("AUTH-P0 SQL account format matches the public UID schema and confines all recipients to reserved local mail", () => {
  const match = /synthetic_uid ~ '([^']+)'/u.exec(table("accounts").body); assert.ok(match?.[1]);
  const uidPattern = new RegExp(match[1], "u");
  assert.match(table("accounts").body, /char_length\(synthetic_uid\) = 13/u);
  assert.equal(uidPattern.test("BCH-DEMO-0001"), true);
  for (const invalid of ["bch-demo-0001", "BCH-DEMO-00001", "private-identity", "BCH-DEMO-000１"]) assert.equal(uidPattern.test(invalid), false);
  const mailMatch = /recovery_email ~ '([^']+)'/u.exec(table("accounts").body); assert.ok(mailMatch?.[1]);
  const mailPattern = new RegExp(mailMatch[1], "u");
  assert.equal(mailPattern.test("demo-0001@banuchat.test"), true);
  for (const invalid of ["demo-0001@other.test", "demo-0001@banuchat.test.invalid", "DEMO@banuchat.test", "demo@localhost", ".demo@banuchat.test", "a".repeat(65) + "@banuchat.test"]) assert.equal(mailPattern.test(invalid), false);
  assert.match(table("accounts").body, /recovery_email !~ '\[\.\]\[\.\]'/u);
  const events = table("security_events");
  assert.deepEqual([...events.columns.keys()], ["id", "occurred_at", "request_id", "principal_id", "session_id", "event_type", "outcome"]);
  assert.ok(![...events.columns.values()].includes("jsonb"));
});
