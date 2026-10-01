import assert from "node:assert/strict";
import test from "node:test";

import {
  DocumentRetrievalError,
  retrieveDocumentChunks,
  type DocumentRetrievalInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "9c24f15e-17d8-4a30-a676-69fd706f0967";
const OTHER_RELEASE_ID = "c1d3cf95-1415-4f71-82f6-3a709b959928";
const VERSION_ID = "00afe95c-df6b-42fc-b6ae-dd6e5b4470b2";
const DOCUMENT_ID = "52804d3c-aa89-44a2-a5a1-f678b6bbb2e6";
const CHUNK_ID = "ed105066-c605-4f01-a951-f212d96760c9";
const SHA256 = "a".repeat(64);

function embedding(): number[] {
  return [1, ...Array<number>(1023).fill(0)];
}

function input(
  overrides: Partial<DocumentRetrievalInput> = {},
): DocumentRetrievalInput {
  return {
    release_id: RELEASE_ID,
    query_embedding: embedding(),
    top_k: 5,
    ...overrides,
  };
}

function validRow(overrides: Record<string, unknown> = {}): unknown {
  return {
    chunk_id: CHUNK_ID,
    document_version_id: VERSION_ID,
    document_id: DOCUMENT_ID,
    document_key: "student-guide",
    title: "Student guide",
    ordinal: 2,
    content: "Synthetic chunk content.",
    chunk_locator: "section:introduction",
    page_start: 3,
    page_end: 4,
    source_path: "documents/student-guide.md",
    source_locator: "synthetic://documents/student-guide",
    source_sha256: SHA256,
    release_id: RELEASE_ID,
    cosine_distance: 0.25,
    ...overrides,
  };
}

function fakeClient(rows: unknown[] = [validRow()]): SqlQueryClient {
  let call = 0;
  return {
    async query<T>(): Promise<{ rows: T[] }> {
      call += 1;
      return {
        rows: (call === 1 ? [{ available: true }] : rows) as T[],
      };
    },
  };
}

async function assertReason(
  action: () => Promise<unknown>,
  reason:
    | "invalid_argument"
    | "release_not_available"
    | "invalid_database_result",
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof DocumentRetrievalError);
    assert.equal(error.reason, reason);
    assert.deepEqual(error.toJSON(), {
      error_code: "DOCUMENT_RETRIEVAL_REJECTED",
      reason,
    });
    return true;
  });
}

test("rejects an invalid release UUID before querying", async () => {
  let queried = false;
  const client: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      queried = true;
      return { rows: [] };
    },
  };
  await assertReason(
    () =>
      retrieveDocumentChunks(client, input({ release_id: "not-a-uuid" })),
    "invalid_argument",
  );
  assert.equal(queried, false);
});

test("rejects an embedding with a dimension other than 1024", async () => {
  await assertReason(
    () =>
      retrieveDocumentChunks(
        fakeClient(),
        input({ query_embedding: [1, 2] }),
      ),
    "invalid_argument",
  );
});

test("rejects non-finite embedding components", async (t) => {
  for (const component of [Number.NaN, Number.POSITIVE_INFINITY]) {
    await t.test(String(component), async () => {
      const vector = embedding();
      vector[10] = component;
      await assertReason(
        () =>
          retrieveDocumentChunks(
            fakeClient(),
            input({ query_embedding: vector }),
          ),
        "invalid_argument",
      );
    });
  }
});

test("rejects a zero vector", async () => {
  await assertReason(
    () =>
      retrieveDocumentChunks(
        fakeClient(),
        input({ query_embedding: Array<number>(1024).fill(0) }),
      ),
    "invalid_argument",
  );
});

test("rejects invalid top_k values", async (t) => {
  for (const topK of [0, 21, 1.5, Number.NaN]) {
    await t.test(String(topK), async () => {
      await assertReason(
        () => retrieveDocumentChunks(fakeClient(), input({ top_k: topK })),
        "invalid_argument",
      );
    });
  }
});

