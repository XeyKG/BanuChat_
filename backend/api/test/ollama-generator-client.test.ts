import assert from "node:assert/strict";
import test from "node:test";

import {
  GeneratorClientError,
  loadGeneratorRuntimeConfig,
  OllamaGeneratorClient,
  type GeneratorConfig,
} from "../src/index.js";

const MODEL = "qwen3:4b-instruct";
const DIGEST_HEX = "a".repeat(64);
const PREFIXED_DIGEST = `sha256:${DIGEST_HEX}`;
const expected: GeneratorConfig = {
  provider: "ollama",
  model: MODEL,
  model_revision: DIGEST_HEX,
  runtime_version: "0.35.0",
  recipe: {
    think: false,
    stream: false,
    options: { temperature: 0, num_predict: 256 },
    keep_alive: "5m",
  },
};

type Endpoint = "version" | "tags" | "show" | "chat";
type Calls = Array<{ url: string; init?: RequestInit }>;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validChat(overrides: Record<string, unknown> = {}): unknown {
  return {
    message: { role: "assistant", content: " respuesta " },
    done: true,
    done_reason: "stop",
    prompt_eval_count: 12,
    eval_count: 7,
    total_duration: 2_500_000,
    ...overrides,
  };
}

function fakeFetch(
  overrides: Partial<Record<Endpoint, unknown>> = {},
  calls: Calls = [],
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push({ url: url.toString(), ...(init === undefined ? {} : { init }) });
    if (url.pathname === "/api/version") {
      return json(overrides.version ?? { version: "0.35.0" });
    }
    if (url.pathname === "/api/tags") {
      return json(overrides.tags ?? { models: [{ name: MODEL, digest: DIGEST_HEX }] });
    }
    if (url.pathname === "/api/show") {
      return json(overrides.show ?? { capabilities: ["completion", "thinking"] });
    }
    return json(overrides.chat ?? validChat());
  }) as typeof fetch;
}

async function assertReason(
  action: () => Promise<unknown>,
  reason: GeneratorClientError["reason"],
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof GeneratorClientError);
    assert.equal(error.reason, reason);
    assert.equal(error.message, "Generator request rejected.");
    return true;
  });
}

test("accepts only credential-free loopback HTTP URLs with an explicit port", () => {
  for (const url of [
    "https://localhost:11434",
    "http://example.com:11434",
    "http://user:pass@localhost:11434",
    "http://localhost:11434/path",
    "http://localhost:11434?x=1",
    "http://localhost:11434#x",
    "http://localhost",
  ]) {
    assert.throws(
      () => new OllamaGeneratorClient(url),
      GeneratorClientError,
    );
  }
  for (const url of [
    "http://localhost:11434",
    "http://127.0.0.1:11434",
    "http://[::1]:11434",
  ]) {
    assert.doesNotThrow(() => new OllamaGeneratorClient(url));
  }
  for (const timeout of [0, -1, 300_001, 1.5]) {
    assert.throws(
      () => new OllamaGeneratorClient("http://localhost:11434", timeout),
      GeneratorClientError,
    );
  }
});

test("loads and validates explicit generator runtime configuration", () => {
  const config = loadGeneratorRuntimeConfig({
    BANUCHAT_GENERATOR_MODEL: MODEL,
    BANUCHAT_GENERATOR_MODEL_REVISION: DIGEST_HEX.toUpperCase(),
    BANUCHAT_GENERATOR_RUNTIME_VERSION: "0.35.0",
  });
  assert.equal(config.base_url, "http://127.0.0.1:11434");
  assert.deepEqual(config.generator, expected);

  const prefixed = loadGeneratorRuntimeConfig({
    BANUCHAT_OLLAMA_BASE_URL: "http://[::1]:11434",
    BANUCHAT_GENERATOR_MODEL: MODEL,
    BANUCHAT_GENERATOR_MODEL_REVISION: PREFIXED_DIGEST,
    BANUCHAT_GENERATOR_RUNTIME_VERSION: "0.35.0",
  });
  assert.equal(prefixed.generator.model_revision, DIGEST_HEX);

  for (const [name, value] of [
    ["BANUCHAT_OLLAMA_BASE_URL", "https://localhost:11434"],
    ["BANUCHAT_GENERATOR_MODEL", "qwen3:1.7b"],
    ["BANUCHAT_GENERATOR_MODEL_REVISION", "abc"],
    ["BANUCHAT_GENERATOR_RUNTIME_VERSION", "v0.35.0"],
  ] as const) {
    assert.throws(
      () =>
        loadGeneratorRuntimeConfig({
          BANUCHAT_OLLAMA_BASE_URL: "http://localhost:11434",
          BANUCHAT_GENERATOR_MODEL: MODEL,
          BANUCHAT_GENERATOR_MODEL_REVISION: DIGEST_HEX,
          BANUCHAT_GENERATOR_RUNTIME_VERSION: "0.35.0",
          [name]: value,
        }),
      new RegExp(name),
    );
  }
});

