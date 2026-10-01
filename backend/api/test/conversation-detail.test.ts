import assert from "node:assert/strict";
import test from "node:test";

import {
  ConversationDetailError,
  getConversationDetail,
  type SqlQueryClient,
} from "../src/index.js";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const OPENING_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const ANSWER_RELEASE_ID = "33333333-3333-4333-8333-333333333333";
const USER_MESSAGE_ID = "44444444-4444-4444-8444-444444444444";
const ASSISTANT_MESSAGE_ID = "55555555-5555-4555-8555-555555555555";
const DOCUMENT_VERSION_ID = "66666666-6666-4666-8666-666666666666";
const STARTED_AT = "2026-09-30T14:00:00.000Z";
const USER_AT = "2026-09-30T14:01:00.000Z";
const ASSISTANT_AT = "2026-09-30T14:01:01.000Z";

interface QueryCall {
  text: string;
  parameters: readonly unknown[];
}

class ScriptedSqlClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];

  constructor(private readonly outcomes: readonly (readonly unknown[])[]) {}

  async query<T>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    const outcome = this.outcomes[this.calls.length];
    if (outcome === undefined) throw new Error("unexpected query");
    this.calls.push({ text, parameters });
    return { rows: [...outcome] as T[] };
  }
}

const conversationRow = {
  conversation_id: CONVERSATION_ID,
  dataset_release_id: OPENING_RELEASE_ID,
  profile_key: "student_001",
  started_at: STARTED_AT,
  profile_alias: "Alias histórico",
};

const userRow = {
  message_id: USER_MESSAGE_ID,
  ordinal: 0,
  role: "user",
  content: "Pregunta sintética",
  created_at: USER_AT,
  answer_dataset_release_id: null,
  insufficient_evidence: false,
};

const assistantRow = {
  message_id: ASSISTANT_MESSAGE_ID,
  ordinal: 1,
  role: "assistant",
  content: "Respuesta sintética",
  created_at: ASSISTANT_AT,
  answer_dataset_release_id: ANSWER_RELEASE_ID,
  insufficient_evidence: false,
};

function citationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    message_id: ASSISTANT_MESSAGE_ID,
    message_ordinal: 1,
    citation_index: 0,
    dataset_release_id: ANSWER_RELEASE_ID,
    source_kind: "document",
    source_locator: "document:guide#section",
    document_version_id: DOCUMENT_VERSION_ID,
    metadata_label: "Guía histórica",
    ...overrides,
  };
}

function client(
  messages: readonly unknown[] = [],
  citations: readonly unknown[] = [],
  conversation: readonly unknown[] = [conversationRow],
): ScriptedSqlClient {
  return new ScriptedSqlClient([conversation, messages, citations]);
}

async function assertReason(
  action: () => Promise<unknown>,
  reason:
    | "invalid_argument"
    | "conversation_not_found"
    | "invalid_database_result",
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof ConversationDetailError);
    assert.equal(error.reason, reason);
    return true;
  });
}

test("rejects an invalid UUID before SQL", async () => {
  const sql = new ScriptedSqlClient([]);
  await assertReason(
    () => getConversationDetail(sql, { conversation_id: "bad" }),
    "invalid_argument",
  );
  assert.equal(sql.calls.length, 0);
});

test("reports a missing conversation after one query", async () => {
  const sql = new ScriptedSqlClient([[]]);
  await assertReason(
    () => getConversationDetail(sql, { conversation_id: CONVERSATION_ID }),
    "conversation_not_found",
  );
  assert.equal(sql.calls.length, 1);
});

test("returns the historical opening profile without current release lookup", async () => {
  const sql = client();
  const result = await getConversationDetail(sql, {
    conversation_id: CONVERSATION_ID,
  });
  assert.deepEqual(result.profile, {
    profile_key: "student_001",
    alias: "Alias histórico",
  });
  assert.equal(sql.calls.length, 3);
  assert.match(sql.calls[0]?.text ?? "", /sp\.dataset_release_id = c\.dataset_release_id/u);
  assert.doesNotMatch(
    sql.calls.map(({ text }) => text).join("\n"),
    /current_release|banuchat\.datasets/iu,
  );
});

