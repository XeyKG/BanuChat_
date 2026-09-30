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

export interface PresentationCitation {
  index: number;
  source_kind:
    | "profile"
    | "profile_course"
    | "calendar_event"
    | "announcement";
  label: string;
  locator: string;
  release_id: string;
  document_version_id: null;
  artifact_url: null;
}

export interface FastPathAnswer {
  kind: "answered";
  route: "profile_progress" | "calendar_events" | "announcements";
  release_id: string;
  content: string;
  insufficient_evidence: boolean;
  citations: PresentationCitation[];
}

export interface AgentFallback {
  kind: "agent_fallback";
}

export type ChatDispatchResult = FastPathAnswer | AgentFallback;
