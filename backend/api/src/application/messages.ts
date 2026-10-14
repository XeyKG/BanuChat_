import { dispatchChatQuery } from "../chat/chat-dispatcher.js";
import {
  DocumentRagInvariantError,
  type DocumentRagAnswer,
  type DocumentRagInput,
} from "../chat/document-rag.js";
import type {
  PersistenceCitation,
  PresentationCitation,
} from "../chat/chat-types.js";
import { DocumentQueryRetrievalError } from "./document-query-retrieval-errors.js";
import type { SqlQueryClient } from "../data/sql-client.js";
import { GeneratorClientError } from "../generation/generator-client.js";
import type { IntentRouter } from "../routing/intent-router-types.js";
import { AnnouncementsError } from "./announcements-errors.js";
import { CalendarEventsError } from "./calendar-events-errors.js";
import { CurrentReleaseError } from "./current-release-errors.js";
import { CourseCatalogError } from "./course-catalog-errors.js";
import { SendMessageError } from "./messages-errors.js";
import { ProfileProgressError } from "./profile-progress-errors.js";
import { DocumentLookupError } from "./document-lookup-errors.js";

const DATASET_ID = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const CONVERSATION_CONTEXT_QUERY = `
SELECT
  c.dataset_release_id,
  c.profile_key,
  d.current_release_id,
  EXISTS (
    SELECT 1
    FROM banuchat.dataset_releases current_release
    WHERE current_release.id = d.current_release_id
      AND current_release.dataset_id = d.id
      AND current_release.status = 'ready'
  ) AS current_release_is_ready,
  COALESCE((
    SELECT MAX(m.ordinal) + 1
    FROM banuchat.messages m
    WHERE m.conversation_id = c.id
  ), 0) AS expected_next_ordinal
FROM banuchat.conversations c
LEFT JOIN banuchat.datasets d
  ON d.id = $2
WHERE c.id = $1
`;