test("rejects a release that is missing or not ready", async () => {
  const client: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      return { rows: [{ available: false } as T] };
    },
  };
  await assertReason(
    () => retrieveDocumentChunks(client, input()),
    "release_not_available",
  );
});

test("uses exact cosine retrieval with release-safe filters and deterministic order", async () => {
  const calls: Array<{ text: string; values: readonly unknown[] | undefined }> =
    [];
  const client: SqlQueryClient = {
    async query<T>(
      text: string,
      values?: readonly unknown[],
    ): Promise<{ rows: T[] }> {
      calls.push({ text, values });
      return {
        rows: (calls.length === 1
          ? [{ available: true }]
          : [validRow()]) as T[],
      };
    },
  };

  await retrieveDocumentChunks(client, input({ top_k: 7 }));

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0]?.values, [RELEASE_ID]);
  const retrieval = calls[1];
  assert.ok(retrieval);
  assert.deepEqual(retrieval.values, [
    RELEASE_ID,
    `[${embedding().join(",")}]`,
    7,
  ]);
  assert.match(retrieval.text, /dc\.embedding <=> \$2::vector/);
  assert.match(retrieval.text, /dc\.dataset_release_id = \$1/);
  assert.match(retrieval.text, /dv\.dataset_release_id = \$1/);
  assert.match(retrieval.text, /dv\.processing_status = 'ready'/);
  assert.match(retrieval.text, /d\.retrieval_mode = 'chunked'/);
  assert.match(retrieval.text, /dc\.embedding IS NOT NULL/);
  assert.match(
    retrieval.text,
    /ORDER BY cosine_distance ASC, dc\.document_version_id ASC, dc\.ordinal ASC/,
  );
  assert.match(retrieval.text, /LIMIT \$3/);
  assert.doesNotMatch(retrieval.text, /full_document/);
  assert.doesNotMatch(retrieval.text, /ivfflat|hnsw/i);
});

test("normalizes rows and derives similarity from distance", async () => {
  const chunks = await retrieveDocumentChunks(fakeClient(), input());
  assert.deepEqual(chunks, [
    {
      chunk_id: CHUNK_ID,
      document_version_id: VERSION_ID,
      document_id: DOCUMENT_ID,
      document_key: "student-guide",
      title: "Student guide",
      ordinal: 2,
      content: "Synthetic chunk content.",
      chunk_locator: "section:introduction",
      page_start: 3,
      page_end: 4,
      source_path: "documents/student-guide.md",
      source_locator: "synthetic://documents/student-guide",
      source_sha256: SHA256,
      release_id: RELEASE_ID,
      cosine_distance: 0.25,
      cosine_similarity: 0.75,
    },
  ]);
});

test("rejects impossible database rows", async (t) => {
  const cases = [
    validRow({ chunk_id: "not-a-uuid" }),
    validRow({ page_start: null, page_end: 2 }),
    validRow({ cosine_distance: Number.NaN }),
    validRow({ source_sha256: "bad" }),
  ];
  for (const [index, row] of cases.entries()) {
    await t.test(String(index), async () => {
      await assertReason(
        () => retrieveDocumentChunks(fakeClient([row]), input()),
        "invalid_database_result",
      );
    });
  }
});

test("rejects a row from another release", async () => {
  await assertReason(
    () =>
      retrieveDocumentChunks(
        fakeClient([validRow({ release_id: OTHER_RELEASE_ID })]),
        input(),
      ),
    "invalid_database_result",
  );
});

test("rejects an impossible release availability result", async () => {
  const client: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      return { rows: [{ available: "true" } as T] };
    },
  };
  await assertReason(
    () => retrieveDocumentChunks(client, input()),
    "invalid_database_result",
  );
});

test("propagates database errors without wrapping", async () => {
  const databaseError = new Error("database unavailable");
  const client: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      throw databaseError;
    },
  };
  await assert.rejects(
    () => retrieveDocumentChunks(client, input()),
    (error: unknown) => error === databaseError,
  );
});
