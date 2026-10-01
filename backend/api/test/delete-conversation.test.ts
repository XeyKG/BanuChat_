import assert from "node:assert/strict";
import test from "node:test";

import {
  DatabaseDependencyError,
  DeleteConversationError,
  deleteConversation,
  type SqlQueryClient,
} from "../src/index.js";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";

class DeleteSqlClient implements SqlQueryClient {
  readonly calls: { text: string; parameters: readonly unknown[] }[] = [];

  constructor(private readonly outcome: readonly unknown[] | Error) {}

  async query<T>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, parameters });
    if (this.outcome instanceof Error) throw this.outcome;
    return { rows: [...this.outcome] as T[] };
  }
}

test("rejects an invalid UUID before SQL", async () => {
  const sql = new DeleteSqlClient([]);
  await assert.rejects(
    () => deleteConversation(sql, { conversation_id: "bad" }),
    (error: unknown) =>
      error instanceof DeleteConversationError &&
      error.reason === "invalid_argument",
  );
  assert.equal(sql.calls.length, 0);
});

test("deletes an existing conversation with one parameterized query", async () => {
  const sql = new DeleteSqlClient([{ id: CONVERSATION_ID }]);
  await deleteConversation(sql, { conversation_id: CONVERSATION_ID });
  assert.equal(sql.calls.length, 1);
  assert.deepEqual(sql.calls[0]?.parameters, [CONVERSATION_ID]);
  assert.match(
    sql.calls[0]?.text ?? "",
    /DELETE FROM banuchat\.conversations\s+WHERE id = \$1\s+RETURNING id/u,
  );
  assert.doesNotMatch(sql.calls[0]?.text ?? "", /messages|message_citations/u);
});

test("treats an absent valid conversation as success", async () => {
  const sql = new DeleteSqlClient([]);
  await deleteConversation(sql, { conversation_id: CONVERSATION_ID });
  assert.equal(sql.calls.length, 1);
});

test("rejects impossible DELETE results", async () => {
  for (const rows of [
    [{ id: "22222222-2222-4222-8222-222222222222" }],
    [{ id: CONVERSATION_ID }, { id: CONVERSATION_ID }],
    [{ id: null }],
  ]) {
    await assert.rejects(
      () =>
        deleteConversation(new DeleteSqlClient(rows), {
          conversation_id: CONVERSATION_ID,
        }),
      (error: unknown) =>
        error instanceof DeleteConversationError &&
        error.reason === "invalid_database_result",
    );
  }
});

test("propagates DatabaseDependencyError", async () => {
  const dependencyError = new DatabaseDependencyError();
  await assert.rejects(
    () =>
      deleteConversation(new DeleteSqlClient(dependencyError), {
        conversation_id: CONVERSATION_ID,
      }),
    (error: unknown) => error === dependencyError,
  );
});
