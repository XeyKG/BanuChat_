import type { SqlQueryClient } from "../data/sql-client.js";
import { ConversationDetailError } from "./conversation-detail-errors.js";
import { profileRelation, type DemoMode } from "./demo-mode.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const CONVERSATION_DETAIL_QUERY = (mode: DemoMode) => `
SELECT
  c.id AS conversation_id,
  c.dataset_release_id,
  c.profile_key,
  c.started_at,
  sp.alias AS profile_alias
FROM banuchat.conversations c
LEFT JOIN ${profileRelation(mode)} sp
  ON sp.dataset_release_id = c.dataset_release_id
 AND sp.profile_key = c.profile_key
WHERE c.id = $1
`;

const CONVERSATION_MESSAGES_QUERY = `
SELECT
  m.id AS message_id,
  m.ordinal,
  m.role,
  m.content,
  m.created_at,
  m.answer_dataset_release_id,
  m.insufficient_evidence
FROM banuchat.messages m
WHERE m.conversation_id = $1
ORDER BY m.ordinal ASC
`;

const CONVERSATION_CITATIONS_QUERY = `
SELECT
  mc.message_id,
  m.ordinal AS message_ordinal,
  mc.citation_index,
  mc.dataset_release_id,
  mc.source_kind::text AS source_kind,
  mc.source_locator,
  mc.document_version_id,
  CASE mc.source_kind::text
    WHEN 'document' THEN dv.title
    WHEN 'course' THEN course.name
    WHEN 'calendar_event' THEN event.title
    WHEN 'announcement' THEN announcement.title
    WHEN 'profile' THEN profile.alias
    WHEN 'profile_course' THEN course.name
  END AS metadata_label
FROM banuchat.message_citations mc
JOIN banuchat.messages m
  ON m.id = mc.message_id
 AND m.conversation_id = $1
LEFT JOIN banuchat.document_versions dv
  ON mc.source_kind = 'document'
 AND dv.dataset_release_id = mc.dataset_release_id
 AND dv.id = mc.document_version_id
LEFT JOIN banuchat.courses course
  ON mc.source_kind IN ('course', 'profile_course')
 AND course.dataset_release_id = mc.dataset_release_id
 AND course.course_key = mc.course_key
LEFT JOIN banuchat.calendar_events event
  ON mc.source_kind = 'calendar_event'
 AND event.dataset_release_id = mc.dataset_release_id
 AND event.event_key = mc.event_key
LEFT JOIN banuchat.announcements announcement
  ON mc.source_kind = 'announcement'
 AND announcement.dataset_release_id = mc.dataset_release_id
 AND announcement.announcement_key = mc.announcement_key
LEFT JOIN banuchat.synthetic_profiles profile
  ON mc.source_kind = 'profile'
 AND profile.dataset_release_id = mc.dataset_release_id
 AND profile.profile_key = mc.profile_key
