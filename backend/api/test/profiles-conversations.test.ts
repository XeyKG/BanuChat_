import assert from "node:assert/strict";
import test from "node:test";

import {
  createConversation,
  CreateConversationError,
  CurrentReleaseError,
  listProfiles,
  ProfilesError,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const EMBEDDING_CONFIG_ID = "33333333-3333-4333-8333-333333333333";
const CONVERSATION_ID = "44444444-4444-4444-8444-444444444444";

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

type FakeResponse = { rows: unknown[] } | Error;

class FakeSqlClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];
  private readonly responses: FakeResponse[];

  constructor(...responses: FakeResponse[]) {
    this.responses = [...responses];
  }

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    const response = this.responses.shift();
    assert.notEqual(response, undefined, "unexpected SQL query");
    if (response instanceof Error) {
      throw response;
    }
    return response as { rows: T[] };
  }
}

function currentReleaseRows(releaseId = RELEASE_ID): { rows: unknown[] } {
  return {
    rows: [
      {
        release_id: releaseId,
        embedding_config_id: EMBEDDING_CONFIG_ID,
      },
    ],
  };
}

function createdConversationRows(
  overrides: Record<string, unknown> = {},
): { rows: unknown[] } {
  return {
    rows: [
      {
        conversation_id: CONVERSATION_ID,
        profile_key: "student_1",
        profile_alias: "Estudiante Uno",
        started_at: "2026-09-30T15:16:17.123Z",
        ...overrides,
      },
    ],
  };
}

test("listProfiles returns SQL-ordered profiles and the release fixed by C2", async () => {
  const client = new FakeSqlClient(currentReleaseRows(), {
    rows: [
      { profile_key: "alpha", alias: "Alpha", ignored: "internal" },
      { profile_key: "beta", alias: "Beta" },
    ],
  });

  assert.deepEqual(await listProfiles(client), {
    release_id: RELEASE_ID,
    profiles: [
      { profile_key: "alpha", alias: "Alpha" },
      { profile_key: "beta", alias: "Beta" },
    ],
  });
  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID]);
  assert.match(client.calls[1]?.text ?? "", /dataset_release_id\s*=\s*\$1/);
  assert.match(client.calls[1]?.text ?? "", /ORDER BY profile_key ASC/);
});

test("listProfiles preserves release_id for an empty profile list", async () => {
  const client = new FakeSqlClient(currentReleaseRows(), { rows: [] });

  assert.deepEqual(await listProfiles(client), {
    release_id: RELEASE_ID,
    profiles: [],
  });
});

test("listProfiles rejects an invalid database profile_key", async () => {
  const client = new FakeSqlClient(currentReleaseRows(), {
    rows: [{ profile_key: "Invalid Key", alias: "Alias" }],
  });

  await assert.rejects(
    listProfiles(client),
    (error: unknown) =>
      error instanceof ProfilesError &&
      error.reason === "invalid_database_result",
  );
});

test("listProfiles rejects a blank database alias", async () => {
  const client = new FakeSqlClient(currentReleaseRows(), {
    rows: [{ profile_key: "student_1", alias: "   " }],
  });

  await assert.rejects(
    listProfiles(client),
    (error: unknown) =>
      error instanceof ProfilesError &&
      error.reason === "invalid_database_result",
  );
});

test("listProfiles propagates SQL errors", async () => {
  const sqlError = new Error("database unavailable");
  const client = new FakeSqlClient(currentReleaseRows(), sqlError);

  await assert.rejects(listProfiles(client), (error) => error === sqlError);
});

test("listProfiles propagates CurrentReleaseError", async () => {
  const client = new FakeSqlClient({ rows: [] });

  await assert.rejects(
    listProfiles(client),
    (error: unknown) =>
      error instanceof CurrentReleaseError &&
      error.reason === "no_current_release",
  );
});

