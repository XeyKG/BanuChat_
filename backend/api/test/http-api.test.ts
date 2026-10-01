import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createApiServer,
  DatabaseDependencyError,
  type IntentRouter,
  type IntentRoutingDecision,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";
const EMBEDDING_CONFIG_ID = "44444444-4444-4444-8444-444444444444";
const CREATED_AT = "2026-09-30T15:00:00.000Z";
const NOW = "2026-10-01T14:00:00.000Z";
const USER_MESSAGE_ID = "55555555-5555-4555-8555-555555555555";
const ASSISTANT_MESSAGE_ID = "66666666-6666-4666-8666-666666666666";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueryOutcome = readonly unknown[] | Error;

class ScriptedSqlClient implements SqlQueryClient {
  constructor(private readonly outcomes: QueryOutcome[]) {}

  async query<T>(): Promise<{ rows: T[] }> {
    const outcome = this.outcomes.shift();
    if (outcome === undefined) {
      throw new Error("unexpected query");
    }
    if (outcome instanceof Error) {
      throw outcome;
    }
    return { rows: [...outcome] as T[] };
  }
}

const currentReleaseRow = {
  release_id: RELEASE_ID,
  current_release_id: RELEASE_ID,
  status: "ready",
  embedding_config_id: EMBEDDING_CONFIG_ID,
  embedding_model: "qwen3-embedding:0.6b",
  embedding_dimensions: 1024,
};

const createdConversationRow = {
  conversation_id: CONVERSATION_ID,
  profile_key: "student_001",
  profile_alias: "Estudiante Uno",
  started_at: CREATED_AT,
};

const conversationContextRow = {
  dataset_release_id: RELEASE_ID,
  profile_key: "student_001",
  current_release_id: RELEASE_ID,
  current_release_is_ready: true,
  expected_next_ordinal: 0,
};

const EMPTY_CALENDAR_ANSWER =
  "No encontré eventos que comiencen dentro del rango consultado.";

function persistedTurnRow(
  content: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    status: "inserted",
    user_message_id: USER_MESSAGE_ID,
    user_ordinal: 0,
    user_content: content,
    user_created_at: "2026-10-01T14:00:01.000Z",
    assistant_message_id: ASSISTANT_MESSAGE_ID,
    assistant_ordinal: 1,
    assistant_content: EMPTY_CALENDAR_ANSWER,
    assistant_created_at: "2026-10-01T14:00:01.001Z",
    assistant_insufficient_evidence: false,
    ...overrides,
  };
}

function sql(...outcomes: QueryOutcome[]): SqlQueryClient {
  return new ScriptedSqlClient(outcomes);
}

function router(decision: IntentRoutingDecision): IntentRouter {
  return {
    catalog_valid: true,
    catalog_version: "test",
    route: () => decision,
  };
}

const fallbackRouter = router({
  route: "agent_fallback",
  parameters: {},
  response_variant: null,
});

const calendarRouter = router({
  route: "calendar_events",
  parameters: {
    date_from: "2026-10-01",
    date_to: "2026-10-01",
  },
  response_variant: null,
});

async function withServer<T>(
  client: SqlQueryClient,
  action: (baseUrl: string) => Promise<T>,
  options: { router?: IntentRouter; now?: () => string } = {},
): Promise<T> {
  const server = createApiServer({
    sql: client,
    router: options.router ?? fallbackRouter,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address() as AddressInfo;
    return await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
    });
  }
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedCode: string,
): Promise<ErrorBody> {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  const body = (await response.json()) as ErrorBody;
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.deepEqual(Object.keys(body.error).sort(), [
    "code",
    "message",
    "request_id",
  ]);
  assert.equal(body.error.code, expectedCode);
  assert.match(body.error.request_id, UUID_PATTERN);
  return body;
}

test("GET /profiles returns profiles over real HTTP", async () => {
  await withServer(
    sql([currentReleaseRow], [
      { profile_key: "student_001", alias: "Estudiante Uno" },
    ]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/profiles`);
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("content-type"),
        "application/json; charset=utf-8",
      );
      assert.deepEqual(await response.json(), {
        release_id: RELEASE_ID,
        profiles: [
          { profile_key: "student_001", alias: "Estudiante Uno" },
        ],
      });
    },
  );
});

test("GET /profiles returns an empty list", async () => {
  await withServer(sql([currentReleaseRow], []), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      release_id: RELEASE_ID,
      profiles: [],
    });
  });
});

test("GET /profiles sends Cache-Control no-store", async () => {
  await withServer(sql([currentReleaseRow], []), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("GET /profiles maps a missing release to 404", async () => {
  await withServer(sql([]), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`);
    await assertErrorResponse(response, 404, "NOT_FOUND");
  });
});

