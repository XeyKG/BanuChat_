import assert from "node:assert/strict";
import test from "node:test";
import { renderCourseCatalog } from "../src/chat/chat-renderers.js";
import type { CourseCatalogResult } from "../src/application/course-catalog.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const result: CourseCatalogResult = {
  release_id: RELEASE_ID,
  courses: (["available", "closed", "archived"] as const).map((status, index) => ({
    course_key: `course_${index}`,
    name: `Curso ${index}`,
    description: "Descripción sintética",
    status,
    source: {
      source_kind: "course",
      source_path: "courses/catalog.json",
      source_locator: `course:course_${index}`,
      source_sha256: "a".repeat(64),
    },
  })),
};

test("catalog renderer preserves status labels, course identities and provenance", () => {
  const answer = renderCourseCatalog(result);
  assert.equal(answer.route, "course_catalog");
  assert.equal(answer.kind, "answered");
  assert.equal(answer.release_id, RELEASE_ID);
  assert.equal(answer.insufficient_evidence, false);
  assert.equal(answer.content, "Cursos del catálogo:\n- Curso 0 — disponible\n- Curso 1 — cerrado\n- Curso 2 — archivado");
  for (const [index, course] of result.courses.entries()) {
    assert.deepEqual(answer.citations[index], {
      index, source_kind: "course", label: `Curso: ${course.name}`,
      locator: course.source.source_locator, release_id: RELEASE_ID,
      document_version_id: null, artifact_url: null,
    });
    assert.deepEqual(answer.citation_records[index], {
      citation_index: index, dataset_release_id: RELEASE_ID,
      ...course.source, course_key: course.course_key,
      profile_key: null, event_key: null, announcement_key: null,
      document_version_id: null, chunk_id: null,
    });
  }
  assert.deepEqual(renderCourseCatalog(result), answer);
});

test("empty catalog is an answered result without citations", () => {
  assert.deepEqual(renderCourseCatalog({ release_id: RELEASE_ID, courses: [] }), {
    kind: "answered", route: "course_catalog", release_id: RELEASE_ID,
    content: "No encontré cursos que coincidan con ese filtro.",
    insufficient_evidence: false, citations: [], citation_records: [],
  });
});
