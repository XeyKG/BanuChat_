import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createApiServer,
  DatabaseDependencyError,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";
const EMBEDDING_CONFIG_ID = "44444444-4444-4444-8444-444444444444";
const CREATED_AT = "2026-09-30T15:00:00.000Z";
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

function sql(...outcomes: QueryOutcome[]): SqlQueryClient {
  return new ScriptedSqlClient(outcomes);
}

async function withServer<T>(
  client: SqlQueryClient,
  action: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createApiServer({ sql: client });
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