test("GET /profiles maps invalid database rows to 500", async () => {
  await withServer(
    sql([currentReleaseRow], [{ profile_key: 7, alias: "interno" }]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/profiles`);
      const body = await assertErrorResponse(response, 500, "INTERNAL_ERROR");
      assert.equal(body.error.message, "Ocurrió un error interno.");
    },
  );
});

test("POST /conversations creates a conversation", async () => {
  await withServer(
    sql([currentReleaseRow], [createdConversationRow]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ profile_key: "student_001" }),
      });
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), {
        conversation_id: CONVERSATION_ID,
        profile_key: "student_001",
        profile_alias: "Estudiante Uno",
        created_at: CREATED_AT,
      });
    },
  );
});

test("POST /conversations returns the exact Location", async () => {
  await withServer(
    sql([currentReleaseRow], [createdConversationRow]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_key: "student_001" }),
      });
      assert.equal(
        response.headers.get("location"),
        `/api/v1/conversations/${CONVERSATION_ID}`,
      );
    },
  );
});

test("POST /conversations sends Cache-Control no-store", async () => {
  await withServer(
    sql([currentReleaseRow], [createdConversationRow]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_key: "student_001" }),
      });
      assert.equal(response.headers.get("cache-control"), "no-store");
    },
  );
});

test("POST /conversations/{id}/messages returns the exact public fast-path result", async () => {
  const content = "  eventos de hoy  ";
  let clockCalls = 0;
  await withServer(
    sql(
      [conversationContextRow],
      [currentReleaseRow],
      [],
      [persistedTurnRow(content)],
    ),
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/v1/conversations/${CONVERSATION_ID}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      assert.equal(response.status, 201);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(
        response.headers.get("content-type"),
        "application/json; charset=utf-8",
      );
      assert.equal(response.headers.get("location"), null);
      assert.deepEqual(await response.json(), {
        conversation_id: CONVERSATION_ID,
        user_message: {
          message_id: USER_MESSAGE_ID,
          role: "user",
          content,
          created_at: "2026-10-01T14:00:01.000Z",
        },
        assistant_message: {
          message_id: ASSISTANT_MESSAGE_ID,
          role: "assistant",
          content: EMPTY_CALENDAR_ANSWER,
          created_at: "2026-10-01T14:00:01.001Z",
          insufficient_evidence: false,
          citations: [],
        },
      });
      assert.equal(clockCalls, 1);
    },
    {
      router: calendarRouter,
      now: () => {
        clockCalls += 1;
        return NOW;
      },
    },
  );
});

async function postMessage(
  baseUrl: string,
  body: string,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Promise<Response> {
  return fetch(
    `${baseUrl}/api/v1/conversations/${CONVERSATION_ID}/messages`,
    { method: "POST", headers, body },
  );
}

test("POST messages rejects an invalid conversation UUID", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/conversations/not-a-uuid/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hola" }),
      },
    );
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST messages rejects malformed JSON", async () => {
  await withServer(sql(), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, "{"),
      400,
      "INVALID_ARGUMENT",
    );
  });
});

test("POST messages rejects an extra property", async () => {
  await withServer(sql(), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(
        baseUrl,
        JSON.stringify({ content: "hola", extra: true }),
      ),
      400,
      "INVALID_ARGUMENT",
    );
  });
});

test("POST messages rejects whitespace-only content", async () => {
  await withServer(sql(), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, JSON.stringify({ content: " \n\t" })),
      400,
      "INVALID_ARGUMENT",
    );
  });
});

test("POST messages counts Unicode code points for the 4000 limit", async () => {
  await withServer(sql(), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(
        baseUrl,
        JSON.stringify({ content: "😀".repeat(4001) }),
      ),
      400,
      "INVALID_ARGUMENT",
    );
  });
});

test("POST messages rejects query parameters", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/conversations/${CONVERSATION_ID}/messages?x=1`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hola" }),
      },
    );
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST messages rejects Idempotency-Key", async () => {
  await withServer(sql(), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, JSON.stringify({ content: "hola" }), {
        "Content-Type": "application/json",
        "Idempotency-Key": "retry-1",
      }),
      400,
      "INVALID_ARGUMENT",
    );
  });
});

test("POST messages maps conversation_not_found to 404", async () => {
  await withServer(sql([]), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, JSON.stringify({ content: "hola" })),
      404,
      "NOT_FOUND",
    );
  });
});