test("returns an empty message array", async () => {
  const result = await getConversationDetail(client(), {
    conversation_id: CONVERSATION_ID,
  });
  assert.deepEqual(result.messages, []);
});

test("returns a user message without internal fields", async () => {
  const result = await getConversationDetail(client([userRow]), {
    conversation_id: CONVERSATION_ID,
  });
  assert.deepEqual(result.messages, [
    {
      message_id: USER_MESSAGE_ID,
      role: "user",
      content: "Pregunta sintética",
      created_at: USER_AT,
    },
  ]);
});

test("returns an assistant with an empty citations array", async () => {
  const result = await getConversationDetail(client([assistantRow]), {
    conversation_id: CONVERSATION_ID,
  });
  assert.deepEqual(result.messages[0], {
    message_id: ASSISTANT_MESSAGE_ID,
    role: "assistant",
    content: "Respuesta sintética",
    created_at: ASSISTANT_AT,
    insufficient_evidence: false,
    citations: [],
  });
});

test("reconstructs a historical document citation", async () => {
  const result = await getConversationDetail(
    client([assistantRow], [citationRow()]),
    { conversation_id: CONVERSATION_ID },
  );
  assert.deepEqual(result.messages[0], {
    message_id: ASSISTANT_MESSAGE_ID,
    role: "assistant",
    content: "Respuesta sintética",
    created_at: ASSISTANT_AT,
    insufficient_evidence: false,
    citations: [
      {
        index: 0,
        source_kind: "document",
        label: "Documento: Guía histórica",
        locator: "document:guide#section",
        release_id: ANSWER_RELEASE_ID,
        document_version_id: DOCUMENT_VERSION_ID,
        artifact_url: null,
      },
    ],
  });
});

test("reconstructs every structured label with null document and artifact fields", async () => {
  const cases = [
    ["profile", "Perfil: Estudiante histórico"],
    ["profile_course", "Progreso: Curso histórico"],
    ["calendar_event", "Evento: Evento histórico"],
    ["announcement", "Anuncio: Anuncio histórico"],
    ["course", "Curso: Curso histórico"],
  ] as const;

  for (const [sourceKind, expectedLabel] of cases) {
    const result = await getConversationDetail(
      client(
        [assistantRow],
        [
          citationRow({
            source_kind: sourceKind,
            document_version_id: null,
            metadata_label: expectedLabel.split(": ")[1],
          }),
        ],
      ),
      { conversation_id: CONVERSATION_ID },
    );
    const message = result.messages[0];
    assert.equal(message?.role, "assistant");
    if (message?.role !== "assistant") throw new Error("expected assistant");
    assert.deepEqual(message.citations[0], {
      index: 0,
      source_kind: sourceKind,
      label: expectedLabel,
      locator: "document:guide#section",
      release_id: ANSWER_RELEASE_ID,
      document_version_id: null,
      artifact_url: null,
    });
  }
});

test("keeps messages and citations in persisted order and accepts index gaps", async () => {
  const secondAssistant = {
    ...assistantRow,
    message_id: "77777777-7777-4777-8777-777777777777",
    ordinal: 4,
  };
  const result = await getConversationDetail(
    client(
      [userRow, assistantRow, secondAssistant],
      [
        citationRow({ citation_index: 1 }),
        citationRow({ citation_index: 3 }),
        citationRow({
          message_id: secondAssistant.message_id,
          message_ordinal: 4,
          citation_index: 0,
        }),
      ],
    ),
    { conversation_id: CONVERSATION_ID },
  );
  assert.deepEqual(
    result.messages.map(({ message_id }) => message_id),
    [USER_MESSAGE_ID, ASSISTANT_MESSAGE_ID, secondAssistant.message_id],
  );
  const firstAssistant = result.messages[1];
  assert.equal(firstAssistant?.role, "assistant");
  if (firstAssistant?.role !== "assistant") throw new Error("expected assistant");
  assert.deepEqual(firstAssistant.citations.map(({ index }) => index), [1, 3]);
});

