import type { SqlQueryClient } from "../data/sql-client.js";
import { resolveCurrentRelease } from "./current-release.js";
import { CreateConversationError } from "./conversations-errors.js";
import { profileRelation, type DemoMode } from "./demo-mode.js";

const DATASET_ID = 1;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const CREATE_CONVERSATION_QUERY = (mode: DemoMode) => `
WITH selected_profile AS (
  SELECT
    sp.dataset_release_id,
    sp.profile_key,
    sp.alias
  FROM ${profileRelation(mode)} sp
  JOIN banuchat.datasets d
    ON d.id = 1
   AND d.current_release_id = sp.dataset_release_id
  WHERE sp.dataset_release_id = $1
    AND sp.profile_key = $2
), inserted_conversation AS (
  INSERT INTO banuchat.conversations (
    dataset_release_id,
    profile_key
  )
  SELECT
    dataset_release_id,
    profile_key
  FROM selected_profile
  RETURNING
    id AS conversation_id,
    dataset_release_id,
    profile_key,
    started_at
)
SELECT
  inserted_conversation.conversation_id,
  inserted_conversation.profile_key,
  selected_profile.alias AS profile_alias,
  inserted_conversation.started_at
FROM inserted_conversation
JOIN selected_profile
  ON selected_profile.dataset_release_id = inserted_conversation.dataset_release_id
 AND selected_profile.profile_key = inserted_conversation.profile_key
`;

const DIAGNOSE_CURRENT_RELEASE_QUERY = `
SELECT current_release_id
FROM banuchat.datasets
WHERE id = $1
`;

export interface CreateConversationInput {
  profile_key: string;
}

export interface CreatedConversation {
  conversation_id: string;
  profile_key: string;
  profile_alias: string;
  created_at: string;
}

interface CreatedConversationRow {
  conversation_id: unknown;
  profile_key: unknown;
  profile_alias: unknown;
  started_at: unknown;
}

interface CurrentReleaseDiagnosticRow {
  current_release_id: unknown;
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isNonblankString(value: unknown): value is string {
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

async function diagnoseMissingInsert(
  client: SqlQueryClient,
  expectedReleaseId: string,
): Promise<never> {
  const result = await client.query<CurrentReleaseDiagnosticRow>(
    DIAGNOSE_CURRENT_RELEASE_QUERY,
    [DATASET_ID],
  );

  if (result.rows.length !== 1) {
    throw new CreateConversationError("invalid_database_result");
  }

  const row = result.rows[0];
  if (row === undefined || !isUuid(row.current_release_id)) {
    throw new CreateConversationError("invalid_database_result");
  }

  if (row.current_release_id !== expectedReleaseId) {
    throw new CreateConversationError("current_release_changed");
  }

  throw new CreateConversationError("profile_not_found");
}

export async function createConversation(
  client: SqlQueryClient,
  input: CreateConversationInput,
  mode: DemoMode = "synthetic",
): Promise<CreatedConversation> {
  if (
    input === null ||
    typeof input !== "object" ||
    !isStableKey(input.profile_key)
  ) {
    throw new CreateConversationError("invalid_argument");
  }

  const release = await resolveCurrentRelease(client);
  const result = await client.query<CreatedConversationRow>(
    CREATE_CONVERSATION_QUERY(mode),
    [release.release_id, input.profile_key],
  );

  if (result.rows.length === 0) {
    return diagnoseMissingInsert(client, release.release_id);
  }

  if (result.rows.length !== 1) {
    throw new CreateConversationError("invalid_database_result");
  }

  const row = result.rows[0];
  const createdAt = row === undefined ? undefined : toRfc3339(row.started_at);
  if (
    row === undefined ||
    !isUuid(row.conversation_id) ||
    !isStableKey(row.profile_key) ||
    row.profile_key !== input.profile_key ||
    !isNonblankString(row.profile_alias) ||
    createdAt === undefined
  ) {
    throw new CreateConversationError("invalid_database_result");
  }

  return {
    conversation_id: row.conversation_id,
    profile_key: row.profile_key,
    profile_alias: row.profile_alias,
    created_at: createdAt,
  };
}
