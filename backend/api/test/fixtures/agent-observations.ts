import type {McpToolName} from "../../src/agent/mcp-client.js";
export const RELEASE = "11111111-1111-4111-8111-111111111111";
export const OTHER_RELEASE = "99999999-9999-4999-8999-999999999999";
const DOCUMENT = "33333333-3333-4333-8333-333333333333";
const CHUNK = "44444444-4444-4444-8444-444444444444";
const HASH = "a".repeat(64);
export const NOW = "2026-10-24T10:00:00-05:00";

const sources = {
  document: { source_kind: "document", source_path: "documents/demo.md", source_locator: "section:demo", source_sha256: HASH },
  course: { source_kind: "course", source_path: "courses/demo.json", source_locator: "/courses/0", source_sha256: HASH },
  calendar_event: { source_kind: "calendar_event", source_path: "calendars/demo.json", source_locator: "/events/0", source_sha256: HASH },
  announcement: { source_kind: "announcement", source_path: "announcements/demo.json", source_locator: "/announcements/0", source_sha256: HASH },
  profile_course: { source_kind: "profile_course", source_path: "profiles/demo.json", source_locator: "/courses/0", source_sha256: HASH },
} as const;

export function output(tool: McpToolName, release = RELEASE, empty = false): Record<string, unknown> {
  if (tool === "search_knowledge") return { release_id: release,
    evidence: { status: empty ? "not_found" : "found", match_count: empty ? 0 : 1 },
    matches: empty ? [] : [{ rank: 1, chunk_id: CHUNK, document_key: "doc-demo",
      document_version_id: DOCUMENT, document_title: "Guía sintética", content: "La evidencia sintética explica el requisito.",
      content_sha256: HASH, cosine_distance: 0.1, locator: "section:demo", page_start: null, page_end: null,
      source: sources.document }] };
  if (tool === "find_documents") return { release_id: release, documents: empty ? [] : [{ document_key: "doc-demo",
    document_version_id: DOCUMENT, title: "Guía sintética", retrieval_mode: "full_document", mime_type: "text/markdown",
    version_label: "v1", source: sources.document }] };
  if (tool === "get_courses") return { release_id: release, courses: empty ? [] : [{ course_key: "course-demo",
    name: "Curso sintético", description: "Descripción sintética", status: "available", source: sources.course }] };
  if (tool === "get_calendar_events") return { release_id: release, events: empty ? [] : [{ event_key: "event-demo",
    title: "Evento sintético", description: "Descripción sintética", event_type: "general",
    starts_at: "2026-10-25T10:00:00-05:00", ends_at: null, course_key: null, announcement_key: null,
    source: sources.calendar_event }] };
  if (tool === "get_announcements") return { release_id: release, reference_time: NOW,
    announcements: empty ? [] : [{ announcement_key: "announcement-demo", title: "Convocatoria sintética",
      description: "Descripción sintética", valid_from: "2026-10-01T00:00:00Z", valid_until: null,
      temporal_status: "active", source: sources.announcement }] };
  return { release_id: release,
    profile: { profile_key: "demo-student", alias: "Personaje sintético",
      source: { source_kind: "profile", source_path: "profiles/demo.json", source_locator: "/profile", source_sha256: HASH } },
    courses: empty ? [] : [{ course_key: "course-demo", course_name: "Curso sintético", status: "completed",
      progress_percent: 100, started_at: "2026-01-01T00:00:00Z", completed_at: "2026-02-01T00:00:00Z",
      source: sources.profile_course }] };
}

