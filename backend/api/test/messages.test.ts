import assert from "node:assert/strict";
import test from "node:test";

import {
  sendMessage,
  SendMessageError,
  DocumentQueryRetrievalError,
  DocumentRagInvariantError,
  GeneratorClientError,
  type DocumentRagAnswer,
  type DocumentRagResponder,
  type IntentRouter,
  type IntentRoutingDecision,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_RELEASE_ID = "22222222-2222-4222-8222-222222222222";
const EMBEDDING_ID = "33333333-3333-4333-8333-333333333333";
const CONVERSATION_ID = "44444444-4444-4444-8444-444444444444";
const USER_MESSAGE_ID = "55555555-5555-4555-8555-555555555555";
const ASSISTANT_MESSAGE_ID = "66666666-6666-4666-8666-666666666666";
const DOCUMENT_VERSION_ID = "77777777-7777-4777-8777-777777777777";
const CHUNK_ID = "88888888-8888-4888-8888-888888888888";
const HASH = "a".repeat(64);
const NOW = "2026-10-01T09:00:00-05:00";

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

type FakeResponse = readonly unknown[] | Error;

class FakeSqlClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];
  private index = 0;

  constructor(private readonly responses: readonly FakeResponse[]) {}

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    const response = this.responses[this.index++];
    assert.notEqual(response, undefined, "unexpected SQL query");
    if (response instanceof Error) throw response;
    return { rows: response as T[] };
  }
}

function router(decision: IntentRoutingDecision): IntentRouter {
  return {
    catalog_valid: true,
    catalog_version: "test",
    route() {
      return decision;
    },
  };
}

function fallbackRouter(): IntentRouter {
  return router({
    route: "agent_fallback",
    parameters: {},
    response_variant: null,
  });
}

const unexpectedDocumentRag: DocumentRagResponder = async () => {
  throw new Error("unexpected document RAG call");
};

function dependencies(
  sql: SqlQueryClient,
  intentRouter: IntentRouter,
  documentRag: DocumentRagResponder = unexpectedDocumentRag,
) {
  return { sql, router: intentRouter, document_rag: documentRag };
}

function documentAnswer(
  overrides: Partial<DocumentRagAnswer> = {},
): DocumentRagAnswer {
  return {
    release_id: RELEASE_ID,
    content: "Respuesta documental sintética.",
    insufficient_evidence: false,
    citations: [
      {
        index: 0,
        label: "Guía sintética",
        locator: "document:guia#chunk-1",
        release_id: RELEASE_ID,
        artifact_url: null,
        source_kind: "document",
        document_version_id: DOCUMENT_VERSION_ID,
      },
    ],
    citation_records: [
      {
        citation_index: 0,
        dataset_release_id: RELEASE_ID,
        source_path: "documents/guia.md",
        source_locator: "document:guia#chunk-1",
        source_sha256: HASH,
        source_kind: "document",
        document_version_id: DOCUMENT_VERSION_ID,
        chunk_id: CHUNK_ID,
        profile_key: null,
        course_key: null,
        event_key: null,
        announcement_key: null,
      },
    ],
    ...overrides,
  };
}

function contextRows(
  overrides: Record<string, unknown> = {},
): readonly unknown[] {
  return [
    {
      dataset_release_id: RELEASE_ID,
      profile_key: "perfil_demo",
      current_release_id: RELEASE_ID,
      current_release_is_ready: true,
      expected_next_ordinal: 4,
      ...overrides,
    },
  ];
}

function releaseRows(releaseId = RELEASE_ID): readonly unknown[] {
  return [{ release_id: releaseId, embedding_config_id: EMBEDDING_ID }];
}

