import assert from "node:assert/strict";
import test from "node:test";

import {
  DocumentQueryRetrievalError,
  QueryEmbeddingClientError,
  retrieveDocumentChunksForQuery,
  type DocumentQueryRetrievalInput,
  type QueryEmbeddingClient,
  type QueryEmbeddingConfig,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "9c24f15e-17d8-4a30-a676-69fd706f0967";
const DIGEST = `sha256:${"a".repeat(64)}`;

function input(
  overrides: Partial<DocumentQueryRetrievalInput> = {},
): DocumentQueryRetrievalInput {
  return { release_id: RELEASE_ID, query: "  consulta sintética  ", top_k: 5, ...overrides };
}

function config(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: "ollama",
    model: "qwen3-embedding:0.6b",
    model_revision: DIGEST,
    dimension: 1024,
    distance_metric: "cosine",
    parameters: {
      runtime_version: "0.12.3",
      document: { malformed: true },
      query: {
        dimensions: 1024,
        truncate: false,
        input_prefix: null,
        normalization: "none",
        options: { num_ctx: 4096 },
      },
    },
    ...overrides,
  };
}

function sqlWithConfig(
  configRows: unknown[] = [config()],
): { client: SqlQueryClient; calls: Array<{ text: string; values?: readonly unknown[] }> } {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const client: SqlQueryClient = {
    async query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }> {
      calls.push({ text, ...(values === undefined ? {} : { values }) });
      if (calls.length === 1) return { rows: configRows as T[] };
      if (calls.length === 2) return { rows: [{ available: true }] as T[] };
      return { rows: [] };
    },
  };
  return { client, calls };
}

function embeddingClient(
  vector: number[] = [1, ...Array<number>(1023).fill(0)],
): { client: QueryEmbeddingClient; calls: Array<{ text: string; config: QueryEmbeddingConfig }> } {
  const calls: Array<{ text: string; config: QueryEmbeddingConfig }> = [];
  return {
    calls,
    client: {
      async embedQuery(text, expectedConfig): Promise<number[]> {
        calls.push({ text, config: expectedConfig });
        return vector;
      },
    },
  };
}

async function assertReason(
  action: () => Promise<unknown>,
  reason: DocumentQueryRetrievalError["reason"],
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof DocumentQueryRetrievalError);
    assert.equal(error.reason, reason);
    return true;
  });
}

test("rejects invalid query retrieval arguments before dependencies", async (t) => {
  for (const candidate of [
    input({ release_id: "bad" }),
    input({ query: " \t\n" }),
    input({ query: "😀".repeat(4001) }),
    input({ top_k: 0 }),
    input({ top_k: 21 }),
  ]) {
    await t.test(JSON.stringify(candidate).slice(0, 40), async () => {
      let queried = false;
      const sql: SqlQueryClient = { async query<T>() { queried = true; return { rows: [] as T[] }; } };
      await assertReason(
        () => retrieveDocumentChunksForQuery({ sql, query_embedding_client: embeddingClient().client }, candidate),
        "invalid_argument",
      );
      assert.equal(queried, false);
    });
  }
});

test("reports a release that is absent or not ready", async () => {
  const { client } = sqlWithConfig([]);
  await assertReason(
    () => retrieveDocumentChunksForQuery({ sql: client, query_embedding_client: embeddingClient().client }, input()),
    "release_not_available",
  );
});

test("rejects malformed or unsupported embedding configurations", async (t) => {
  const cases: unknown[] = [
    null,
    config({ provider: "remote" }),
    config({ model: "other" }),
    config({ model_revision: "bad" }),
    config({ dimension: 768 }),
    config({ distance_metric: "l2" }),
    config({ parameters: { runtime_version: "bad", query: {} } }),
    config({ parameters: { runtime_version: "0.12.3", query: { dimensions: 1024, truncate: false, input_prefix: null, normalization: "none", options: { num_ctx: 0 } } } }),
    config({ parameters: { runtime_version: "0.12.3", query: { dimensions: 1024, truncate: false, input_prefix: null, normalization: "none", options: { num_ctx: 4096, undocumented: true } } } }),
  ];
  for (const [index, row] of cases.entries()) {
    await t.test(String(index), async () => {
      await assertReason(
        () => retrieveDocumentChunksForQuery({ sql: sqlWithConfig([row]).client, query_embedding_client: embeddingClient().client }, input()),
        "embedding_config_invalid",
      );
    });
  }
});

test("uses parameters.query, preserves text and composes with F1a", async () => {
  const { client: sql, calls: sqlCalls } = sqlWithConfig();
  const embed = embeddingClient();
  const result = await retrieveDocumentChunksForQuery(
    { sql, query_embedding_client: embed.client },
    input({ top_k: 9 }),
  );

  assert.deepEqual(result, []);
  assert.equal(embed.calls.length, 1);
  assert.equal(embed.calls[0]?.text, "  consulta sintética  ");
  assert.deepEqual(embed.calls[0]?.config.query, {
    dimensions: 1024,
    truncate: false,
    input_prefix: null,
    normalization: "none",
    options: { num_ctx: 4096 },
  });
  assert.equal("document" in (embed.calls[0]?.config ?? {}), false);
  assert.match(sqlCalls[0]?.text ?? "", /JOIN banuchat\.embedding_configs ec ON ec\.id = dr\.embedding_config_id/);
  assert.match(sqlCalls[0]?.text ?? "", /dr\.status = 'ready'/);
  assert.deepEqual(sqlCalls[0]?.values, [RELEASE_ID]);
  assert.deepEqual(sqlCalls[1]?.values, [RELEASE_ID]);
  assert.deepEqual(sqlCalls[2]?.values, [
    RELEASE_ID,
    `[${[1, ...Array<number>(1023).fill(0)].join(",")}]`,
    9,
  ]);
});

test("maps closed embedding client failures", async (t) => {
  for (const reason of [
    "embedding_runtime_mismatch",
    "embedding_unavailable",
    "invalid_embedding_response",
  ] as const) {
    await t.test(reason, async () => {
      const failing: QueryEmbeddingClient = {
        async embedQuery(): Promise<number[]> { throw new QueryEmbeddingClientError(reason); },
      };
      await assertReason(
        () => retrieveDocumentChunksForQuery({ sql: sqlWithConfig().client, query_embedding_client: failing }, input()),
        reason,
      );
    });
  }
});

test("keeps F1b errors closed if F1a observes a concurrent release change", async () => {
  let call = 0;
  const sql: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      call += 1;
      return { rows: (call === 1 ? [config()] : [{ available: false }]) as T[] };
    },
  };
  await assertReason(
    () => retrieveDocumentChunksForQuery({ sql, query_embedding_client: embeddingClient().client }, input()),
    "release_not_available",
  );
});

test("propagates database dependency failures without wrapping", async () => {
  const failure = new Error("database unavailable");
  const sql: SqlQueryClient = { async query<T>(): Promise<{ rows: T[] }> { throw failure; } };
  await assert.rejects(
    () => retrieveDocumentChunksForQuery({ sql, query_embedding_client: embeddingClient().client }, input()),
    (error: unknown) => error === failure,
  );
});
