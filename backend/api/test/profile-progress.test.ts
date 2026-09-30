import assert from "node:assert/strict";
import test from "node:test";

import {
  getProfileProgress,
  ProfileProgressError,
  type ProfileProgressInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const EMBEDDING_CONFIG_ID = "22222222-2222-4222-8222-222222222222";
const SHA256 = "a".repeat(64);

const currentReleaseRow = {
  release_id: RELEASE_ID,
  embedding_config_id: EMBEDDING_CONFIG_ID,
};
const profileRow = {
  profile_key: "profile_1",
  alias: "Perfil Uno",
  source_path: "profiles/profile_1.json",
  source_locator: "$.profile",
  source_sha256: SHA256,
};
const enrolledRow = {
  course_key: "course_a",
  course_name: "Curso A",
  status: "enrolled",
  progress_percent: 0,
  started_at: null,
  completed_at: null,
  source_path: "profiles/profile_1.json",
  source_locator: "$.courses[0]",
  source_sha256: SHA256,
};
const completedRow = {
  course_key: "course_b",
  course_name: "Curso B",
  status: "completed",
  progress_percent: "100.00",
  started_at: new Date("2026-01-01T10:00:00.000Z"),
  completed_at: "2026-01-02T05:00:00-05:00",
  source_path: "profiles/profile_1.json",
  source_locator: "$.courses[1]",
  source_sha256: SHA256,
};

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

class FakeClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];
  private readonly responses: readonly unknown[][];
  private callIndex = 0;

  constructor(responses: readonly unknown[][]) {
    this.responses = responses;
  }

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    const rows = this.responses[this.callIndex] ?? [];
    this.callIndex += 1;
    return { rows: rows as T[] };
  }
}

async function captureError(
  input: ProfileProgressInput,
  responses: readonly unknown[][] = [],
): Promise<ProfileProgressError> {
  try {
    await getProfileProgress(new FakeClient(responses), input);
    assert.fail("Expected getProfileProgress to reject");
  } catch (error) {
    assert.ok(error instanceof ProfileProgressError);
    return error;
  }
}

test("returns a validated profile and courses with normalized values and provenance", async () => {
  const client = new FakeClient([
    [currentReleaseRow],
    [profileRow],
    [enrolledRow, completedRow],
  ]);

  const result = await getProfileProgress(client, { profile_key: "profile_1" });

  assert.equal(result.release_id, RELEASE_ID);
  assert.equal(result.profile.source.source_kind, "profile");
  assert.equal(result.courses[0]?.source.source_kind, "profile_course");
  assert.equal(result.courses[1]?.progress_percent, 100);
  assert.equal(result.courses[1]?.started_at, "2026-01-01T10:00:00.000Z");
  assert.equal(result.courses[1]?.completed_at, "2026-01-02T05:00:00-05:00");
  assert.match(client.calls[2]?.text ?? "", /ORDER BY pc\.course_key ASC/);
  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID, "profile_1"]);
  assert.deepEqual(client.calls[2]?.values, [RELEASE_ID, "profile_1", 20]);
});

test("returns an empty course list for an existing profile", async () => {
  const result = await getProfileProgress(
    new FakeClient([[currentReleaseRow], [profileRow], []]),
    { profile_key: "profile_1" },
  );
  assert.deepEqual(result.courses, []);
});

test("rejects a missing profile without querying progress", async () => {
  const client = new FakeClient([[currentReleaseRow], []]);
  const error = await captureError({ profile_key: "profile_1" }, [
    [currentReleaseRow],
    [],
  ]);
  assert.equal(error.reason, "profile_not_found");
  await assert.rejects(
    getProfileProgress(client, { profile_key: "profile_1" }),
    (caught: unknown) =>
      caught instanceof ProfileProgressError &&
      caught.reason === "profile_not_found" &&
      JSON.stringify(caught) ===
        '{"error_code":"PROFILE_PROGRESS_REJECTED","reason":"profile_not_found"}',
  );
  assert.equal(client.calls.length, 2);
});

