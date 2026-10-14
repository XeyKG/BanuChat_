import assert from "node:assert/strict";
import test from "node:test";

import type { DocumentLookupResult } from "../src/application/document-lookup.js";
import { renderDocumentLookup } from "../src/chat/chat-renderers.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const result: DocumentLookupResult = {
  release_id: RELEASE_ID,
  documents: [{
    document_key: "integration-guide",
    document_version_id: DOCUMENT_VERSION_ID,
    title: "Guía completa de actividad integradora",
    retrieval_mode: "full_document",
    mime_type: "text/markdown",
    source: {
      source_kind: "document",
      source_path: "documents/integration-guide.md",
      source_locator: "document:integration-guide",
      source_sha256: "a".repeat(64),
    },
  }],
};

test("renders a document lookup with an exact artifact and nullable chunk", () => {
  const answer = renderDocumentLookup(result);
  assert.equal(answer.kind, "answered");
  assert.equal(answer.route, "document_lookup");
  assert.equal(answer.content, "Encontré este documento:\n- Guía completa de actividad integradora");
  assert.equal(answer.insufficient_evidence, false);
  assert.deepEqual(answer.citations, [{
    index: 0,
    source_kind: "document",
    label: "Documento: Guía completa de actividad integradora",
    locator: "document:integration-guide",
    release_id: RELEASE_ID,
    document_version_id: DOCUMENT_VERSION_ID,
    artifact_url: `/api/v1/documents/${DOCUMENT_VERSION_ID}/artifact`,
  }]);
  assert.deepEqual(answer.citation_records, [{
    citation_index: 0,
    dataset_release_id: RELEASE_ID,
    source_kind: "document",
    source_path: "documents/integration-guide.md",
    source_locator: "document:integration-guide",
    source_sha256: "a".repeat(64),
    document_version_id: DOCUMENT_VERSION_ID,
    chunk_id: null,
    profile_key: null,
    course_key: null,
    event_key: null,
    announcement_key: null,
  }]);
});

test("renders an empty document lookup without citations", () => {
  assert.deepEqual(renderDocumentLookup({ release_id: RELEASE_ID, documents: [] }), {
    kind: "answered",
    route: "document_lookup",
    release_id: RELEASE_ID,
    content: "No encontré un documento que coincida con esa búsqueda.",
    insufficient_evidence: false,
    citations: [],
    citation_records: [],
  });
});