function persistedRows(
  userContent: string,
  assistantContent: string,
  overrides: Record<string, unknown> = {},
): readonly unknown[] {
  return [
    {
      status: "inserted",
      user_message_id: USER_MESSAGE_ID,
      user_ordinal: 4,
      user_content: userContent,
      user_created_at: "2026-10-01T14:00:01.000Z",
      assistant_message_id: ASSISTANT_MESSAGE_ID,
      assistant_ordinal: 5,
      assistant_content: assistantContent,
      assistant_created_at: "2026-10-01T14:00:01.001Z",
      assistant_insufficient_evidence: false,
      ...overrides,
    },
  ];
}

function expectReason(reason: SendMessageError["reason"]): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof SendMessageError && error.reason === reason;
}

test("rechaza UUID y contenido inválidos antes de consultar SQL", async () => {
  for (const input of [
    { conversation_id: "not-a-uuid", content: "hola", now: NOW },
    { conversation_id: CONVERSATION_ID, content: "", now: NOW },
    { conversation_id: CONVERSATION_ID, content: " \n\t", now: NOW },
    { conversation_id: CONVERSATION_ID, content: "😀".repeat(4001), now: NOW },
  ]) {
    const sql = new FakeSqlClient([]);
    await assert.rejects(
      sendMessage(
        dependencies(
          sql,
          router({
            route: "agent_fallback",
            parameters: {},
            response_variant: null,
          }),
        ),
        input,
      ),
      expectReason("invalid_argument"),
    );
    assert.equal(sql.calls.length, 0);
  }
});

test("reporta conversación ausente", async () => {
  const sql = new FakeSqlClient([[]]);
  await assert.rejects(
    sendMessage(
      dependencies(
        sql,
        router({
          route: "agent_fallback",
          parameters: {},
          response_variant: null,
        }),
      ),
      { conversation_id: CONVERSATION_ID, content: "hola", now: NOW },
    ),
    expectReason("conversation_not_found"),
  );
});

test("rechaza una conversación cuya release ya no es la vigente ready", async () => {
  const sql = new FakeSqlClient([
    contextRows({ current_release_id: OTHER_RELEASE_ID }),
  ]);
  await assert.rejects(
    sendMessage(
      dependencies(
        sql,
        router({
          route: "agent_fallback",
          parameters: {},
          response_variant: null,
        }),
      ),
      { conversation_id: CONVERSATION_ID, content: "hola", now: NOW },
    ),
    expectReason("current_release_changed"),
  );
  assert.equal(sql.calls.length, 1);
});

test("profile_progress persiste procedencia exacta y solo expone citas públicas", async () => {
  const content = "  mi progreso  ";
  const assistantContent =
    "Progreso registrado para Ada:\n- Curso A: 100 % (completado).";
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [
      {
        profile_key: "perfil_demo",
        alias: "Ada",
        source_path: "profiles/ada/profile.json",
        source_locator: "profile:perfil_demo",
        source_sha256: HASH,
      },
    ],
    [
      {
        course_key: "curso_a",
        course_name: "Curso A",
        status: "completed",
        progress_percent: 100,
        started_at: "2026-01-01T09:00:00-05:00",
        completed_at: "2026-02-01T09:00:00-05:00",
        source_path: "profiles/ada/progress.json",
        source_locator: "profile_course:perfil_demo:curso_a",
        source_sha256: HASH,
      },
    ],
    persistedRows(content, assistantContent),
  ]);

  const result = await sendMessage(
    dependencies(
      sql,
      router({
        route: "profile_progress",
        parameters: {},
        response_variant: null,
      }),
    ),
    { conversation_id: CONVERSATION_ID, content, now: NOW },
  );

  assert.equal(result.user_message.content, content);
  assert.deepEqual(Object.keys(result).sort(), [
    "assistant_message",
    "conversation_id",
    "user_message",
  ]);
  assert.equal("citation_records" in result.assistant_message, false);
  assert.deepEqual(result.assistant_message.citations.map((item) => item.index), [0, 1]);

  const persistenceCall = sql.calls[4];
  assert.deepEqual(persistenceCall?.values?.slice(0, 6), [
    CONVERSATION_ID,
    RELEASE_ID,
    4,
    content,
    assistantContent,
    false,
  ]);
  const records = JSON.parse(String(persistenceCall?.values?.[6])) as Array<Record<string, unknown>>;
  assert.deepEqual(records, [
    {
      citation_index: 0,
      dataset_release_id: RELEASE_ID,
      source_path: "profiles/ada/profile.json",
      source_locator: "profile:perfil_demo",
      source_sha256: HASH,
      document_version_id: null,
      chunk_id: null,
      source_kind: "profile",
      profile_key: "perfil_demo",
      course_key: null,
      event_key: null,
      announcement_key: null,
    },
    {
      citation_index: 1,
      dataset_release_id: RELEASE_ID,
      source_path: "profiles/ada/progress.json",
      source_locator: "profile_course:perfil_demo:curso_a",
      source_sha256: HASH,
      document_version_id: null,
      chunk_id: null,
      source_kind: "profile_course",
      profile_key: "perfil_demo",
      course_key: "curso_a",
      event_key: null,
      announcement_key: null,
    },
  ]);
  assert.match(persistenceCall?.text ?? "", /FOR UPDATE/);
  assert.match(persistenceCall?.text ?? "", /os\.next_ordinal\s*=\s*\$3/);
  assert.match(persistenceCall?.text ?? "", /\$3 \+ 1, 'assistant'/);
});