test("verifies runtime twice and sends the exact chat payload without trimming", async () => {
  const calls: Calls = [];
  const client = new OllamaGeneratorClient(
    "http://localhost:11434",
    5_000,
    fakeFetch({}, calls),
  );
  const result = await client.generate(
    { system_prompt: "  sistema  ", user_prompt: "  usuario  " },
    expected,
  );

  assert.deepEqual(result, {
    content: " respuesta ",
    done_reason: "stop",
    prompt_eval_count: 12,
    eval_count: 7,
    total_duration_ms: 2.5,
  });
  assert.deepEqual(
    calls.map((call) => new URL(call.url).pathname),
    [
      "/api/version",
      "/api/tags",
      "/api/show",
      "/api/chat",
      "/api/version",
      "/api/tags",
      "/api/show",
    ],
  );
  for (const call of calls) assert.equal(call.init?.redirect, "error");
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), { model: MODEL });
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    model: MODEL,
    stream: false,
    think: false,
    keep_alive: "5m",
    options: { temperature: 0, num_predict: 256 },
    messages: [
      { role: "system", content: "  sistema  " },
      { role: "user", content: "  usuario  " },
    ],
  });
});

test("accepts equivalent bare, prefixed and case-varied SHA-256 digests", async (t) => {
  const cases: Array<[string, string]> = [
    [DIGEST_HEX, DIGEST_HEX],
    [PREFIXED_DIGEST, DIGEST_HEX],
    [DIGEST_HEX, PREFIXED_DIGEST],
    [DIGEST_HEX.toUpperCase(), PREFIXED_DIGEST.toUpperCase()],
  ];
  for (const [configuredDigest, observedDigest] of cases) {
    await t.test(`${configuredDigest.slice(0, 8)} / ${observedDigest.slice(0, 8)}`, async () => {
      const config = loadGeneratorRuntimeConfig({
        BANUCHAT_GENERATOR_MODEL: MODEL,
        BANUCHAT_GENERATOR_MODEL_REVISION: configuredDigest,
        BANUCHAT_GENERATOR_RUNTIME_VERSION: "0.35.0",
      });
      const client = new OllamaGeneratorClient(
        "http://localhost:11434",
        5_000,
        fakeFetch({ tags: { models: [{ name: MODEL, digest: observedDigest }] } }),
      );
      const result = await client.generate(
        { system_prompt: "s", user_prompt: "u" },
        config.generator,
      );
      assert.equal(result.content, " respuesta ");
    });
  }
});

test("rejects runtime, model, digest and completion capability mismatches", async (t) => {
  const cases: Array<Partial<Record<Endpoint, unknown>>> = [
    { version: { version: "0.35.1" } },
    { tags: { models: [{ name: "another-model", digest: DIGEST_HEX }] } },
    { tags: { models: [{ name: MODEL, digest: `sha256:${"b".repeat(64)}` }] } },
    { tags: { models: [{ name: MODEL, digest: "malformed" }] } },
    { show: { capabilities: ["thinking"] } },
  ];
  for (const [index, overrides] of cases.entries()) {
    await t.test(String(index), async () => {
      const client = new OllamaGeneratorClient(
        "http://localhost:11434",
        5_000,
        fakeFetch(overrides),
      );
      await assertReason(
        () => client.generate({ system_prompt: "s", user_prompt: "u" }, expected),
        "generator_runtime_mismatch",
      );
    });
  }
});

