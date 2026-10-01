import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeApiServer,
  type DocumentRagResponder,
  type IntentRouter,
  type SqlQueryClient,
} from "../src/index.js";

const sql: SqlQueryClient = {
  async query<T>(): Promise<{ rows: T[] }> {
    throw new Error("unexpected query");
  },
};

let documentRagCalls = 0;
const documentRag: DocumentRagResponder = async () => {
  documentRagCalls += 1;
  throw new Error("unexpected Ollama call");
};

function router(catalogValid: boolean): IntentRouter {
  return {
    catalog_valid: catalogValid,
    catalog_version: catalogValid ? "test" : null,
    route: () => ({
      route: "agent_fallback",
      parameters: {},
      response_variant: null,
    }),
  };
}

test("the runtime loads a valid router before listening", async () => {
  const events: string[] = [];
  documentRagCalls = 0;
  const server = await createRuntimeApiServer(
    sql,
    documentRag,
    async () => {
      events.push("router_loaded");
      return router(true);
    },
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      events.push("listening");
      resolve();
    });
  });

  try {
    assert.deepEqual(events, ["router_loaded", "listening"]);
    assert.equal(documentRagCalls, 0);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
  }
});

test("an invalid router prevents creation of a listenable runtime server", async () => {
  let routerLoads = 0;
  await assert.rejects(
    createRuntimeApiServer(sql, documentRag, async () => {
      routerLoads += 1;
      return router(false);
    }),
    /intent_router_catalog_invalid/u,
  );
  assert.equal(routerLoads, 1);
});
