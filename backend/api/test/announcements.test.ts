import assert from "node:assert/strict";
import test from "node:test";

import {
  AnnouncementsError,
  getAnnouncements,
  type AnnouncementsInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const EMBEDDING_CONFIG_ID = "22222222-2222-4222-8222-222222222222";
const REFERENCE_TIME = "2026-09-30T12:00:00-05:00";
const SHA256 = "a".repeat(64);

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

class FakeSqlQueryClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];

  constructor(
    private readonly announcementRows: unknown[] = [],
    private readonly announcementError?: Error,
  ) {}

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    if (this.calls.length === 1) {
      return {
        rows: [
          {
            release_id: RELEASE_ID,
            embedding_config_id: EMBEDDING_CONFIG_ID,
          } as T,
        ],
      };
    }
    if (this.announcementError !== undefined) {
      throw this.announcementError;
    }
    return { rows: this.announcementRows as T[] };
  }
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    announcement_key: "announcement-1",
    title: "Convocatoria sintética",
    description: "Descripción sintética",
    valid_from: "2026-09-30T10:00:00-05:00",
    valid_until: "2026-09-30T14:00:00-05:00",
    source_path: "announcements/announcement-1.json",
    source_locator: "$.announcements[0]",
    source_sha256: SHA256,
    ...overrides,
  };
}

async function rejection(
  input: AnnouncementsInput,
  expectedReason: "invalid_argument" | "invalid_database_result",
  rows: unknown[] = [],
): Promise<FakeSqlQueryClient> {
  const client = new FakeSqlQueryClient(rows);
  await assert.rejects(
    getAnnouncements(client, input),
    (error: unknown) => {
      assert.ok(error instanceof AnnouncementsError);
      assert.equal(error.reason, expectedReason);
      assert.deepEqual(error.toJSON(), {
        error_code: "ANNOUNCEMENTS_REJECTED",
        reason: expectedReason,
      });
      return true;
    },
  );
  return client;
}

test("returns valid announcements with an explicit reference_time", async () => {
  const client = new FakeSqlQueryClient([row()]);
  const result = await getAnnouncements(client, {
    reference_time: REFERENCE_TIME,
  });

  assert.equal(result.release_id, RELEASE_ID);
  assert.equal(result.reference_time, REFERENCE_TIME);
  assert.deepEqual(result.announcements, [
    {
      announcement_key: "announcement-1",
      title: "Convocatoria sintética",
      description: "Descripción sintética",
      valid_from: "2026-09-30T10:00:00-05:00",
      valid_until: "2026-09-30T14:00:00-05:00",
      temporal_status: "active",
      source: {
        source_kind: "announcement",
        source_path: "announcements/announcement-1.json",
        source_locator: "$.announcements[0]",
        source_sha256: SHA256,
      },
    },
  ]);
});

test("an empty list preserves release_id and reference_time", async () => {
  const result = await getAnnouncements(new FakeSqlQueryClient(), {
    reference_time: REFERENCE_TIME,
  });
  assert.deepEqual(result, {
    release_id: RELEASE_ID,
    reference_time: REFERENCE_TIME,
    announcements: [],
  });
});

test("defaults temporal_status to active", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, { reference_time: REFERENCE_TIME });
  const sql = client.calls[1]?.text ?? "";
  assert.match(sql, /\$2::timestamptz >= a\.valid_from/);
  assert.match(sql, /\$2::timestamptz <= a\.valid_until/);
});

test("defaults limit to 20", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, { reference_time: REFERENCE_TIME });
  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID, REFERENCE_TIME, 20]);
  assert.match(client.calls[1]?.text ?? "", /LIMIT \$3/);
});

test("uses a custom limit", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, {
    reference_time: REFERENCE_TIME,
    limit: 7,
  });
  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID, REFERENCE_TIME, 7]);
});

