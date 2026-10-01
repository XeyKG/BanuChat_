import assert from "node:assert/strict";
import test from "node:test";

import type { Pool } from "pg";

import { DatabaseDependencyError } from "../src/data/database-errors.js";
import { PgSqlClient } from "../src/data/pg-client.js";
import { loadRuntimeConfig } from "../src/runtime-config.js";

function createPool(
  query: (...arguments_: unknown[]) => Promise<{ rows: unknown[] }>,
): Pool {
  return { query } as unknown as Pool;
}

function databaseError(code: string): Error & { code: string } {
  return Object.assign(new Error("must not be exposed"), { code });
}

const validEnvironment: NodeJS.ProcessEnv = {
  POSTGRES_DB: "banuchat",
  POSTGRES_USER: "local_user",
  POSTGRES_PASSWORD: "local_password",
};

test("PgSqlClient returns rows and passes SQL and parameters to Pool", async () => {
  const calls: unknown[][] = [];
  const expectedRows = [{ id: 1 }];
  const pool = createPool(async (...arguments_) => {
    calls.push(arguments_);
    return { rows: expectedRows };
  });

  const result = await new PgSqlClient(pool).query<{ id: number }>(
    "SELECT id FROM profiles WHERE id = $1",
    [1],
  );

  assert.deepEqual(result.rows, expectedRows);
  assert.deepEqual(calls, [
    ["SELECT id FROM profiles WHERE id = $1", [1]],
  ]);
});

for (const code of ["ECONNREFUSED", "ETIMEDOUT", "08006", "57P01"]) {
  test(`PgSqlClient maps ${code} to DatabaseDependencyError`, async () => {
    const pool = createPool(async () => {
      throw databaseError(code);
    });

    await assert.rejects(
      new PgSqlClient(pool).query("SELECT 1"),
      DatabaseDependencyError,
    );
  });
}

test("PgSqlClient propagates an unrelated SQL error", async () => {
  const expectedError = databaseError("42601");
  const pool = createPool(async () => {
    throw expectedError;
  });

  await assert.rejects(
    new PgSqlClient(pool).query("invalid SQL"),
    (error) => error === expectedError,
  );
});

test("loadRuntimeConfig reads valid configuration", () => {
  const config = loadRuntimeConfig({
    ...validEnvironment,
    POSTGRES_PORT: "5433",
    BANUCHAT_API_PORT: "3001",
  });

  assert.equal(config.postgres.database, "banuchat");
  assert.equal(config.postgres.user, "local_user");
  assert.equal(config.postgres.password, "local_password");
  assert.equal(config.postgres.port, 5433);
  assert.equal(config.api.port, 3001);
});

for (const name of [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
] as const) {
  test(`loadRuntimeConfig rejects missing ${name}`, () => {
    const environment = { ...validEnvironment };
    delete environment[name];
    assert.throws(() => loadRuntimeConfig(environment), new RegExp(name));
  });
}

test("loadRuntimeConfig rejects an invalid PostgreSQL port", () => {
  assert.throws(
    () =>
      loadRuntimeConfig({ ...validEnvironment, POSTGRES_PORT: "65536" }),
    /POSTGRES_PORT/,
  );
});

test("loadRuntimeConfig rejects an invalid API port", () => {
  assert.throws(
    () =>
      loadRuntimeConfig({ ...validEnvironment, BANUCHAT_API_PORT: "0" }),
    /BANUCHAT_API_PORT/,
  );
});

test("loadRuntimeConfig uses port defaults and loopback hosts", () => {
  const config = loadRuntimeConfig(validEnvironment);

  assert.equal(config.postgres.port, 5432);
  assert.equal(config.api.port, 3000);
  assert.equal(config.postgres.host, "127.0.0.1");
  assert.equal(config.api.host, "127.0.0.1");
});
