import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

interface OpenApiContract {
  openapi?: unknown;
  info?: {
    version?: unknown;
  };
  servers?: Array<{
    url?: unknown;
  }>;
  paths?: Record<string, Record<string, unknown>>;
}

test("the frozen OpenAPI contract contains the vertical-slice operations", async () => {
  const contractUrl = new URL("../openapi.yaml", import.meta.url);
  const contract = JSON.parse(await readFile(contractUrl, "utf8")) as OpenApiContract;

  assert.equal(contract.openapi, "3.1.0");
  assert.equal(contract.info?.version, "1.0.0-draft");
  assert.equal(contract.servers?.[0]?.url, "/api/v1");

  assert.ok(contract.paths?.["/profiles"]?.get);
  assert.ok(contract.paths?.["/conversations"]?.post);
  assert.ok(contract.paths?.["/conversations/{conversation_id}/messages"]?.post);
});
