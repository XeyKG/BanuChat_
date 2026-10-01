import assert from "node:assert/strict";
import test from "node:test";

import {
  ConversationHistoryError,
  listConversations,
  type SqlQueryClient,
} from "../src/index.js";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const PROFILE_KEY = "student_001";
const STARTED_AT = "2026-10-01T14:00:00.000Z";
const LAST_MESSAGE_AT = "2026-10-01T14:05:00.000Z";

interface QueryCall {
  text: string;
  parameters: readonly unknown[];
}

class CapturingSqlClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];

  constructor(private readonly rows: readonly unknown[]) {}

  async query<T>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, parameters });
    return { rows: [...this.rows] as T[] };
  }
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    conversation_id: FIRST_ID,
    profile_key: PROFILE_KEY,
    started_at: STARTED_AT,
    last_message_at: null,
    message_count: 0,
    ...overrides,
  };
}

async function assertReason(
  action: () => Promise<unknown>,
  reason: "invalid_argument" | "invalid_database_result",
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof ConversationHistoryError);
    assert.equal(error.reason, reason);
    return true;
  });
}

test("rejects an invalid profile_key before SQL", async () => {
  const client = new CapturingSqlClient([]);
  await assertReason(
    () => listConversations(client, { profile_key: "INVALID" }),
    "invalid_argument",
  );
  assert.equal(client.calls.length, 0);
});

test("uses limit 20 by default", async () => {
  const client = new CapturingSqlClient([]);
  await listConversations(client, { profile_key: PROFILE_KEY });
  assert.deepEqual(client.calls[0]?.parameters, [PROFILE_KEY, 20]);
});

test("accepts limit 1", async () => {
  const client = new CapturingSqlClient([]);
  await listConversations(client, { profile_key: PROFILE_KEY, limit: 1 });
  assert.deepEqual(client.calls[0]?.parameters, [PROFILE_KEY, 1]);
});

test("accepts limit 50", async () => {
  const client = new CapturingSqlClient([]);
  await listConversations(client, { profile_key: PROFILE_KEY, limit: 50 });
  assert.deepEqual(client.calls[0]?.parameters, [PROFILE_KEY, 50]);
});

test("rejects limit 0", async () => {
  const client = new CapturingSqlClient([]);
  await assertReason(
    () => listConversations(client, { profile_key: PROFILE_KEY, limit: 0 }),
    "invalid_argument",
  );
  assert.equal(client.calls.length, 0);
});

test("rejects limit 51", async () => {
  const client = new CapturingSqlClient([]);
  await assertReason(
    () => listConversations(client, { profile_key: PROFILE_KEY, limit: 51 }),
    "invalid_argument",
  );
  assert.equal(client.calls.length, 0);
});

test("returns an empty list for a valid profile without conversations", async () => {
  const result = await listConversations(new CapturingSqlClient([]), {
    profile_key: PROFILE_KEY,
  });
  assert.deepEqual(result, { conversations: [] });
});

test("returns multiple conversations in database order", async () => {
  const result = await listConversations(
    new CapturingSqlClient([
      row({
        conversation_id: SECOND_ID,
        started_at: "2026-10-02T14:00:00.000Z",
        last_message_at: LAST_MESSAGE_AT,
        message_count: 2,
      }),
      row(),
    ]),
    { profile_key: PROFILE_KEY },
  );
  assert.deepEqual(
    result.conversations.map(({ conversation_id }) => conversation_id),
    [SECOND_ID, FIRST_ID],
  );
});

test("orders SQL by started_at DESC and id DESC", async () => {
  const client = new CapturingSqlClient([]);
  await listConversations(client, { profile_key: PROFILE_KEY });
  assert.match(
    client.calls[0]?.text ?? "",
    /ORDER BY c\.started_at DESC, c\.id DESC\s+LIMIT \$2/u,
  );
});

test("preserves a conversation without messages", async () => {
  const result = await listConversations(new CapturingSqlClient([row()]), {
    profile_key: PROFILE_KEY,
  });
  assert.deepEqual(result.conversations[0], {
    conversation_id: FIRST_ID,
    profile_key: PROFILE_KEY,
    started_at: STARTED_AT,
    last_message_at: null,
    message_count: 0,
  });
});

test("returns derived message count and last message timestamp", async () => {
  const result = await listConversations(
    new CapturingSqlClient([
      row({ last_message_at: LAST_MESSAGE_AT, message_count: 4 }),
    ]),
    { profile_key: PROFILE_KEY },
  );
  assert.equal(result.conversations[0]?.message_count, 4);
  assert.equal(result.conversations[0]?.last_message_at, LAST_MESSAGE_AT);
});

test("rejects an invalid conversation UUID", async () => {
  await assertReason(
    () =>
      listConversations(new CapturingSqlClient([row({ conversation_id: "bad" })]), {
        profile_key: PROFILE_KEY,
      }),
    "invalid_database_result",
  );
});

test("rejects an invalid timestamp", async () => {
  await assertReason(
    () =>
      listConversations(new CapturingSqlClient([row({ started_at: "bad" })]), {
        profile_key: PROFILE_KEY,
      }),
    "invalid_database_result",
  );
});

test("rejects an invalid message count", async () => {
  await assertReason(
    () =>
      listConversations(new CapturingSqlClient([row({ message_count: "0" })]), {
        profile_key: PROFILE_KEY,
      }),
    "invalid_database_result",
  );
});

test("rejects count zero with a last message timestamp", async () => {
  await assertReason(
    () =>
      listConversations(
        new CapturingSqlClient([row({ last_message_at: LAST_MESSAGE_AT })]),
        { profile_key: PROFILE_KEY },
      ),
    "invalid_database_result",
  );
});

test("rejects a positive count without a last message timestamp", async () => {
  await assertReason(
    () =>
      listConversations(new CapturingSqlClient([row({ message_count: 1 })]), {
        profile_key: PROFILE_KEY,
      }),
    "invalid_database_result",
  );
});

test("uses one history query without current release or profile lookup", async () => {
  const client = new CapturingSqlClient([]);
  await listConversations(client, { profile_key: PROFILE_KEY });
  assert.equal(client.calls.length, 1);
  const text = client.calls[0]?.text ?? "";
  assert.match(text, /FROM banuchat\.conversations c/u);
  assert.match(text, /LEFT JOIN banuchat\.messages m/u);
  assert.doesNotMatch(text, /current_release|banuchat\.datasets|synthetic_profiles/iu);
});