const PERSIST_TURN_QUERY = `
WITH locked_conversation AS MATERIALIZED (
  SELECT c.id, c.dataset_release_id
  FROM banuchat.conversations c
  WHERE c.id = $1
  FOR UPDATE
), current_context AS MATERIALIZED (
  SELECT d.current_release_id
  FROM banuchat.datasets d
  JOIN banuchat.dataset_releases current_release
    ON current_release.id = d.current_release_id
   AND current_release.dataset_id = d.id
   AND current_release.status = 'ready'
  WHERE d.id = 1
  FOR SHARE OF d, current_release
), ordinal_state AS MATERIALIZED (
  SELECT COALESCE(MAX(m.ordinal) + 1, 0) AS next_ordinal
  FROM locked_conversation lc
  LEFT JOIN banuchat.messages m
    ON m.conversation_id = lc.id
), persistence_gate AS MATERIALIZED (
  SELECT lc.id
  FROM locked_conversation lc
  CROSS JOIN current_context cc
  CROSS JOIN ordinal_state os
  WHERE lc.dataset_release_id = $2::uuid
    AND cc.current_release_id = $2::uuid
    AND os.next_ordinal = $3
), inserted_messages AS (
  INSERT INTO banuchat.messages (
    conversation_id,
    ordinal,
    role,
    content,
    answer_dataset_release_id,
    insufficient_evidence
  )
  SELECT
    persistence_gate.id,
    turn.ordinal,
    turn.role,
    turn.content,
    turn.answer_dataset_release_id,
    turn.insufficient_evidence
  FROM persistence_gate
  CROSS JOIN LATERAL (
    VALUES
      ($3, 'user', $4, NULL::uuid, false),
      ($3 + 1, 'assistant', $5, $2::uuid, $6)
  ) AS turn(ordinal, role, content, answer_dataset_release_id, insufficient_evidence)
  ORDER BY turn.ordinal
  RETURNING id, ordinal, role, content, created_at, insufficient_evidence
), citation_input AS MATERIALIZED (
  SELECT citation.*
  FROM jsonb_to_recordset($7::jsonb) AS citation(
    citation_index integer,
    dataset_release_id uuid,
    source_kind text,
    source_path text,
    source_locator text,
    source_sha256 text,
    document_version_id uuid,
    chunk_id uuid,
    course_key text,
    event_key text,
    announcement_key text,
    profile_key text
  )
), inserted_citations AS (
  INSERT INTO banuchat.message_citations (
    message_id,
    citation_index,
    dataset_release_id,
    source_kind,
    source_path,
    source_locator,
    source_sha256,
    document_version_id,
    chunk_id,
    course_key,
    event_key,
    announcement_key,
    profile_key
  )
  SELECT
    assistant.id,
    citation.citation_index,
    citation.dataset_release_id,
    citation.source_kind::banuchat.source_kind,
    citation.source_path,
    citation.source_locator,
    citation.source_sha256,
    citation.document_version_id,
    citation.chunk_id,
    citation.course_key,
    citation.event_key,
    citation.announcement_key,
    citation.profile_key
  FROM inserted_messages assistant
  CROSS JOIN citation_input citation
  WHERE assistant.role = 'assistant'
  RETURNING citation_index
)
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM locked_conversation)
      THEN 'conversation_not_found'
    WHEN NOT EXISTS (
      SELECT 1
      FROM locked_conversation lc
      CROSS JOIN current_context cc
      WHERE lc.dataset_release_id = $2::uuid
        AND cc.current_release_id = $2::uuid
    ) THEN 'current_release_changed'
    WHEN (SELECT next_ordinal FROM ordinal_state) IS DISTINCT FROM $3
      THEN 'conversation_conflict'
    WHEN (SELECT COUNT(*) FROM inserted_messages) <> 2
      OR (SELECT COUNT(*) FROM inserted_citations) <> jsonb_array_length($7::jsonb)
      THEN 'invalid_database_result'
    ELSE 'inserted'
  END AS status,
  (SELECT id FROM inserted_messages WHERE role = 'user') AS user_message_id,
  (SELECT ordinal FROM inserted_messages WHERE role = 'user') AS user_ordinal,
  (SELECT content FROM inserted_messages WHERE role = 'user') AS user_content,
  (SELECT created_at FROM inserted_messages WHERE role = 'user') AS user_created_at,
  (SELECT id FROM inserted_messages WHERE role = 'assistant') AS assistant_message_id,
  (SELECT ordinal FROM inserted_messages WHERE role = 'assistant') AS assistant_ordinal,
  (SELECT content FROM inserted_messages WHERE role = 'assistant') AS assistant_content,
  (SELECT created_at FROM inserted_messages WHERE role = 'assistant') AS assistant_created_at,
  (SELECT insufficient_evidence FROM inserted_messages WHERE role = 'assistant')
    AS assistant_insufficient_evidence
`;

export interface SendMessageDependencies {
  sql: SqlQueryClient;
  router: IntentRouter;
  document_rag: DocumentRagResponder;
}

export type DocumentRagResponder = (
  input: DocumentRagInput,
) => Promise<DocumentRagAnswer>;

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  now: string;
}

export interface SentUserMessage {
  message_id: string;
  role: "user";
  content: string;
  created_at: string;
}

export interface SentAssistantMessage {
  message_id: string;
  role: "assistant";
  content: string;
  created_at: string;
  insufficient_evidence: boolean;
  citations: PresentationCitation[];
}

export interface SendMessageResult {
  conversation_id: string;
  user_message: SentUserMessage;
  assistant_message: SentAssistantMessage;
}

interface ConversationContextRow {
  dataset_release_id: unknown;
  profile_key: unknown;
  current_release_id: unknown;
  current_release_is_ready: unknown;
  expected_next_ordinal: unknown;
}

interface PersistedTurnRow {
  status: unknown;
  user_message_id: unknown;
  user_ordinal: unknown;
  user_content: unknown;
  user_created_at: unknown;
  assistant_message_id: unknown;
  assistant_ordinal: unknown;
  assistant_content: unknown;
  assistant_created_at: unknown;
  assistant_insufficient_evidence: unknown;
}