test("parameterizes a valid query over title and description", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, {
    query: "Convocatoria",
    reference_time: REFERENCE_TIME,
  });
  const call = client.calls[1];
  assert.deepEqual(call?.values, [RELEASE_ID, REFERENCE_TIME, "Convocatoria", 20]);
  assert.match(call?.text ?? "", /strpos\(lower\(a\.title\), lower\(\$3\)\) > 0/);
  assert.match(
    call?.text ?? "",
    /strpos\(lower\(a\.description\), lower\(\$3\)\) > 0/,
  );
});

test("treats percent and underscore as literal query characters", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, {
    query: "%_",
    reference_time: REFERENCE_TIME,
  });
  const call = client.calls[1];
  assert.equal(call?.values?.[2], "%_");
  assert.equal(call?.text.includes("%_"), false);
  assert.doesNotMatch(call?.text ?? "", /\bI?LIKE\b/i);
  assert.match(call?.text ?? "", /strpos/i);
});

test("rejects queries shorter than 2 characters", async () => {
  const client = await rejection({ query: "a" }, "invalid_argument");
  assert.equal(client.calls.length, 0);
});

test("rejects queries longer than 500 characters", async () => {
  const client = await rejection({ query: "a".repeat(501) }, "invalid_argument");
  assert.equal(client.calls.length, 0);
});

test("rejects whitespace-only queries without trimming them", async () => {
  await rejection({ query: "  " }, "invalid_argument");
});

test("rejects an invalid temporal_status", async () => {
  await rejection(
    { temporal_status: "present" as "active" },
    "invalid_argument",
  );
});

test("rejects invalid limits", async () => {
  for (const limit of [0, 51, 1.5]) {
    await rejection({ limit }, "invalid_argument");
  }
});

test("rejects an invalid reference_time", async () => {
  await rejection({ reference_time: "2026-02-30T12:00:00Z" }, "invalid_argument");
});

test("derives upcoming", async () => {
  const result = await getAnnouncements(
    new FakeSqlQueryClient([
      row({ valid_from: "2026-10-01T00:00:00Z", valid_until: null }),
    ]),
    { reference_time: "2026-09-30T23:59:59Z", temporal_status: "all" },
  );
  assert.equal(result.announcements[0]?.temporal_status, "upcoming");
});

test("derives active before valid_until", async () => {
  const result = await getAnnouncements(new FakeSqlQueryClient([row()]), {
    reference_time: REFERENCE_TIME,
  });
  assert.equal(result.announcements[0]?.temporal_status, "active");
});

test("derives active exactly at valid_from", async () => {
  const result = await getAnnouncements(
    new FakeSqlQueryClient([
      row({
        valid_from: "2026-09-30T17:00:00Z",
        valid_until: null,
      }),
    ]),
    { reference_time: REFERENCE_TIME },
  );
  assert.equal(result.announcements[0]?.temporal_status, "active");
});

test("derives active exactly at valid_until", async () => {
  const result = await getAnnouncements(
    new FakeSqlQueryClient([
      row({ valid_until: "2026-09-30T17:00:00Z" }),
    ]),
    { reference_time: REFERENCE_TIME },
  );
  assert.equal(result.announcements[0]?.temporal_status, "active");
});

test("derives expired after valid_until", async () => {
  const result = await getAnnouncements(
    new FakeSqlQueryClient([
      row({ valid_until: "2026-09-30T16:59:59Z" }),
    ]),
    { reference_time: REFERENCE_TIME, temporal_status: "all" },
  );
  assert.equal(result.announcements[0]?.temporal_status, "expired");
});

