import assert from "node:assert/strict";
import test from "node:test";

import {
  OllamaQueryEmbeddingClient,
  QueryEmbeddingClientError,
  type QueryEmbeddingConfig,
} from "../src/index.js";

const MODEL = "qwen3-embedding:0.6b";
const DIGEST = `sha256:${"a".repeat(64)}`;
const expected: QueryEmbeddingConfig = {
  provider: "ollama",
  model: MODEL,
  model_revision: DIGEST,
  dimension: 1024,
  distance_metric: "cosine",
  runtime_version: "0.12.3",
  query: {
    dimensions: 1024,
    truncate: false,
    input_prefix: null,
    normalization: "none",
    options: { num_ctx: 4096 },
  },
};

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function fakeFetch(
  overrides: Partial<Record<"version" | "tags" | "show" | "embed", unknown>> = {},
  calls: Array<{ url: string; init?: RequestInit }> = [],
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push({ url: url.toString(), ...(init === undefined ? {} : { init }) });
    if (url.pathname === "/api/version") return json(overrides.version ?? { version: "0.12.3" });
    if (url.pathname === "/api/tags") return json(overrides.tags ?? { models: [{ name: MODEL, digest: DIGEST }] });
    if (url.pathname === "/api/show") return json(overrides.show ?? {
      capabilities: ["embedding"],
      model_info: {
        "general.architecture": "qwen3",
        "qwen3.embedding_length": 1024,
        "qwen3.context_length": 4096,
      },
    });
    return json(overrides.embed ?? {
      model: MODEL,
      embeddings: [[1, ...Array<number>(1023).fill(0)]],
      truncated: false,
    });
  }) as typeof fetch;
}

async function assertReason(
  action: () => Promise<unknown>,
  reason: QueryEmbeddingClientError["reason"],
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof QueryEmbeddingClientError);
    assert.equal(error.reason, reason);
    return true;
  });
}

test("accepts only credential-free local HTTP URLs with an explicit port", () => {
  for (const url of [
    "https://localhost:11434",
    "http://example.com:11434",
    "http://user:pass@localhost:11434",
    "http://localhost:11434/path",
    "http://localhost:11434?x=1",
    "http://localhost:11434#x",
    "http://localhost",
  ]) {
    assert.throws(() => new OllamaQueryEmbeddingClient(url), QueryEmbeddingClientError);
  }
  assert.doesNotThrow(() => new OllamaQueryEmbeddingClient("http://localhost:11434"));
  assert.doesNotThrow(() => new OllamaQueryEmbeddingClient("http://127.0.0.1:11434"));
  assert.doesNotThrow(() => new OllamaQueryEmbeddingClient("http://[::1]:11434"));
});

test("verifies runtime and sends the stored query recipe without trimming", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, fakeFetch({}, calls));
  const vector = await client.embedQuery("  texto  ", expected);
  assert.equal(vector.length, 1024);
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), [
    "/api/version", "/api/tags", "/api/show", "/api/embed",
    "/api/version", "/api/tags", "/api/show",
  ]);
  for (const call of calls) assert.equal(call.init?.redirect, "error");
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    model: MODEL,
    input: ["  texto  "],
    dimensions: 1024,
    truncate: false,
    options: { num_ctx: 4096 },
  });
});

test("rejects digest, runtime, capability and model dimension mismatches", async (t) => {
  const cases = [
    { version: { version: "0.12.4" } },
    { tags: { models: [{ name: MODEL, digest: `sha256:${"b".repeat(64)}` }] } },
    { show: { capabilities: [], model_info: {} } },
    { show: { capabilities: ["embedding"], model_info: { "general.architecture": "qwen3", "qwen3.embedding_length": 768, "qwen3.context_length": 4096 } } },
  ];
  for (const [index, overrides] of cases.entries()) {
    await t.test(String(index), async () => {
      const client = new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, fakeFetch(overrides));
      await assertReason(() => client.embedQuery("query", expected), "embedding_runtime_mismatch");
    });
  }
});

test("rejects invalid embedding response shapes and values", async (t) => {
  const invalidEmbeddings: unknown[] = [
    [],
    [[1], [2]],
    [[1, 2]],
    [[Number.NaN, ...Array<number>(1023).fill(0)]],
    [[Number.POSITIVE_INFINITY, ...Array<number>(1023).fill(0)]],
    [[Number.MAX_VALUE, ...Array<number>(1023).fill(0)]],
    [Array<number>(1024).fill(0)],
  ];
  for (const [index, embeddings] of invalidEmbeddings.entries()) {
    await t.test(String(index), async () => {
      const client = new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, fakeFetch({ embed: { embeddings } }));
      await assertReason(() => client.embedQuery("query", expected), "invalid_embedding_response");
    });
  }
  for (const embed of [{ error: "bad" }, { truncated: true, embeddings: [[1, ...Array<number>(1023).fill(0)]] }]) {
    const client = new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, fakeFetch({ embed }));
    await assertReason(() => client.embedQuery("query", expected), "invalid_embedding_response");
  }
});

test("maps transport failures and rejects redirects", async () => {
  const unavailable = (async () => { throw new Error("offline"); }) as typeof fetch;
  await assertReason(
    () => new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, unavailable).embedQuery("query", expected),
    "embedding_unavailable",
  );

  const redirecting = (async () => new Response(null, { status: 302, headers: { Location: "http://example.com" } })) as typeof fetch;
  await assertReason(
    () => new OllamaQueryEmbeddingClient("http://localhost:11434", 5000, redirecting).embedQuery("query", expected),
    "embedding_unavailable",
  );
});
