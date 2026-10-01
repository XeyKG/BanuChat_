import assert from "node:assert/strict";
import test from "node:test";

import type { RetrievedDocumentChunk } from "../src/application/document-retrieval.js";
import { buildDocumentCitations } from "../src/chat/document-citations.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_VERSION_ID = "33333333-3333-4333-8333-333333333333";
const CHUNK_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_CHUNK_ID = "55555555-5555-4555-8555-555555555555";
const SHA256 = "a".repeat(64);

function chunk(
  overrides: Partial<RetrievedDocumentChunk> = {},
): RetrievedDocumentChunk {
  return {
    chunk_id: CHUNK_ID,
    document_version_id: DOCUMENT_VERSION_ID,
    document_id: "66666666-6666-4666-8666-666666666666",
    document_key: "student-guide",
    title: "Guía estudiantil",
    ordinal: 0,
    content: "Contenido sintético.",
    chunk_locator: "section:introduction",
    page_start: 1,
    page_end: 1,
    source_path: "documents/student-guide.md",
    source_locator: "synthetic://documents/student-guide",
    source_sha256: SHA256,
    release_id: RELEASE_ID,
    cosine_distance: 0.1,
    cosine_similarity: 0.9,
    ...overrides,
  };
}

test("maps one retrieved chunk to exact document citations", () => {
  const result = buildDocumentCitations([chunk()]);

  assert.deepEqual(result, {
    citations: [
      {
        index: 0,
        source_kind: "document",
        label: "Documento: Guía estudiantil",
        locator: "section:introduction",
        release_id: RELEASE_ID,
        document_version_id: DOCUMENT_VERSION_ID,
        artifact_url: null,
      },
    ],
    citation_records: [
      {
        citation_index: 0,
        dataset_release_id: RELEASE_ID,
        source_kind: "document",
        source_path: "documents/student-guide.md",
        source_locator: "section:introduction",
        source_sha256: SHA256,
        document_version_id: DOCUMENT_VERSION_ID,
        chunk_id: CHUNK_ID,
        course_key: null,
        event_key: null,
        announcement_key: null,
        profile_key: null,
      },
    ],
  });
});

test("preserves input order and assigns sequential indices", () => {
  const result = buildDocumentCitations([
    chunk(),
    chunk({
      chunk_id: OTHER_CHUNK_ID,
      ordinal: 1,
      title: "Reglamento sintético",
      chunk_locator: "section:rules",
    }),
  ]);

  assert.deepEqual(
    result.citations.map(({ index, label, locator }) => ({ index, label, locator })),
    [
      {
        index: 0,
        label: "Documento: Guía estudiantil",
        locator: "section:introduction",
      },
      {
        index: 1,
        label: "Documento: Reglamento sintético",
        locator: "section:rules",
      },
    ],
  );
  assert.deepEqual(
    result.citation_records.map((record) => record.citation_index),
    [0, 1],
  );
});

test("returns empty arrays for no chunks", () => {
  assert.deepEqual(buildDocumentCitations([]), {
    citations: [],
    citation_records: [],
  });
});

test("rejects a duplicate chunk id", () => {
  assert.throws(
    () => buildDocumentCitations([chunk(), chunk({ ordinal: 1 })]),
    TypeError,
  );
});

test("rejects chunks from mixed releases", () => {
  assert.throws(
    () =>
      buildDocumentCitations([
        chunk(),
        chunk({ chunk_id: OTHER_CHUNK_ID, release_id: OTHER_RELEASE_ID }),
      ]),
    TypeError,
  );
});

test("rejects missing identifiers and blank provenance", () => {
  for (const invalid of [
    chunk({ document_version_id: "" }),
    chunk({ chunk_id: "" }),
    chunk({ source_path: " " }),
    chunk({ chunk_locator: "\t" }),
    chunk({ source_sha256: "" }),
  ]) {
    assert.throws(() => buildDocumentCitations([invalid]), TypeError);
  }
});