test("calendar_events persiste event_key", async () => {
  const assistantContent =
    "Encontré estos eventos:\n- 2026-10-01T14:00:00-05:00 — Sesión A";
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [
      {
        event_key: "evento_a",
        title: "Sesión A",
        description: "Descripción",
        event_type: "general",
        starts_at: "2026-10-01T14:00:00-05:00",
        ends_at: null,
        course_key: null,
        announcement_key: null,
        source_path: "calendar/events.json",
        source_locator: "calendar_event:evento_a",
        source_sha256: HASH,
      },
    ],
    persistedRows("eventos de hoy", assistantContent),
  ]);

  await sendMessage(
    dependencies(
      sql,
      router({
        route: "calendar_events",
        parameters: {
          date_from: "2026-10-01",
          date_to: "2026-10-01",
        },
        response_variant: null,
      }),
    ),
    { conversation_id: CONVERSATION_ID, content: "eventos de hoy", now: NOW },
  );

  const records = JSON.parse(String(sql.calls[3]?.values?.[6])) as Array<Record<string, unknown>>;
  assert.equal(records[0]?.source_kind, "calendar_event");
  assert.equal(records[0]?.event_key, "evento_a");
  assert.equal(records[0]?.source_path, "calendar/events.json");
  assert.equal(records[0]?.source_sha256, HASH);
});

test("announcements persiste announcement_key", async () => {
  const assistantContent = "Encontré estos anuncios:\n- Anuncio A — activo";
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [
      {
        announcement_key: "anuncio_a",
        title: "Anuncio A",
        description: "Descripción",
        valid_from: "2026-09-01T00:00:00-05:00",
        valid_until: "2026-10-31T23:59:59-05:00",
        source_path: "announcements/items.json",
        source_locator: "announcement:anuncio_a",
        source_sha256: HASH,
      },
    ],
    persistedRows("anuncios", assistantContent),
  ]);

  await sendMessage(
    dependencies(
      sql,
      router({
        route: "announcements",
        parameters: { reference_time: NOW },
        response_variant: null,
      }),
    ),
    { conversation_id: CONVERSATION_ID, content: "anuncios", now: NOW },
  );

  const records = JSON.parse(String(sql.calls[3]?.values?.[6])) as Array<Record<string, unknown>>;
  assert.equal(records[0]?.source_kind, "announcement");
  assert.equal(records[0]?.announcement_key, "anuncio_a");
  assert.equal(records[0]?.source_path, "announcements/items.json");
  assert.equal(records[0]?.source_sha256, HASH);
});