test("createConversation returns a valid application object", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows({ started_at: new Date("2026-09-30T15:16:17.123Z") }),
  );

  assert.deepEqual(
    await createConversation(client, { profile_key: "student_1" }),
    {
      conversation_id: CONVERSATION_ID,
      profile_key: "student_1",
      profile_alias: "Estudiante Uno",
      created_at: "2026-09-30T15:16:17.123Z",
    },
  );
});

test("createConversation rejects invalid profile_key before SQL", async () => {
  const client = new FakeSqlClient();

  await assert.rejects(
    createConversation(client, { profile_key: " Student_1 " }),
    (error: unknown) =>
      error instanceof CreateConversationError &&
      error.reason === "invalid_argument",
  );
  assert.equal(client.calls.length, 0);
});

test("createConversation parameterizes the fixed release and profile key", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows(),
  );

  await createConversation(client, { profile_key: "student_1" });

  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID, "student_1"]);
  assert.doesNotMatch(client.calls[1]?.text ?? "", /11111111|student_1/);
});

test("createConversation INSERT checks the current dataset release", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows(),
  );

  await createConversation(client, { profile_key: "student_1" });

  const sql = client.calls[1]?.text ?? "";
  assert.match(sql, /JOIN banuchat\.datasets d/);
  assert.match(sql, /d\.id\s*=\s*1/);
  assert.match(sql, /d\.current_release_id\s*=\s*sp\.dataset_release_id/);
  assert.match(sql, /sp\.dataset_release_id\s*=\s*\$1/);
  assert.match(sql, /sp\.profile_key\s*=\s*\$2/);
});

test("createConversation returns the alias selected from the opening release", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows({ profile_alias: "Alias histórico" }),
  );

  const result = await createConversation(client, { profile_key: "student_1" });

  assert.equal(result.profile_alias, "Alias histórico");
  const sql = client.calls[1]?.text ?? "";
  assert.match(sql, /selected_profile\.alias AS profile_alias/);
  assert.equal(client.calls.length, 2);
});

test("createConversation rejects an invalid conversation UUID", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows({ conversation_id: "not-a-uuid" }),
  );

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error: unknown) =>
      error instanceof CreateConversationError &&
      error.reason === "invalid_database_result",
  );
});

test("createConversation rejects an invalid timestamp", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    createdConversationRows({ started_at: "yesterday" }),
  );

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error: unknown) =>
      error instanceof CreateConversationError &&
      error.reason === "invalid_database_result",
  );
});

test("createConversation reports profile_not_found when release is unchanged", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    { rows: [] },
    { rows: [{ current_release_id: RELEASE_ID }] },
  );

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error: unknown) =>
      error instanceof CreateConversationError &&
      error.reason === "profile_not_found",
  );
});

test("createConversation reports current_release_changed after a zero-row INSERT", async () => {
  const client = new FakeSqlClient(
    currentReleaseRows(),
    { rows: [] },
    { rows: [{ current_release_id: OTHER_RELEASE_ID }] },
  );

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error: unknown) =>
      error instanceof CreateConversationError &&
      error.reason === "current_release_changed",
  );
});

test("createConversation propagates INSERT errors", async () => {
  const insertError = new Error("insert failed");
  const client = new FakeSqlClient(currentReleaseRows(), insertError);

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error) => error === insertError,
  );
});

test("createConversation propagates diagnostic SQL errors", async () => {
  const diagnosticError = new Error("diagnostic failed");
  const client = new FakeSqlClient(
    currentReleaseRows(),
    { rows: [] },
    diagnosticError,
  );

  await assert.rejects(
    createConversation(client, { profile_key: "student_1" }),
    (error) => error === diagnosticError,
  );
});

test("application errors serialize without request or database details", () => {
  assert.deepEqual(
    new ProfilesError("invalid_database_result").toJSON(),
    {
      name: "ProfilesError",
      reason: "invalid_database_result",
    },
  );
  assert.deepEqual(
    new CreateConversationError("profile_not_found").toJSON(),
    {
      name: "CreateConversationError",
      reason: "profile_not_found",
    },
  );
});
