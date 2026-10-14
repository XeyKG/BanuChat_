import assert from "node:assert/strict";
import test from "node:test";

import {
  CourseCatalogError,
  CurrentReleaseError,
  getCourseCatalog,
  type CourseCatalogInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const RELEASE_ROW = {
  release_id: RELEASE_ID,
  embedding_config_id: "22222222-2222-4222-8222-222222222222",
};
const ROW = {
  course_key: "course_a",
  name: "Curso A",
  description: "Descripción sintética",
  status: "available",
  source_path: "courses/catalog.json",
  source_locator: "course:course_a",
  source_sha256: "a".repeat(64),
};

class FakeSqlQueryClient implements SqlQueryClient {
  readonly calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  constructor(private readonly responses: readonly (readonly unknown[])[]) {}

  async query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }> {
    const rows = this.responses[this.calls.length];
    assert.ok(rows, "unexpected SQL query");
    this.calls.push({ text, values });
    return { rows: [...rows] as T[] };
  }
}

test("catalog uses the ready current release and unfiltered SQL with default limit", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], [ROW]]);
  const result = await getCourseCatalog(sql, {});
  assert.deepEqual(result, {
    release_id: RELEASE_ID,
    courses: [{
      course_key: ROW.course_key,
      name: ROW.name,
      description: ROW.description,
      status: ROW.status,
      source: {
        source_kind: "course",
        source_path: ROW.source_path,
        source_locator: ROW.source_locator,
        source_sha256: ROW.source_sha256,
      },
    }],
  });
  assert.match(sql.calls[0]!.text, /d\.current_release_id/u);
  assert.match(sql.calls[0]!.text, /dr\.status = 'ready'/u);
  assert.deepEqual(sql.calls[0]!.values, [1]);
  const call = sql.calls[1]!;
  assert.match(call.text, /FROM banuchat\.courses\s+WHERE dataset_release_id = \$1\s+ORDER BY course_key ASC\s+LIMIT \$2/u);
  assert.doesNotMatch(call.text, /ANY|JOIN|profile_courses/u);
  assert.deepEqual(call.values, [RELEASE_ID, 20]);
});

for (const status of ["available", "closed", "archived"] as const) {
  test(`catalog parameterizes ${status} without using profile courses`, async () => {
    const sql = new FakeSqlQueryClient([[RELEASE_ROW], [{ ...ROW, status }]]);
    const result = await getCourseCatalog(sql, { statuses: [status], limit: 7 });
    assert.equal(result.courses[0]?.status, status);
    assert.match(sql.calls[1]!.text, /WHERE dataset_release_id = \$1\s+AND status = ANY\(\$2::text\[\]\)\s+ORDER BY course_key ASC\s+LIMIT \$3/u);
    assert.doesNotMatch(sql.calls[1]!.text, /profile_courses/u);
    assert.deepEqual(sql.calls[1]!.values, [RELEASE_ID, [status], 7]);
  });
}

test("catalog accepts multiple statuses and the maximum limit", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], [ROW, { ...ROW, course_key: "course_b", status: "closed" }]]);
  const result = await getCourseCatalog(sql, { statuses: ["available", "closed"], limit: 50 });
  assert.equal(result.courses.length, 2);
  assert.deepEqual(sql.calls[1]!.values, [RELEASE_ID, ["available", "closed"], 50]);
});

test("catalog accepts all three statuses and returns an empty result", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], []]);
  assert.deepEqual(await getCourseCatalog(sql, { statuses: ["available", "closed", "archived"] }), {
    release_id: RELEASE_ID, courses: [],
  });
  assert.deepEqual(sql.calls[1]!.values, [RELEASE_ID, ["available", "closed", "archived"], 20]);
});

test("an explicit empty status array stays an empty SQL filter", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], []]);
  const result = await getCourseCatalog(sql, { statuses: [] });
  assert.deepEqual(result.courses, []);
  assert.match(sql.calls[1]!.text, /status = ANY\(\$2::text\[\]\)/u);
  assert.deepEqual(sql.calls[1]!.values, [RELEASE_ID, [], 20]);
});

test("unfiltered explicit limit uses the correct placeholder", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], []]);
  await getCourseCatalog(sql, { limit: 1 });
  assert.match(sql.calls[1]!.text, /LIMIT \$2/u);
  assert.deepEqual(sql.calls[1]!.values, [RELEASE_ID, 1]);
});

test("catalog rejects invalid arguments before any SQL", async () => {
  const invalid: unknown[] = [
    null, undefined, "catalog", { statuses: null }, { statuses: "available" },
    { statuses: ["unknown"] }, { statuses: ["completed"] },
    { statuses: ["available", "available"] },
    { statuses: ["available", "closed", "archived", "available"] },
    ...[null, "20", 0, 51, 1.5, NaN, Infinity].map((limit) => ({ limit })),
  ];
  for (const input of invalid) {
    const sql = new FakeSqlQueryClient([]);
    await assert.rejects(getCourseCatalog(sql, input as CourseCatalogInput),
      (error: unknown) => error instanceof CourseCatalogError && error.reason === "invalid_argument");
    assert.equal(sql.calls.length, 0);
  }
});

test("catalog rejects malformed rows and provenance", async () => {
  const invalid: unknown[] = [null, {},
    ...["", "Bad Key", "a".repeat(129)].map((course_key) => ({ ...ROW, course_key })),
    ...["name", "description", "source_path", "source_locator"].flatMap((key) =>
      [null, "", " \t"].map((value) => ({ ...ROW, [key]: value }))),
    { ...ROW, status: "completed" },
    ...[null, "short", "A".repeat(64), "g".repeat(64)].map((source_sha256) => ({ ...ROW, source_sha256 })),
  ];
  for (const row of invalid) {
    await assert.rejects(getCourseCatalog(new FakeSqlQueryClient([[RELEASE_ROW], [row]]), {}),
      (error: unknown) => error instanceof CourseCatalogError && error.reason === "invalid_database_result");
  }
});

test("catalog does not query courses without a current release", async () => {
  const sql = new FakeSqlQueryClient([[]]);
  await assert.rejects(getCourseCatalog(sql, {}),
    (error: unknown) => error instanceof CurrentReleaseError && error.reason === "no_current_release");
  assert.equal(sql.calls.length, 1);
});

test("catalog propagates SQL errors and exposes only typed error metadata", async () => {
  const expected = new Error("database unavailable");
  const sql: SqlQueryClient = { async query() { throw expected; } };
  await assert.rejects(getCourseCatalog(sql, {}), (error: unknown) => error === expected);
  assert.deepEqual(new CourseCatalogError("invalid_database_result").toJSON(), {
    error_code: "COURSE_CATALOG_REJECTED", reason: "invalid_database_result",
  });
});