test("rejects a generator config whose num_predict is not 256", async () => {
  const client = new OllamaGeneratorClient(
    "http://localhost:11434",
    5_000,
    fakeFetch(),
  );
  const invalid = {
    ...expected,
    recipe: {
      ...expected.recipe,
      options: { ...expected.recipe.options, num_predict: 128 },
    },
  } as unknown as GeneratorConfig;

  await assertReason(
    () => client.generate({ system_prompt: "s", user_prompt: "u" }, invalid),
    "generator_runtime_mismatch",
  );
});

test("rejects visible thinking, blank content and invalid metrics", async (t) => {
  const cases = [
    validChat({ message: { content: "answer", thinking: "secret" } }),
    validChat({ message: { content: "   " } }),
    validChat({ prompt_eval_count: -1 }),
    validChat({ eval_count: Number.NaN }),
    validChat({ total_duration: Number.POSITIVE_INFINITY }),
  ];
  for (const [index, chat] of cases.entries()) {
    await t.test(String(index), async () => {
      const client = new OllamaGeneratorClient(
        "http://localhost:11434",
        5_000,
        fakeFetch({ chat }),
      );
      await assertReason(
        () => client.generate({ system_prompt: "s", user_prompt: "u" }, expected),
        "invalid_generator_response",
      );
    });
  }
});

test("rejects incomplete and length-truncated responses", async (t) => {
  for (const chat of [
    validChat({ done: false }),
    validChat({ done_reason: "length" }),
  ]) {
    await t.test(String((chat as { done_reason?: unknown }).done_reason), async () => {
      const client = new OllamaGeneratorClient(
        "http://localhost:11434",
        5_000,
        fakeFetch({ chat }),
      );
      await assertReason(
        () => client.generate({ system_prompt: "s", user_prompt: "u" }, expected),
        "generator_response_incomplete",
      );
    });
  }
});

test("rejects blank inputs without altering valid prompt content", async () => {
  const client = new OllamaGeneratorClient(
    "http://localhost:11434",
    5_000,
    fakeFetch(),
  );
  for (const input of [
    { system_prompt: "", user_prompt: "u" },
    { system_prompt: "s", user_prompt: " \t " },
  ]) {
    await assertReason(
      () => client.generate(input, expected),
      "invalid_generator_response",
    );
  }
});

test("maps malformed JSON, 5xx, transport, timeout and redirect failures", async (t) => {
  const cases: Array<[string, typeof fetch, GeneratorClientError["reason"]]> = [
    [
      "malformed",
      (async () => new Response("{", { status: 200 })) as typeof fetch,
      "invalid_generator_response",
    ],
    [
      "5xx",
      (async () => new Response(null, { status: 503 })) as typeof fetch,
      "generator_unavailable",
    ],
    [
      "transport",
      (async () => {
        throw new Error("offline");
      }) as typeof fetch,
      "generator_unavailable",
    ],
    [
      "timeout",
      (async () => {
        throw new DOMException("timed out", "TimeoutError");
      }) as typeof fetch,
      "generator_unavailable",
    ],
    [
      "redirect",
      (async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "http://example.com" },
        })) as typeof fetch,
      "generator_unavailable",
    ],
  ];
  for (const [name, implementation, reason] of cases) {
    await t.test(name, async () => {
      const client = new OllamaGeneratorClient(
        "http://localhost:11434",
        5_000,
        implementation,
      );
      await assertReason(
        () => client.generate({ system_prompt: "s", user_prompt: "u" }, expected),
        reason,
      );
    });
  }
});

test("detects a runtime change during generation", async () => {
  let versionCalls = 0;
  const implementation = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === "/api/version") {
      versionCalls += 1;
      return json({ version: versionCalls === 1 ? "0.35.0" : "0.35.1" });
    }
    return fakeFetch()(input, init);
  }) as typeof fetch;
  const client = new OllamaGeneratorClient(
    "http://localhost:11434",
    5_000,
    implementation,
  );
  await assertReason(
    () => client.generate({ system_prompt: "s", user_prompt: "u" }, expected),
    "generator_runtime_mismatch",
  );
});
