import type { SqlQueryClient } from "../data/sql-client.js";
import { ConversationHistoryError } from "./conversation-history-errors.js";

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const LIST_CONVERSATIONS_QUERY = `
SELECT
  c.id AS conversation_id,
  c.profile_key,
  c.started_at,
  MAX(m.created_at) AS last_message_at,
  COUNT(m.id)::integer AS message_count
FROM banuchat.conversations c
LEFT JOIN banuchat.messages m
  ON m.conversation_id = c.id
WHERE c.profile_key = $1
GROUP BY c.id, c.profile_key, c.started_at
ORDER BY c.started_at DESC, c.id DESC
LIMIT $2
`;

export interface ListConversationsInput {
  profile_key: string;
  limit?: number;
}

export interface ConversationHistoryItem {
  conversation_id: string;
  profile_key: string;
  started_at: string;
  last_message_at: string | null;
  message_count: number;
}

export interface ConversationHistoryResult {
  conversations: ConversationHistoryItem[];
}

interface ConversationHistoryRow {
  conversation_id: unknown;
  profile_key: unknown;
  started_at: unknown;
  last_message_at: unknown;
  message_count: unknown;
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
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

export async function listConversations(
  client: SqlQueryClient,
  input: ListConversationsInput,
): Promise<ConversationHistoryResult> {
  const limit = input?.limit ?? DEFAULT_LIMIT;
  if (
    input === null ||
    typeof input !== "object" ||
    !isStableKey(input.profile_key) ||
    !Number.isInteger(limit) ||
    limit < MIN_LIMIT ||
    limit > MAX_LIMIT
  ) {
    throw new ConversationHistoryError("invalid_argument");
  }

  const result = await client.query<ConversationHistoryRow>(
    LIST_CONVERSATIONS_QUERY,
    [input.profile_key, limit],
  );

  const conversations = result.rows.map((row) => {
    const startedAt = toRfc3339(row.started_at);
    const lastMessageAt =
      row.last_message_at === null
        ? null
        : toRfc3339(row.last_message_at);
    if (
      !isUuid(row.conversation_id) ||
      !isStableKey(row.profile_key) ||
      row.profile_key !== input.profile_key ||
      startedAt === undefined ||
      lastMessageAt === undefined ||
      !Number.isInteger(row.message_count) ||
      (row.message_count as number) < 0 ||
      ((row.message_count as number) === 0) !== (lastMessageAt === null)
    ) {
      throw new ConversationHistoryError("invalid_database_result");
    }

    return {
      conversation_id: row.conversation_id,
      profile_key: row.profile_key,
      started_at: startedAt,
      last_message_at: lastMessageAt,
      message_count: row.message_count as number,
    };
  });

  return { conversations };
}
