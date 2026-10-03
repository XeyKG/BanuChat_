import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeConfig } from "../src/runtime-config.js";

function environment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    POSTGRES_DB: "synthetic_db",
    POSTGRES_USER: "synthetic_user",
    POSTGRES_PASSWORD: "synthetic_password",
    ...overrides,
  };
}

test("defaults API host to loopback and keeps PostgreSQL on loopback", () => {
  const config = loadRuntimeConfig(environment());

  assert.equal(config.api.host, "127.0.0.1");
  assert.equal(config.postgres.host, "127.0.0.1");
});

test("accepts an explicit loopback API host", () => {
  const config = loadRuntimeConfig(environment({ BANUCHAT_API_HOST: "127.0.0.1" }));

  assert.equal(config.api.host, "127.0.0.1");
});

test("accepts LAN bind and preserves API port configuration", () => {
  const config = loadRuntimeConfig(
    environment({ BANUCHAT_API_HOST: "0.0.0.0", BANUCHAT_API_PORT: "3456" }),
  );

  assert.equal(config.api.host, "0.0.0.0");
  assert.equal(config.api.port, 3456);
  assert.equal(config.postgres.host, "127.0.0.1");
});

test("rejects unsupported API host values", () => {
  for (const value of ["localhost", ""]) {
    assert.throws(
      () => loadRuntimeConfig(environment({ BANUCHAT_API_HOST: value })),
      /BANUCHAT_API_HOST/,
    );
  }
});