test("fast path no llama document_rag", async () => {
  let ragCalls = 0;
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [],
    persistedRows(
      "eventos",
      "No encontré eventos que comiencen dentro del rango consultado.",
    ),
  ]);

  await sendMessage(
    dependencies(
      sql,
      router({
        route: "calendar_events",
        parameters: { date_from: "2026-10-01", date_to: "2026-10-01" },
        response_variant: null,
      }),
      async () => {
        ragCalls += 1;
        return documentAnswer();
      },
    ),
    { conversation_id: CONVERSATION_ID, content: "eventos", now: NOW },
  );

  assert.equal(ragCalls, 0);
});

test("agent_fallback usa la release y query exactas y persiste citas documentales", async () => {
  const content = "  consulta documental exacta  ";
  const answer = documentAnswer();
  const calls: unknown[] = [];
  const sql = new FakeSqlClient([
    contextRows(),
    persistedRows(content, answer.content),
  ]);

  const result = await sendMessage(
    dependencies(sql, fallbackRouter(), async (input) => {
      calls.push(input);
      return answer;
    }),
    { conversation_id: CONVERSATION_ID, content, now: NOW },
  );

  assert.deepEqual(calls, [{ release_id: RELEASE_ID, query: content }]);
  assert.deepEqual(
    JSON.parse(String(sql.calls[1]?.values?.[6])),
    answer.citation_records,
  );
  assert.equal("citation_records" in result.assistant_message, false);
  assert.deepEqual(result.assistant_message.citations, answer.citations);
  assert.deepEqual(result.assistant_message.citations[0], {
    index: 0,
    label: "Guía sintética",
    locator: "document:guia#chunk-1",
    release_id: RELEASE_ID,
    artifact_url: null,
    source_kind: "document",
    document_version_id: DOCUMENT_VERSION_ID,
  });
});