test("rejects duplicate citation indices", async () => {
  await assertReason(
    () =>
      getConversationDetail(
        client(
          [assistantRow],
          [citationRow(), citationRow({ metadata_label: "Otro" })],
        ),
        { conversation_id: CONVERSATION_ID },
      ),
    "invalid_database_result",
  );
});

test("rejects a citation attached to a user message", async () => {
  await assertReason(
    () =>
      getConversationDetail(
        client(
          [userRow],
          [citationRow({ message_id: USER_MESSAGE_ID, message_ordinal: 0 })],
        ),
        { conversation_id: CONVERSATION_ID },
      ),
    "invalid_database_result",
  );
});

test("rejects a citation from another answer release", async () => {
  await assertReason(
    () =>
      getConversationDetail(
        client(
          [assistantRow],
          [citationRow({ dataset_release_id: OPENING_RELEASE_ID })],
        ),
        { conversation_id: CONVERSATION_ID },
      ),
    "invalid_database_result",
  );
});

test("rejects missing historical metadata", async () => {
  await assertReason(
    () =>
      getConversationDetail(
        client([assistantRow], [citationRow({ metadata_label: null })]),
        { conversation_id: CONVERSATION_ID },
      ),
    "invalid_database_result",
  );
});

test("rejects an invalid message UUID", async () => {
  await assertReason(
    () =>
      getConversationDetail(client([{ ...userRow, message_id: "bad" }]), {
        conversation_id: CONVERSATION_ID,
      }),
    "invalid_database_result",
  );
});

test("rejects an invalid message timestamp", async () => {
  await assertReason(
    () =>
      getConversationDetail(client([{ ...userRow, created_at: "bad" }]), {
        conversation_id: CONVERSATION_ID,
      }),
    "invalid_database_result",
  );
});

test("rejects an invalid message role", async () => {
  await assertReason(
    () =>
      getConversationDetail(client([{ ...userRow, role: "tool" }]), {
        conversation_id: CONVERSATION_ID,
      }),
    "invalid_database_result",
  );
});

test("rejects invalid user invariants", async () => {
  for (const invalid of [
    { answer_dataset_release_id: ANSWER_RELEASE_ID },
    { insufficient_evidence: true },
  ]) {
    await assertReason(
      () =>
        getConversationDetail(client([{ ...userRow, ...invalid }]), {
          conversation_id: CONVERSATION_ID,
        }),
      "invalid_database_result",
    );
  }
});

test("rejects an assistant without an answer release", async () => {
  await assertReason(
    () =>
      getConversationDetail(
        client([{ ...assistantRow, answer_dataset_release_id: null }]),
        { conversation_id: CONVERSATION_ID },
      ),
    "invalid_database_result",
  );
});

test("uses exactly three fixed queries without N+1", async () => {
  const sql = client([assistantRow], [citationRow()]);
  await getConversationDetail(sql, { conversation_id: CONVERSATION_ID });
  assert.equal(sql.calls.length, 3);
  assert.deepEqual(
    sql.calls.map(({ parameters }) => parameters),
    [[CONVERSATION_ID], [CONVERSATION_ID], [CONVERSATION_ID]],
  );
  assert.match(sql.calls[1]?.text ?? "", /ORDER BY m\.ordinal ASC/u);
  assert.match(
    sql.calls[2]?.text ?? "",
    /ORDER BY m\.ordinal ASC, mc\.citation_index ASC/u,
  );
  assert.match(sql.calls[2]?.text ?? "", /dv\.dataset_release_id = mc\.dataset_release_id/u);
  assert.match(sql.calls[2]?.text ?? "", /course\.dataset_release_id = mc\.dataset_release_id/u);
});
