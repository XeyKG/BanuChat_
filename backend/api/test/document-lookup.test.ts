import assert from "node:assert/strict";
import test from "node:test";

import {
  CurrentReleaseError,
  DocumentLookupError,
  lookupDocuments,
  type DocumentLookupInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const RELEASE_ROW = {
  release_id: RELEASE_ID,
  embedding_config_id: "33333333-3333-4333-8333-333333333333",
};
const ROW = {
  document_key: "support-guide",
  retrieval_mode: "chunked",
  document_version_id: DOCUMENT_VERSION_ID,
  title: "Soporte y reporte de incidencias",
  mime_type: "text/markdown",
  source_path: "documents/support-guide.md",
  source_locator: "document:support-guide",
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

test("looks up an exact chunked title in the ready current release", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], [ROW]]);
  const result = await lookupDocuments(sql, {
    query: ROW.title,
    retrieval_mode: "chunked",
  });

  assert.deepEqual(result, {
    release_id: RELEASE_ID,
    documents: [{
      document_key: ROW.document_key,
      document_version_id: DOCUMENT_VERSION_ID,
      title: ROW.title,
      retrieval_mode: "chunked",
      mime_type: ROW.mime_type,
      source: {
        source_kind: "document",
        source_path: ROW.source_path,
        source_locator: ROW.source_locator,
        source_sha256: ROW.source_sha256,
      },
    }],
  });
  assert.deepEqual(sql.calls[0]?.values, [1]);
  assert.match(sql.calls[0]?.text ?? "", /d\.current_release_id/u);
  assert.match(sql.calls[1]?.text ?? "", /dv\.dataset_release_id = \$1/u);
  assert.match(sql.calls[1]?.text ?? "", /dv\.processing_status = 'ready'/u);
  assert.match(sql.calls[1]?.text ?? "", /dv\.title = \$2/u);
  assert.match(sql.calls[1]?.text ?? "", /d\.retrieval_mode = \$3/u);
  assert.match(sql.calls[1]?.text ?? "", /LIMIT \$4/u);
  assert.doesNotMatch(sql.calls[1]?.text ?? "", /document_chunks|embedding|similarity/iu);
  assert.deepEqual(sql.calls[1]?.values, [RELEASE_ID, ROW.title, "chunked", 10]);
});

test("looks up full documents and honors an explicit limit", async () => {
  const row = { ...ROW, retrieval_mode: "full_document", document_key: "full-guide" };
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], [row]]);
  const result = await lookupDocuments(sql, {
    query: `  ${ROW.title}  `,
    retrieval_mode: "full_document",
    limit: 7,
  });
  assert.equal(result.documents[0]?.retrieval_mode, "full_document");
  assert.deepEqual(sql.calls[1]?.values, [RELEASE_ID, ROW.title, "full_document", 7]);
});

test("omits the retrieval mode filter and uses contiguous placeholders", async () => {
  const sql = new FakeSqlQueryClient([[RELEASE_ROW], []]);
  const result = await lookupDocuments(sql, { query: ROW.title });
  assert.deepEqual(result, { release_id: RELEASE_ID, documents: [] });
  assert.doesNotMatch(sql.calls[1]?.text ?? "", /d\.retrieval_mode =/u);
  assert.match(sql.calls[1]?.text ?? "", /LIMIT \$3/u);
  assert.doesNotMatch(sql.calls[1]?.text ?? "", /\$4/u);
  assert.deepEqual(sql.calls[1]?.values, [RELEASE_ID, ROW.title, 10]);
});

test("rejects invalid arguments before SQL", async () => {
  const invalid: unknown[] = [
    null,
    {},
    { query: "" },
    { query: " " },
    { query: "a" },
    { query: "a".repeat(501) },
    { query: ROW.title, retrieval_mode: "other" },
    ...[0, 51, 1.5, NaN, "10"].map((limit) => ({ query: ROW.title, limit })),
  ];
  for (const input of invalid) {
    const sql = new FakeSqlQueryClient([]);
    await assert.rejects(
      lookupDocuments(sql, input as DocumentLookupInput),
      (error: unknown) =>
        error instanceof DocumentLookupError && error.reason === "invalid_argument",
    );
    assert.equal(sql.calls.length, 0);
  }
});

test("rejects malformed rows and document provenance", async () => {
  const invalid: unknown[] = [
    null,
    {},
    { ...ROW, document_key: "Bad Key" },
    { ...ROW, document_version_id: "bad" },
    { ...ROW, title: " " },
    { ...ROW, retrieval_mode: "other" },
    { ...ROW, mime_type: "" },
    { ...ROW, source_path: "profiles/source.json" },
    { ...ROW, source_path: "documents/../profiles/source.json" },
    { ...ROW, source_path: "documents/source?.md" },
    { ...ROW, source_locator: "\t" },
    { ...ROW, source_sha256: "A".repeat(64) },
  ];
  for (const row of invalid) {
    await assert.rejects(
      lookupDocuments(new FakeSqlQueryClient([[RELEASE_ROW], [row]]), {
        query: ROW.title,
      }),
      (error: unknown) =>
        error instanceof DocumentLookupError &&
        error.reason === "invalid_database_result",
    );
  }
});

test("does not query documents without a ready current release", async () => {
  const sql = new FakeSqlQueryClient([[]]);
  await assert.rejects(
    lookupDocuments(sql, { query: ROW.title }),
    (error: unknown) =>
      error instanceof CurrentReleaseError && error.reason === "no_current_release",
  );
  assert.equal(sql.calls.length, 1);
});
