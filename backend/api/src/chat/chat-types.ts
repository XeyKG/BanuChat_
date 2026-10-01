import type { SqlQueryClient } from "../data/sql-client.js";
import type { IntentRouter } from "../routing/intent-router-types.js";

export interface ChatDispatchInput {
  content: string;
  profile_key: string | null;
  now: string;
}

export interface ChatDispatchDependencies {
  sql: SqlQueryClient;
  router: IntentRouter;
}

interface PresentationCitationBase {
  index: number;
  label: string;
  locator: string;
  release_id: string;
  artifact_url: null;
}

export type PresentationCitation =
  | (PresentationCitationBase & {
      source_kind:
        | "profile"
        | "profile_course"
        | "calendar_event"
        | "announcement";
      document_version_id: null;
    })
  | (PresentationCitationBase & {
      source_kind: "document";
      document_version_id: string;
    });

interface PersistenceCitationSource {
  citation_index: number;
  dataset_release_id: string;
  source_path: string;
  source_locator: string;
  source_sha256: string;
}

interface StructuredPersistenceCitationBase
  extends PersistenceCitationSource {
  document_version_id: null;
  chunk_id: null;
}

export type PersistenceCitation =
  | (StructuredPersistenceCitationBase & {
      source_kind: "profile";
      profile_key: string;
      course_key: null;
      event_key: null;
      announcement_key: null;
    })
  | (StructuredPersistenceCitationBase & {
      source_kind: "profile_course";
      profile_key: string;
      course_key: string;
      event_key: null;
      announcement_key: null;
    })
  | (StructuredPersistenceCitationBase & {
      source_kind: "calendar_event";
      profile_key: null;
      course_key: null;
      event_key: string;
      announcement_key: null;
    })
  | (StructuredPersistenceCitationBase & {
      source_kind: "announcement";
      profile_key: null;
      course_key: null;
      event_key: null;
      announcement_key: string;
    })
  | (PersistenceCitationSource & {
      source_kind: "document";
      document_version_id: string;
      chunk_id: string;
      profile_key: null;
      course_key: null;
      event_key: null;
      announcement_key: null;
    });

export interface FastPathAnswer {
  kind: "answered";
  route: "profile_progress" | "calendar_events" | "announcements";
  release_id: string;
  content: string;
  insufficient_evidence: boolean;
  citations: PresentationCitation[];
  citation_records: PersistenceCitation[];
}

export interface AgentFallback {
  kind: "agent_fallback";
}

export type ChatDispatchResult = FastPathAnswer | AgentFallback;
