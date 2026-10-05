export type IntentRoute =
  | "profile_progress"
  | "course_catalog"
  | "calendar_events"
  | "announcements"
  | "document_lookup"
  | "capabilities_help"
  | "basic_social"
  | "known_out_of_scope"
  | "agent_fallback";

export type IntentResponseVariant =
  | "greeting"
  | "thanks"
  | "farewell"
  | "capabilities"
  | "not_available"
  | null;

export interface IntentRoutingParameters {
  limit?: number;
  statuses?: readonly (
    | "enrolled"
    | "in_progress"
    | "completed"
    | "available"
    | "closed"
    | "archived"
  )[];
  event_types?: readonly (
    | "course_session"
    | "announcement_deadline"
    | "general"
  )[];
  date_from?: string;
  date_to?: string;
  temporal_status?: "active" | "upcoming" | "expired" | "all";
  reference_time?: string;
  query?: string;
  retrieval_mode?: "chunked" | "full_document";
}

export interface IntentRoutingInput {
  content: string;
  context: {
    profile_selected: boolean;
    now: string;
  };
}

export interface IntentRoutingDecision {
  route: IntentRoute;
  parameters: IntentRoutingParameters;
  response_variant: IntentResponseVariant;
}

export interface WeightedIntentPenalty {
  type: "unknown_content" | "foreign_intent";
  value: number;
  terms?: readonly string[];
  families?: readonly IntentRoute[];
}

export interface WeightedIntentCandidateDiagnostic {
  candidate_intent: IntentRoute;
  raw_score: number;
  final_score: number;
  matched_signal_groups: readonly string[];
  matched_signals: readonly string[];
  ignored_terms: readonly string[];
  unknown_content_terms: readonly string[];
  foreign_intent_families: readonly IntentRoute[];
  foreign_signals: Readonly<Record<string, readonly string[]>>;
  penalties: readonly WeightedIntentPenalty[];
}

export interface IntentRoutingDiagnostics {
  decision: IntentRoutingDecision;
  candidates: readonly WeightedIntentCandidateDiagnostic[];
  winner_score: number;
  runner_up_score: number;
  margin: number;
  decision_reason: string;
}

export interface IntentRouter {
  readonly catalog_valid: boolean;
  readonly catalog_version: string | null;

  route(input: IntentRoutingInput): IntentRoutingDecision;
}

export interface DiagnosticIntentRouter extends IntentRouter {
  routeWithDiagnostics(input: IntentRoutingInput): IntentRoutingDiagnostics;
}