ORDER BY m.ordinal ASC, mc.citation_index ASC
`;

export interface GetConversationDetailInput {
  conversation_id: string;
}

export type ConversationDetailSourceKind =
  | "document"
  | "course"
  | "calendar_event"
  | "announcement"
  | "profile"
  | "profile_course";

export interface ConversationDetailCitation {
  index: number;
  source_kind: ConversationDetailSourceKind;
  label: string;
  locator: string;
  release_id: string;
  document_version_id: string | null;
  artifact_url: string | null;
}

export interface ConversationDetailUserMessage {
  message_id: string;
  role: "user";
  content: string;
  created_at: string;
}

export interface ConversationDetailAssistantMessage {
  message_id: string;
  role: "assistant";
  content: string;
  created_at: string;
  insufficient_evidence: boolean;
  citations: ConversationDetailCitation[];
}

export type ConversationDetailMessage =
  | ConversationDetailUserMessage
  | ConversationDetailAssistantMessage;

export interface ConversationDetailResult {
  conversation_id: string;
  started_at: string;
  profile: {
    profile_key: string;
    alias: string;
  };
  messages: ConversationDetailMessage[];
}

interface ConversationRow {
  conversation_id: unknown;
  dataset_release_id: unknown;
  profile_key: unknown;
  started_at: unknown;
  profile_alias: unknown;
}

interface MessageRow {
  message_id: unknown;
  ordinal: unknown;
  role: unknown;
  content: unknown;
  created_at: unknown;
  answer_dataset_release_id: unknown;
  insufficient_evidence: unknown;
}

interface CitationRow {
  message_id: unknown;
  message_ordinal: unknown;
  citation_index: unknown;
  dataset_release_id: unknown;
  source_kind: unknown;
  source_locator: unknown;
  document_version_id: unknown;
  metadata_label: unknown;
}

interface ValidatedMessage {
  ordinal: number;
  role: "user" | "assistant";
  answerReleaseId: string | null;
  output: ConversationDetailMessage;
}

function reject(reason: ConstructorParameters<typeof ConversationDetailError>[0]): never {
  throw new ConversationDetailError(reason);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && /\S/u.test(value);
}

function toRfc3339(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (
    typeof value !== "string" ||
    !RFC3339_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    return undefined;
  }
  return value;
}

function isSourceKind(value: unknown): value is ConversationDetailSourceKind {
  return (
    value === "document" ||
    value === "course" ||
    value === "calendar_event" ||
    value === "announcement" ||
    value === "profile" ||
    value === "profile_course"
  );
}

export function labelPrefix(sourceKind: ConversationDetailSourceKind): string {
  switch (sourceKind) {
    case "document":
      return "Documento";
    case "course":
      return "Curso";
    case "calendar_event":
      return "Evento";
    case "announcement":
      return "Anuncio";
    case "profile":
      return "Perfil";
    case "profile_course":
      return "Progreso";
  }
}

function validateMessages(rows: readonly MessageRow[]): {
  outputs: ConversationDetailMessage[];
  byId: Map<string, ValidatedMessage>;
} {
  const outputs: ConversationDetailMessage[] = [];
  const byId = new Map<string, ValidatedMessage>();
  let previousOrdinal = -1;

  for (const row of rows) {
    const createdAt = toRfc3339(row.created_at);
    if (
      !isUuid(row.message_id) ||
      !Number.isInteger(row.ordinal) ||
      (row.ordinal as number) < 0 ||
      (row.ordinal as number) <= previousOrdinal ||
      (row.role !== "user" && row.role !== "assistant") ||
      !isNonblank(row.content) ||
      createdAt === undefined ||
      byId.has(row.message_id)
    ) {
      reject("invalid_database_result");
    }

    const ordinal = row.ordinal as number;
    previousOrdinal = ordinal;
    if (row.role === "user") {
      if (row.answer_dataset_release_id !== null || row.insufficient_evidence !== false) {
        reject("invalid_database_result");
      }
      const output: ConversationDetailUserMessage = {
        message_id: row.message_id,
        role: "user",
        content: row.content,
        created_at: createdAt,
      };
      outputs.push(output);
      byId.set(row.message_id, {
        ordinal,
        role: "user",
        answerReleaseId: null,
        output,
      });
      continue;
    }

    if (
      !isUuid(row.answer_dataset_release_id) ||
      typeof row.insufficient_evidence !== "boolean"
    ) {
      reject("invalid_database_result");
    }
    const output: ConversationDetailAssistantMessage = {
      message_id: row.message_id,
      role: "assistant",
      content: row.content,
      created_at: createdAt,
      insufficient_evidence: row.insufficient_evidence,
      citations: [],
    };
    outputs.push(output);
    byId.set(row.message_id, {
      ordinal,
      role: "assistant",
      answerReleaseId: row.answer_dataset_release_id,
      output,
    });
  }

  return { outputs, byId };
}

function attachCitations(
  rows: readonly CitationRow[],
  messagesById: Map<string, ValidatedMessage>,
): void {
  let previousMessageOrdinal = -1;
  let previousCitationIndex = -1;

  for (const row of rows) {
    const message = isUuid(row.message_id)
      ? messagesById.get(row.message_id)
      : undefined;
    if (
      message === undefined ||
      message.role !== "assistant" ||
      !Number.isInteger(row.message_ordinal) ||
      row.message_ordinal !== message.ordinal ||
      !Number.isInteger(row.citation_index) ||
      (row.citation_index as number) < 0 ||
      !isUuid(row.dataset_release_id) ||
      row.dataset_release_id !== message.answerReleaseId ||
      !isSourceKind(row.source_kind) ||
      !isNonblank(row.source_locator) ||
      !isNonblank(row.metadata_label)
    ) {
      reject("invalid_database_result");
    }

    const messageOrdinal = row.message_ordinal as number;
    const citationIndex = row.citation_index as number;
    if (
      messageOrdinal < previousMessageOrdinal ||
      (messageOrdinal === previousMessageOrdinal &&
        citationIndex <= previousCitationIndex)
    ) {
      reject("invalid_database_result");
    }
    previousCitationIndex = citationIndex;
    previousMessageOrdinal = messageOrdinal;

    const documentVersionId =
      row.source_kind === "document" && isUuid(row.document_version_id)
        ? row.document_version_id
        : row.source_kind !== "document" && row.document_version_id === null
          ? null
          : undefined;
    if (documentVersionId === undefined) {
      reject("invalid_database_result");
    }

    const output = message.output;
    if (output.role !== "assistant") {
      reject("invalid_database_result");
    }
    output.citations.push({
      index: citationIndex,
      source_kind: row.source_kind,
      label: `${labelPrefix(row.source_kind)}: ${row.metadata_label}`,
      locator: row.source_locator,
      release_id: row.dataset_release_id,
      document_version_id: documentVersionId,
      artifact_url:
        documentVersionId === null
          ? null
          : `/api/v1/documents/${documentVersionId}/artifact`,
    });
  }
}

export async function getConversationDetail(
  client: SqlQueryClient,
  input: GetConversationDetailInput,
  mode: DemoMode = "synthetic",
): Promise<ConversationDetailResult> {
  if (
    input === null ||
    typeof input !== "object" ||
    !isUuid(input.conversation_id)
  ) {
    reject("invalid_argument");
  }

  const conversationResult = await client.query<ConversationRow>(
    CONVERSATION_DETAIL_QUERY(mode),
    [input.conversation_id],
  );
  if (conversationResult.rows.length === 0) {
    reject("conversation_not_found");
  }
  if (conversationResult.rows.length !== 1) {
    reject("invalid_database_result");
  }

  const conversation = conversationResult.rows[0];
  const startedAt =
    conversation === undefined ? undefined : toRfc3339(conversation.started_at);
  if (
    conversation === undefined ||
    conversation.conversation_id !== input.conversation_id ||
    !isUuid(conversation.conversation_id) ||
    !isUuid(conversation.dataset_release_id) ||
    !isStableKey(conversation.profile_key) ||
    !isNonblank(conversation.profile_alias) ||
    startedAt === undefined
  ) {
    reject("invalid_database_result");
  }

  const messagesResult = await client.query<MessageRow>(
    CONVERSATION_MESSAGES_QUERY,
    [input.conversation_id],
  );
  const { outputs, byId } = validateMessages(messagesResult.rows);

  const citationsResult = await client.query<CitationRow>(
    CONVERSATION_CITATIONS_QUERY,
    [input.conversation_id],
  );
  attachCitations(citationsResult.rows, byId);

  return {
    conversation_id: conversation.conversation_id,
    started_at: startedAt,
    profile: {
      profile_key: conversation.profile_key,
      alias: conversation.profile_alias,
    },
    messages: outputs,
  };
}