test("parameterizes status filters and a custom limit", async () => {
  const client = new FakeClient([[currentReleaseRow], [profileRow], []]);
  await getProfileProgress(client, {
    profile_key: "profile_1",
    statuses: ["completed", "in_progress"],
    limit: 7,
  });
  assert.match(client.calls[2]?.text ?? "", /pc\.status = ANY\(\$3::text\[\]\)/);
  assert.match(client.calls[2]?.text ?? "", /LIMIT \$4/);
  assert.deepEqual(client.calls[2]?.values, [
    RELEASE_ID,
    "profile_1",
    ["completed", "in_progress"],
    7,
  ]);
});

test("rejects invalid arguments before resolving the release", async () => {
  const invalidInputs = [
    { profile_key: "Invalid Key" },
    { profile_key: "profile_1", statuses: ["unknown"] },
    { profile_key: "profile_1", statuses: ["completed", "completed"] },
    { profile_key: "profile_1", limit: 0 },
    { profile_key: "profile_1", limit: 51 },
    { profile_key: "profile_1", limit: 1.5 },
  ] as unknown as ProfileProgressInput[];

  for (const input of invalidInputs) {
    const error = await captureError(input);
    assert.equal(error.reason, "invalid_argument");
  }
});

test("rejects invalid profile rows", async () => {
  const invalidProfiles = [
    null,
    { ...profileRow, alias: " " },
    { ...profileRow, source_sha256: "A".repeat(64) },
    { ...profileRow, profile_key: "other_profile" },
  ];
  for (const row of invalidProfiles) {
    const error = await captureError({ profile_key: "profile_1" }, [
      [currentReleaseRow],
      [row],
    ]);
    assert.equal(error.reason, "invalid_database_result");
  }

  const duplicateError = await captureError({ profile_key: "profile_1" }, [
    [currentReleaseRow],
    [profileRow, profileRow],
  ]);
  assert.equal(duplicateError.reason, "invalid_database_result");
});

test("rejects invalid course rows and each progress invariant", async () => {
  const invalidRows = [
    null,
    { ...enrolledRow, course_name: "" },
    { ...enrolledRow, progress_percent: "not-a-number" },
    { ...enrolledRow, source_locator: "" },
    { ...enrolledRow, progress_percent: 1 },
    { ...enrolledRow, completed_at: "2026-01-01T00:00:00Z" },
    { ...enrolledRow, status: "in_progress", progress_percent: 0 },
    { ...enrolledRow, status: "in_progress", progress_percent: 100 },
    { ...enrolledRow, status: "completed", progress_percent: 100 },
    {
      ...enrolledRow,
      status: "completed",
      progress_percent: 99,
      completed_at: "2026-01-02T00:00:00Z",
    },
  ];

  for (const row of invalidRows) {
    const error = await captureError({ profile_key: "profile_1" }, [
      [currentReleaseRow],
      [profileRow],
      [row],
    ]);
    assert.equal(error.reason, "invalid_database_result");
  }
});

test("rejects invalid and inverted timestamps", async () => {
  const invalidRows = [
    { ...enrolledRow, started_at: "2026-02-30T00:00:00Z" },
    {
      ...completedRow,
      started_at: "2026-01-03T00:00:00Z",
      completed_at: "2026-01-02T00:00:00Z",
    },
    { ...enrolledRow, started_at: new Date(Number.NaN) },
  ];
  for (const row of invalidRows) {
    const error = await captureError({ profile_key: "profile_1" }, [
      [currentReleaseRow],
      [profileRow],
      [row],
    ]);
    assert.equal(error.reason, "invalid_database_result");
  }
});

test("propagates SQL client errors unchanged", async () => {
  const sqlError = new Error("database unavailable");
  const client: SqlQueryClient = {
    async query(): Promise<{ rows: never[] }> {
      throw sqlError;
    },
  };
  await assert.rejects(
    getProfileProgress(client, { profile_key: "profile_1" }),
    (caught: unknown) => caught === sqlError,
  );
});