function reject(reason: ConstructorParameters<typeof SendMessageError>[0]): never {
  throw new SendMessageError(reason);
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

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
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

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function validateCitationPair(
  citation: PresentationCitation,
  record: PersistenceCitation,
  index: number,
  releaseId: string,
): boolean {
  if (
    citation.index !== index ||
    record.citation_index !== index ||
    citation.source_kind !== record.source_kind ||
    citation.release_id !== releaseId ||
    record.dataset_release_id !== releaseId ||
    !isNonblank(citation.label) ||
    !isNonblank(citation.locator) ||
    citation.locator !== record.source_locator ||
    !isNonblank(record.source_path) ||
    !isNonblank(record.source_locator) ||
    !isSha256(record.source_sha256)
  ) {
    return false;
  }

  if (citation.source_kind === "document") {
    return (
      record.source_kind === "document" &&
      isUuid(citation.document_version_id) &&
      record.document_version_id === citation.document_version_id &&
      (citation.artifact_url === null ||
        citation.artifact_url ===
          `/api/v1/documents/${citation.document_version_id}/artifact`) &&
      (record.chunk_id === null || isUuid(record.chunk_id)) &&
      record.profile_key === null &&
      record.course_key === null &&
      record.event_key === null &&
      record.announcement_key === null
    );
  }

  if (
    record.source_kind === "document" ||
    citation.document_version_id !== null ||
    citation.artifact_url !== null ||
    record.document_version_id !== null ||
    record.chunk_id !== null
  ) {
    return false;
  }

  if (record.source_kind === "course") {
    return (
      isStableKey(record.course_key) &&
      record.profile_key === null &&
      record.event_key === null &&
      record.announcement_key === null
    );
  }
  if (record.source_kind === "profile") {
    return (
      isStableKey(record.profile_key) &&
      record.course_key === null &&
      record.event_key === null &&
      record.announcement_key === null
    );
  }
  if (record.source_kind === "profile_course") {
    return (
      isStableKey(record.profile_key) &&
      isStableKey(record.course_key) &&
      record.event_key === null &&
      record.announcement_key === null
    );
  }
  if (record.source_kind === "calendar_event") {
    return (
      record.profile_key === null &&
      record.course_key === null &&
      isStableKey(record.event_key) &&
      record.announcement_key === null
    );
  }
  return (
    record.source_kind === "announcement" &&
    record.profile_key === null &&
    record.course_key === null &&
    record.event_key === null &&
    isStableKey(record.announcement_key)
  );
}

interface PersistableAnswer {
  release_id: string;
  content: string;
  insufficient_evidence: boolean;
  citations: PresentationCitation[];
  citation_records: PersistenceCitation[];
}

function validateAnswer(answer: PersistableAnswer): void {
  if (
    !isUuid(answer.release_id) ||
    !isNonblank(answer.content) ||
    typeof answer.insufficient_evidence !== "boolean" ||
    !Array.isArray(answer.citations) ||
    !Array.isArray(answer.citation_records) ||
    answer.citations.length !== answer.citation_records.length
  ) {
    reject("invalid_database_result");
  }

  for (let index = 0; index < answer.citations.length; index += 1) {
    const citation = answer.citations[index];
    const record = answer.citation_records[index];
    if (
      citation === undefined ||
      record === undefined ||
      !validateCitationPair(citation, record, index, answer.release_id)
    ) {
      reject("invalid_database_result");
    }
  }
}

export async function sendMessage(
  dependencies: SendMessageDependencies,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  if (
    input === null ||
    typeof input !== "object" ||
    !isUuid(input.conversation_id) ||
    typeof input.content !== "string" ||
    Array.from(input.content).length < 1 ||
    Array.from(input.content).length > 4000 ||
    !/\S/u.test(input.content) ||
    typeof input.now !== "string"
  ) {
    reject("invalid_argument");
  }

  const contextResult = await dependencies.sql.query<ConversationContextRow>(
    CONVERSATION_CONTEXT_QUERY,
    [input.conversation_id, DATASET_ID],
  );
  if (contextResult.rows.length === 0) {
    reject("conversation_not_found");
  }
  if (contextResult.rows.length !== 1) {
    reject("invalid_database_result");
  }

  const context = contextResult.rows[0];
  if (
    context === undefined ||
    !isUuid(context.dataset_release_id) ||
    !isStableKey(context.profile_key) ||
    !Number.isInteger(context.expected_next_ordinal) ||
    (context.expected_next_ordinal as number) < 0
  ) {
    reject("invalid_database_result");
  }
  if (
    context.current_release_is_ready !== true ||
    !isUuid(context.current_release_id) ||
    context.current_release_id !== context.dataset_release_id
  ) {
    reject("current_release_changed");
  }

  let dispatched;
  try {
    dispatched = await dispatchChatQuery(
      { sql: dependencies.sql, router: dependencies.router },
      {
        content: input.content,
        profile_key: context.profile_key,
        release_id: context.dataset_release_id,
        now: input.now,
      },
    );
  } catch (error) {
    if (error instanceof CurrentReleaseError) {
      reject(
        error.reason === "no_current_release"
          ? "current_release_changed"
          : "invalid_database_result",
      );
    }
    if (
      error instanceof CalendarEventsError ||
      error instanceof CourseCatalogError ||
      error instanceof AnnouncementsError ||
      error instanceof DocumentLookupError
    ) {
      reject("invalid_database_result");
    }
    if (error instanceof ProfileProgressError) {
      reject(
        error.reason === "profile_not_found"
          ? "current_release_changed"
          : "invalid_database_result",
      );
    }
    throw error;
  }

  let answer: PersistableAnswer;
  if (dispatched.kind === "answered") {
    answer = dispatched;
  } else {
    try {
      answer = await dependencies.document_rag({
        release_id: context.dataset_release_id,
        query: input.content,
      });
    } catch (error) {
      if (error instanceof GeneratorClientError) {
        reject("rag_dependency_unavailable");
      }
      if (error instanceof DocumentQueryRetrievalError) {
        if (error.reason === "release_not_available") {
          reject("current_release_changed");
        }
        if (
          error.reason === "embedding_runtime_mismatch" ||
          error.reason === "embedding_unavailable" ||
          error.reason === "invalid_embedding_response"
        ) {
          reject("rag_dependency_unavailable");
        }
        reject("invalid_database_result");
      }
      if (error instanceof DocumentRagInvariantError) {
        reject("invalid_database_result");
      }
      throw error;
    }
  }
  if (answer.release_id !== context.dataset_release_id) {
    reject("current_release_changed");
  }
  validateAnswer(answer);

  const expectedOrdinal = context.expected_next_ordinal as number;
  let persistenceResult;
  try {
    persistenceResult = await dependencies.sql.query<PersistedTurnRow>(
      PERSIST_TURN_QUERY,
      [
        input.conversation_id,
        context.dataset_release_id,
        expectedOrdinal,
        input.content,
        answer.content,
        answer.insufficient_evidence,
        JSON.stringify(answer.citation_records),
      ],
    );
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      reject("conversation_conflict");
    }
    throw error;
  }

  if (persistenceResult.rows.length !== 1) {
    reject("invalid_database_result");
  }
  const row = persistenceResult.rows[0];
  if (row === undefined) reject("invalid_database_result");
  if (row.status === "conversation_not_found") {
    reject("conversation_not_found");
  }
  if (row.status === "current_release_changed") {
    reject("current_release_changed");
  }
  if (row.status === "conversation_conflict") {
    reject("conversation_conflict");
  }
  if (row.status !== "inserted") {
    reject("invalid_database_result");
  }

  const userCreatedAt = toRfc3339(row.user_created_at);
  const assistantCreatedAt = toRfc3339(row.assistant_created_at);
  if (
    !isUuid(row.user_message_id) ||
    row.user_ordinal !== expectedOrdinal ||
    row.user_content !== input.content ||
    userCreatedAt === undefined ||
    !isUuid(row.assistant_message_id) ||
    row.assistant_ordinal !== expectedOrdinal + 1 ||
    row.assistant_content !== answer.content ||
    assistantCreatedAt === undefined ||
    row.assistant_insufficient_evidence !== answer.insufficient_evidence
  ) {
    reject("invalid_database_result");
  }

  return {
    conversation_id: input.conversation_id,
    user_message: {
      message_id: row.user_message_id,
      role: "user",
      content: row.user_content,
      created_at: userCreatedAt,
    },
    assistant_message: {
      message_id: row.assistant_message_id,
      role: "assistant",
      content: row.assistant_content,
      created_at: assistantCreatedAt,
      insufficient_evidence: row.assistant_insufficient_evidence,
      citations: answer.citations,
    },
  };
}
