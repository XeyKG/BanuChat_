import assert from "node:assert/strict";
import test from "node:test";

import {
  dispatchChatQuery,
  type ChatDispatchInput,
  type IntentRouter,
  type IntentRoutingDecision,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const RELEASE_ROW = {
  release_id: RELEASE_ID,
  embedding_config_id: "33333333-3333-4333-8333-333333333333",
};
const DOCUMENT_ROW = {
  document_key: "guide",
  retrieval_mode: "full_document",
  document_version_id: DOCUMENT_VERSION_ID,
  title: "Guía completa",
  mime_type: "text/markdown",
  source_path: "documents/guide.md",
  source_locator: "document:guide",
  source_sha256: "a".repeat(64),
};
const INPUT: ChatDispatchInput = {
  content: "busca la guía",
  profile_key: null,
  release_id: RELEASE_ID,
  now: "2026-10-01T09:00:00-05:00",
};

function router(decision: IntentRoutingDecision): IntentRouter {
  return {
    catalog_valid: true,
    catalog_version: "test",
    route() {
      return decision;
    },
  };
}

function sqlClient(rows: readonly (readonly unknown[])[]): {
  sql: SqlQueryClient;
  calls: { text: string; values: readonly unknown[] | undefined }[];
} {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const sql: SqlQueryClient = {
    async query<T>(text: string, values?: readonly unknown[]) {
      const result = rows[calls.length];
      assert.ok(result, "unexpected SQL query");
      calls.push({ text, values });
      return { rows: [...result] as T[] };
    },
  };
  return { sql, calls };
}

for (const retrievalMode of ["full_document", "chunked"] as const) {
  test(`dispatches ${retrievalMode} document lookup without a profile`, async () => {
    const { sql, calls } = sqlClient([
      [RELEASE_ROW],
      [{ ...DOCUMENT_ROW, retrieval_mode: retrievalMode }],
    ]);
    const result = await dispatchChatQuery(
      {
        sql,
        router: router({
          route: "document_lookup",
          parameters: {
            query: DOCUMENT_ROW.title,
            retrieval_mode: retrievalMode,
            limit: 4,
          },
          response_variant: null,
        }),
      },
      INPUT,
    );

    assert.equal(result.kind, "answered");
    if (result.kind !== "answered") return;
    assert.equal(result.route, "document_lookup");
    assert.equal(result.citation_records[0]?.chunk_id, null);
    assert.deepEqual(calls[1]?.values, [
      RELEASE_ID,
      DOCUMENT_ROW.title,
      retrievalMode,
      4,
    ]);
  });
}

test("falls back without SQL when document lookup has no query", async () => {
  const { sql, calls } = sqlClient([]);
  const result = await dispatchChatQuery(
    {
      sql,
      router: router({
        route: "document_lookup",
        parameters: {},
        response_variant: null,
      }),
    },
    INPUT,
  );
  assert.deepEqual(result, { kind: "agent_fallback" });
  assert.equal(calls.length, 0);
});