test("insufficient evidence se persiste como respuesta válida sin citas", async () => {
  const answer = documentAnswer({
    content: "No encontré evidencia suficiente.",
    insufficient_evidence: true,
    citations: [],
    citation_records: [],
  });
  const sql = new FakeSqlClient([
    contextRows(),
    persistedRows("consulta", answer.content, {
      assistant_insufficient_evidence: true,
    }),
  ]);

  const result = await sendMessage(
    dependencies(sql, fallbackRouter(), async () => answer),
    { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
  );

  assert.equal(sql.calls[1]?.values?.[5], true);
  assert.equal(sql.calls[1]?.values?.[6], "[]");
  assert.equal(result.assistant_message.insufficient_evidence, true);
  assert.deepEqual(result.assistant_message.citations, []);
});

test("agent_fallback rechaza otra release sin persistir", async () => {
  const sql = new FakeSqlClient([contextRows()]);
  await assert.rejects(
    sendMessage(
      dependencies(sql, fallbackRouter(), async () =>
        documentAnswer({ release_id: OTHER_RELEASE_ID }),
      ),
      { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
    ),
    expectReason("current_release_changed"),
  );
  assert.equal(sql.calls.length, 1);
});

test("errores de generación se convierten en rag_dependency_unavailable", async () => {
  for (const reason of [
    "generator_runtime_mismatch",
    "generator_unavailable",
    "invalid_generator_response",
    "generator_response_incomplete",
  ] as const) {
    const sql = new FakeSqlClient([contextRows()]);
    await assert.rejects(
      sendMessage(
        dependencies(sql, fallbackRouter(), async () => {
          throw new GeneratorClientError(reason);
        }),
        { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
      ),
      expectReason("rag_dependency_unavailable"),
    );
  }
});

test("errores de embedding se convierten en rag_dependency_unavailable", async () => {
  for (const reason of [
    "embedding_runtime_mismatch",
    "embedding_unavailable",
    "invalid_embedding_response",
  ] as const) {
    const sql = new FakeSqlClient([contextRows()]);
    await assert.rejects(
      sendMessage(
        dependencies(sql, fallbackRouter(), async () => {
          throw new DocumentQueryRetrievalError(reason);
        }),
        { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
      ),
      expectReason("rag_dependency_unavailable"),
    );
  }
});

test("release_not_available se convierte en current_release_changed", async () => {
  const sql = new FakeSqlClient([contextRows()]);
  await assert.rejects(
    sendMessage(
      dependencies(sql, fallbackRouter(), async () => {
        throw new DocumentQueryRetrievalError("release_not_available");
      }),
      { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
    ),
    expectReason("current_release_changed"),
  );
});

test("errores RAG internos se convierten en invalid_database_result", async () => {
  for (const error of [
    new DocumentQueryRetrievalError("invalid_argument"),
    new DocumentQueryRetrievalError("invalid_database_result"),
    new DocumentRagInvariantError(),
  ]) {
    const sql = new FakeSqlClient([contextRows()]);
    await assert.rejects(
      sendMessage(
        dependencies(sql, fallbackRouter(), async () => {
          throw error;
        }),
        { conversation_id: CONVERSATION_ID, content: "consulta", now: NOW },
      ),
      expectReason("invalid_database_result"),
    );
  }
});

test("rechaza una respuesta generada con otra release sin persistir", async () => {
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(OTHER_RELEASE_ID),
    [],
  ]);
  await assert.rejects(
    sendMessage(
      dependencies(
        sql,
        router({
          route: "calendar_events",
          parameters: {
            date_from: "2026-10-01",
            date_to: "2026-10-01",
          },
          response_variant: null,
        }),
      ),
      { conversation_id: CONVERSATION_ID, content: "eventos", now: NOW },
    ),
    expectReason("current_release_changed"),
  );
  assert.equal(sql.calls.length, 3);
});

test("un cambio de ordinal en la sentencia final produce conversation_conflict", async () => {
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [],
    [
      {
        status: "conversation_conflict",
        user_message_id: null,
        user_ordinal: null,
        user_content: null,
        user_created_at: null,
        assistant_message_id: null,
        assistant_ordinal: null,
        assistant_content: null,
        assistant_created_at: null,
        assistant_insufficient_evidence: null,
      },
    ],
  ]);
  await assert.rejects(
    sendMessage(
      dependencies(
        sql,
        router({
          route: "calendar_events",
          parameters: {
            date_from: "2026-10-01",
            date_to: "2026-10-01",
          },
          response_variant: null,
        }),
      ),
      { conversation_id: CONVERSATION_ID, content: "eventos", now: NOW },
    ),
    expectReason("conversation_conflict"),
  );
});

test("una respuesta válida sin elementos permite cero citas", async () => {
  const assistantContent =
    "No encontré eventos que comiencen dentro del rango consultado.";
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [],
    persistedRows("eventos", assistantContent),
  ]);

  const result = await sendMessage(
    dependencies(
      sql,
      router({
        route: "calendar_events",
        parameters: {
          date_from: "2026-10-01",
          date_to: "2026-10-01",
        },
        response_variant: null,
      }),
    ),
    { conversation_id: CONVERSATION_ID, content: "eventos", now: NOW },
  );

  assert.deepEqual(result.assistant_message.citations, []);
  assert.equal(sql.calls[3]?.values?.[6], "[]");
});

test("una violación UNIQUE residual se tipa como conversation_conflict", async () => {
  const uniqueError = Object.assign(new Error("duplicate"), { code: "23505" });
  const sql = new FakeSqlClient([
    contextRows(),
    releaseRows(),
    [],
    uniqueError,
  ]);
  await assert.rejects(
    sendMessage(
      dependencies(
        sql,
        router({
          route: "calendar_events",
          parameters: {
            date_from: "2026-10-01",
            date_to: "2026-10-01",
          },
          response_variant: null,
        }),
      ),
      { conversation_id: CONVERSATION_ID, content: "eventos", now: NOW },
    ),
    expectReason("conversation_conflict"),
  );
});

test("SendMessageError serializa solo nombre y motivo", () => {
  assert.deepEqual(new SendMessageError("conversation_conflict").toJSON(), {
    name: "SendMessageError",
    reason: "conversation_conflict",
  });
});
