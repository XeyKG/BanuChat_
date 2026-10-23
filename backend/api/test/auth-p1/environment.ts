import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

export interface TestEnvironment {
  container: string; network: string; host: string; port: number; database: string;
  adminUser: string; adminPassword: string; runtimeUser: string; runtimePassword: string;
  provisionUser: string; provisionPassword: string; deploymentId: string; rateKey: string;
}
export async function environment(): Promise<TestEnvironment> {
  const value = JSON.parse(await readFile(new URL("../../../../infra/local/auth-p1/environment.json", import.meta.url), "utf8")) as TestEnvironment;
  assert.equal(value.container, "banuchat-auth-p1-20261022");
  assert.equal(value.network, "banuchat-auth-p1-20261022-isolated");
  assert.equal(value.host, "127.0.0.1"); assert.equal(value.port, 55435);
  assert.equal(value.database, "banuchat_auth_p1_test");
  assert.equal(value.adminUser,"auth_p1_migrator");assert.equal(value.runtimeUser,"auth_p1_runtime");assert.equal(value.provisionUser,"auth_p1_provisioner");
  return value;
}
export function pool(value: TestEnvironment, kind: "admin" | "runtime" | "provision" = "admin"): Pool {
  return new Pool({ host: value.host, port: value.port, database: value.database,
    user: kind === "admin" ? value.adminUser : kind === "runtime" ? value.runtimeUser : value.provisionUser,
    password: kind === "admin" ? value.adminPassword : kind === "runtime" ? value.runtimePassword : value.provisionPassword,
    max: 8, connectionTimeoutMillis: 5000, statement_timeout: 10000,
    application_name: "BanuChat-AUTH-P1-isolated-test" });
}
export const release = "10000000-0000-4000-8000-000000000002";
