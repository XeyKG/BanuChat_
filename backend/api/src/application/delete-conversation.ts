import type { SqlQueryClient } from "../data/sql-client.js";
import { DeleteConversationError } from "./delete-conversation-errors.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DELETE_CONVERSATION_QUERY = `
DELETE FROM banuchat.conversations
WHERE id = $1
RETURNING id
`;

export interface DeleteConversationInput {
  conversation_id: string;
}

interface DeletedConversationRow {
  id: unknown;
}

export async function deleteConversation(
  client: SqlQueryClient,
  input: DeleteConversationInput,
): Promise<void> {
  if (
    input === null ||
    typeof input !== "object" ||
    typeof input.conversation_id !== "string" ||
    !UUID_PATTERN.test(input.conversation_id)
  ) {
    throw new DeleteConversationError("invalid_argument");
  }

  const result = await client.query<DeletedConversationRow>(
    DELETE_CONVERSATION_QUERY,
    [input.conversation_id],
  );
  if (result.rows.length === 0) return;

  if (
    result.rows.length !== 1 ||
    result.rows[0]?.id !== input.conversation_id
  ) {
    throw new DeleteConversationError("invalid_database_result");
  }
}