test("all applies no temporal SQL filter and still derives each row status", async () => {
  const client = new FakeSqlQueryClient([
    row({
      announcement_key: "upcoming",
      valid_from: "2026-10-01T00:00:00Z",
      valid_until: null,
    }),
    row({ announcement_key: "active", valid_until: null }),
    row({ announcement_key: "expired", valid_until: "2026-09-30T16:00:00Z" }),
  ]);
  const result = await getAnnouncements(client, {
    reference_time: REFERENCE_TIME,
    temporal_status: "all",
  });
  const sql = client.calls[1]?.text ?? "";
  assert.doesNotMatch(sql, /valid_until IS NULL|valid_until IS NOT NULL/);
  assert.doesNotMatch(sql, /\$2::timestamptz [<>]=?/);
  assert.match(sql, /LIMIT \$2/);
  assert.doesNotMatch(sql, /\$3/);
  assert.deepEqual(client.calls[1]?.values, [RELEASE_ID, 20]);
  assert.equal(result.reference_time, REFERENCE_TIME);
  assert.deepEqual(
    result.announcements.map((announcement) => announcement.temporal_status),
    ["upcoming", "active", "expired"],
  );
});

test("temporal filters bind reference_time before limit", async () => {
  const cases: {
    temporalStatus: "active" | "upcoming" | "expired";
    filterPattern: RegExp;
  }[] = [
    {
      temporalStatus: "active",
      filterPattern: /\$2::timestamptz >= a\.valid_from/,
    },
    {
      temporalStatus: "upcoming",
      filterPattern: /\$2::timestamptz < a\.valid_from/,
    },
    {
      temporalStatus: "expired",
      filterPattern: /\$2::timestamptz > a\.valid_until/,
    },
  ];

  for (const { temporalStatus, filterPattern } of cases) {
    const client = new FakeSqlQueryClient();
    await getAnnouncements(client, {
      reference_time: REFERENCE_TIME,
      temporal_status: temporalStatus,
      limit: 7,
    });
    const call = client.calls[1];
    assert.deepEqual(call?.values, [RELEASE_ID, REFERENCE_TIME, 7]);
    assert.match(call?.text ?? "", filterPattern);
    assert.match(call?.text ?? "", /LIMIT \$3/);
  }
});

test("rejects valid_until before valid_from", async () => {
  await rejection(
    { reference_time: REFERENCE_TIME },
    "invalid_database_result",
    [row({ valid_until: "2026-09-30T09:59:59-05:00" })],
  );
});

test("rejects an invalid row", async () => {
  await rejection(
    { reference_time: REFERENCE_TIME },
    "invalid_database_result",
    [row({ title: " " })],
  );
});

test("rejects invalid provenance", async () => {
  await rejection(
    { reference_time: REFERENCE_TIME },
    "invalid_database_result",
    [row({ source_sha256: "ABC" })],
  );
});

test("normalizes valid Date timestamps", async () => {
  const result = await getAnnouncements(
    new FakeSqlQueryClient([
      row({
        valid_from: new Date("2026-09-30T15:00:00Z"),
        valid_until: new Date("2026-09-30T19:00:00Z"),
      }),
    ]),
    { reference_time: REFERENCE_TIME },
  );
  assert.equal(result.announcements[0]?.valid_from, "2026-09-30T15:00:00.000Z");
  assert.equal(result.announcements[0]?.valid_until, "2026-09-30T19:00:00.000Z");
});

test("orders by valid_from then announcement_key", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, { reference_time: REFERENCE_TIME });
  assert.match(
    client.calls[1]?.text ?? "",
    /ORDER BY a\.valid_from ASC, a\.announcement_key ASC/,
  );
});

test("queries exactly the release_id resolved by C2", async () => {
  const client = new FakeSqlQueryClient();
  await getAnnouncements(client, { reference_time: REFERENCE_TIME });
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[1]?.values?.[0], RELEASE_ID);
});

test("propagates SQL errors unchanged", async () => {
  const dependencyError = new Error("database unavailable");
  const client = new FakeSqlQueryClient([], dependencyError);
  await assert.rejects(
    getAnnouncements(client, { reference_time: REFERENCE_TIME }),
    (error: unknown) => error === dependencyError,
  );
});

test("captures one omitted reference_time for both SQL and output", async () => {
  const client = new FakeSqlQueryClient();
  const result = await getAnnouncements(client, {});
  assert.ok(Number.isFinite(Date.parse(result.reference_time)));
  assert.equal(client.calls[1]?.values?.[1], result.reference_time);
});
