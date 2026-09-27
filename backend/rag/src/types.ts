export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type RetrievalMode = 'chunked' | 'full_document';
export type ItemKind = 'document' | 'course' | 'calendar_event' | 'announcement' | 'profile' | 'profile_course';
export interface SourceFile { path: string; kind: string; sha256: string; schema?: string }
export type ManifestItem = { key: string; path: string; locator: string; sha256: string } &
  ({ kind: 'document'; retrieval_mode: RetrievalMode } | { kind: Exclude<ItemKind, 'document'> });
export interface Manifest {
  dataset_key: string; manifest_version: string; schema_version: string;
  synthetic: true; timezone: string; files: SourceFile[]; items: ManifestItem[];
}
export interface DocumentRecord {
  document_key: string; title: string; retrieval_mode: RetrievalMode;
  mime_type: 'text/markdown'; version_label: string | null; artifact_path: string;
}
export interface Course { course_key: string; name: string; description: string; status: 'available' | 'closed' | 'archived' }
export interface CalendarEvent {
  event_key: string; title: string; description: string;
  event_type: 'course_session' | 'announcement_deadline' | 'general';
  starts_at: string; ends_at: string | null; course_key: string | null; announcement_key: string | null;
}
export interface Announcement { announcement_key: string; title: string; description: string; valid_from: string; valid_until: string | null }
export interface Profile { profile_key: string; alias: string }
export interface Progress {
  profile_key: string; course_key: string; status: 'enrolled' | 'in_progress' | 'completed';
  progress_percent: number; started_at: string | null; completed_at: string | null;
}
export interface Catalogs {
  documents: DocumentRecord[]; courses: Course[]; events: CalendarEvent[];
  announcements: Announcement[]; profiles: Profile[]; progress: Progress[];
}
export interface ContentProfile {
  dataset_key: string; manifest_version: string; schema_version: string; synthetic: true;
  timezone: string; files: number; items: number; kinds: Readonly<Record<ItemKind, number>>;
  chunked_documents: number; full_documents: number;
}
export interface ValidatedContent {
  manifest: Manifest; catalogs: Catalogs;
  /** In-memory snapshot. Consumers must not mutate the buffers or records. */
  bytes: ReadonlyMap<string, Buffer>;
  summary: { files: number; items: number; kinds: Record<ItemKind, number>;
    documents: number; chunked_documents: number; full_documents: number };
}
export interface Chunk {
  ordinal: number; locator: string; content: string; content_sha256: string;
  page_start: null; page_end: null;
}
export interface DocumentDerivatives {
  document_key: string; retrieval_mode: RetrievalMode; source_sha256: string;
  content_sha256: string; chunks: Chunk[];
}
