import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "../src/runtime-config.js";
import { assertCcdChatDatabase } from "../src/ccd-runtime.js";
import { profileRelation } from "../src/application/demo-mode.js";
import { dispatchChatQuery } from "../src/chat/chat-dispatcher.js";
import type { IntentRouter } from "../src/routing/intent-router-types.js";
import type { SqlQueryClient } from "../src/data/sql-client.js";

const environment = { BANUCHAT_DEMO_MODE: "ccd_local", CCD_POSTGRES_USER: "fixture", CCD_POSTGRES_PASSWORD: "fixture",
  POSTGRES_DB: "synthetic_demo", POSTGRES_PORT: "5432", POSTGRES_USER: "other", POSTGRES_PASSWORD: "other" };
test("CCD config uses its fixed DB, credentials and isolated defaults; synthetic env cannot redirect it", () => {
  const config = loadRuntimeConfig(environment);
  assert.equal(config.postgres.database, "banuchat_ccd_dev");
  assert.equal(config.postgres.port, 55433);
  assert.equal(config.postgres.user, "fixture");
  assert.deepEqual(config.api, { host: "127.0.0.1", port: 3001 });
});
test("CCD config refuses ambiguous modes, demo port, remote bind and missing credentials", () => {
  for (const change of [{ BANUCHAT_DEMO_MODE: "unknown" }, { CCD_POSTGRES_PORT: "5432" },
    { BANUCHAT_API_HOST: "0.0.0.0" }, { CCD_POSTGRES_PASSWORD: "" }]) {
    assert.throws(() => loadRuntimeConfig({ ...environment, ...change }));
  }
  assert.throws(() => loadRuntimeConfig({ POSTGRES_DB: "banuchat_ccd_dev" }));
});
test("profile SQL relation is allowlisted; the CCD context does not use synthetic student records", () => {
  assert.equal(profileRelation("ccd_local"), "banuchat.ccd_demo_contexts");
  assert.equal(profileRelation("synthetic"), "banuchat.synthetic_profiles");
  assert.throws(() => Reflect.apply(profileRelation, null, ["evil"]));
});
test("CCD startup rejects wrong DB, missing context or synthetic students", async () => {
  for (const row of [{ database: "demo", contexts: 1, synthetic_profiles: 0 },
    { database: "banuchat_ccd_dev", contexts: 0, synthetic_profiles: 0 },
    { database: "banuchat_ccd_dev", contexts: 1, synthetic_profiles: 1 }]) {
    const sql: SqlQueryClient = { async query<T>() { return { rows: [row] as T[] }; } };
    await assert.rejects(assertCcdChatDatabase(sql));
  }
});
test("CCD contact previously classified out of scope reaches RAG; help and unsupported fast paths stay scoped", async () => {
  const sql: SqlQueryClient = { async query<T>(): Promise<{ rows: T[] }> { throw new Error("Unexpected structured lookup"); } };
  const input = { content: "consulta", release_id: "11111111-1111-4111-8111-111111111111", profile_key: null, now: "2026-10-21T10:00:00-05:00" };
  const routerFor = (route: "known_out_of_scope" | "capabilities_help" | "course_catalog"): IntentRouter => ({
    catalog_valid: true, catalog_version: "fixture", route: () => ({ route, parameters: {},
      response_variant: route === "capabilities_help" ? "capabilities" : "not_available" }),
  });
  for (const route of ["known_out_of_scope", "course_catalog"] as const) {
    const fallback = await dispatchChatQuery({ sql, router: routerFor(route), demo_mode: "ccd_local" }, input);
    assert.deepEqual(fallback, { kind: "agent_fallback" });
  }
  for (const route of ["capabilities_help"] as const) {
    const answer = await dispatchChatQuery({ sql, router: routerFor(route), demo_mode: "ccd_local" }, input);
    assert.equal(answer.kind, "answered");
    if (answer.kind === "answered") {
      assert.match(answer.content, /sin identidad institucional/);
      assert.deepEqual(answer.citation_records, []);
      assert.equal(answer.insufficient_evidence, false);
    }
  }
});