test("POST messages maps release changes to 409", async () => {
  await withServer(
    sql([
      { ...conversationContextRow, current_release_id: OTHER_RELEASE_ID },
    ]),
    async (baseUrl) => {
      await assertErrorResponse(
        await postMessage(baseUrl, JSON.stringify({ content: "hola" })),
        409,
        "CONFLICT",
      );
    },
  );
});

test("POST messages maps conversation conflicts to 409", async () => {
  await withServer(
    sql(
      [conversationContextRow],
      [currentReleaseRow],
      [],
      [persistedTurnRow("eventos", { status: "conversation_conflict" })],
    ),
    async (baseUrl) => {
      await assertErrorResponse(
        await postMessage(baseUrl, JSON.stringify({ content: "eventos" })),
        409,
        "CONFLICT",
      );
    },
    { router: calendarRouter, now: () => NOW },
  );
});

test("POST messages maps agent fallback unavailability to 503", async () => {
  await withServer(sql([conversationContextRow]), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, JSON.stringify({ content: "consulta abierta" })),
      503,
      "DEPENDENCY_UNAVAILABLE",
    );
  });
});

test("POST messages maps database unavailability to 503", async () => {
  await withServer(sql(new DatabaseDependencyError()), async (baseUrl) => {
    await assertErrorResponse(
      await postMessage(baseUrl, JSON.stringify({ content: "hola" })),
      503,
      "DEPENDENCY_UNAVAILABLE",
    );
  });
});

test("POST messages maps invalid database results to 500", async () => {
  await withServer(
    sql([{ ...conversationContextRow, profile_key: 7 }]),
    async (baseUrl) => {
      const body = await assertErrorResponse(
        await postMessage(baseUrl, JSON.stringify({ content: "hola" })),
        500,
        "INTERNAL_ERROR",
      );
      assert.equal(body.error.message, "Ocurrió un error interno.");
    },
  );
});

test("POST /conversations rejects invalid JSON", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST /conversations rejects an extra property", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_key: "student_001", extra: true }),
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST /conversations rejects a missing profile_key", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST /conversations rejects an incompatible Content-Type", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ profile_key: "student_001" }),
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST /conversations rejects bodies over 16 KiB as 400", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_key: "x".repeat(16 * 1024) }),
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("POST /conversations maps an absent profile to 404", async () => {
  await withServer(
    sql([currentReleaseRow], [], [{ current_release_id: RELEASE_ID }]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_key: "missing_profile" }),
      });
      await assertErrorResponse(response, 404, "NOT_FOUND");
    },
  );
});

test("POST /conversations maps a release change to 409", async () => {
  await withServer(
    sql([currentReleaseRow], [], [{ current_release_id: OTHER_RELEASE_ID }]),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_key: "student_001" }),
      });
      await assertErrorResponse(response, 409, "CONFLICT");
    },
  );
});

test("DatabaseDependencyError maps to 503", async () => {
  await withServer(sql(new DatabaseDependencyError()), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`);
    await assertErrorResponse(response, 503, "DEPENDENCY_UNAVAILABLE");
  });
});

test("an unknown error maps to 500 without exposing its message", async () => {
  const internalMessage = "password=secret SQL SELECT private_rows";
  await withServer(sql(new Error(internalMessage)), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`);
    const rawBody = await response.text();
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(rawBody, /password|secret|SELECT|private_rows/u);
    const body = JSON.parse(rawBody) as ErrorBody;
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.match(body.error.request_id, UUID_PATTERN);
  });
});

test("separate error responses receive separate UUID request IDs", async () => {
  await withServer(sql(), async (baseUrl) => {
    const first = await fetch(`${baseUrl}/unknown`);
    const second = await fetch(`${baseUrl}/unknown`);
    const firstBody = await assertErrorResponse(first, 404, "NOT_FOUND");
    const secondBody = await assertErrorResponse(second, 404, "NOT_FOUND");
    assert.notEqual(firstBody.error.request_id, secondBody.error.request_id);
  });
});

test("an unknown route returns 404", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/messages`);
    await assertErrorResponse(response, 404, "NOT_FOUND");
  });
});

test("an unsupported method returns 404", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles`, {
      method: "POST",
    });
    await assertErrorResponse(response, 404, "NOT_FOUND");
  });
});

test("an unexpected profiles query parameter returns 400", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/profiles?x=1`);
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});

test("an unexpected conversations query parameter returns 400", async () => {
  await withServer(sql(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/conversations?x=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_key: "student_001" }),
    });
    await assertErrorResponse(response, 400, "INVALID_ARGUMENT");
  });
});
