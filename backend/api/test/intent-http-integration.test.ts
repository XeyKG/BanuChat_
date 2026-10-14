import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createRuntimeApiServer,
  loadDefaultIntentRouter,
  type DocumentRagAnswer,
  type DocumentRagResponder,
  type SendMessageResult,
  type SqlQueryClient,
  type IntentRouter,
  type IntentRoutingDecision,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";
const EMBEDDING_CONFIG_ID = "44444444-4444-4444-8444-444444444444";
const USER_MESSAGE_ID = "55555555-5555-4555-8555-555555555555";
const ASSISTANT_MESSAGE_ID = "66666666-6666-4666-8666-666666666666";
const DOCUMENT_VERSION_ID = "77777777-7777-4777-8777-777777777777";
const CHUNK_ID = "88888888-8888-4888-8888-888888888888";
const SHA256 = "a".repeat(64);
const PROFILE_KEY = "perfil_demo";
const FAST_PATH_PROMPT = "mi progreso";
const LEXICAL_FAST_PATH_PROMPT = "¿Cuál es mi progreso?";
const M6_1_2_FAST_PATH_PROMPT = "Quiero consultar mi progreso";
const GREETING_PROMPT = "hola";
const GREETING_CONTENT =
  "Hola, soy Banu. Puedo ayudarte a consultar tu progreso, revisar eventos y anuncios, y responder preguntas basadas en el material disponible. ¿Qué quieres consultar?";
const RAG_PROMPT = "¿Qué información debo incluir al reportar una incidencia?";
const RAG_CONTENT = "Respuesta documental sintética de integración.";

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

interface QueryStep {
  query: RegExp;
  rows: readonly unknown[] | ((values: readonly unknown[] | undefined) => readonly unknown[]);
}

class ScriptedSqlClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];
  private next = 0;

  constructor(private readonly steps: readonly QueryStep[]) {}

  async query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }> {
    const step = this.steps[this.next++];
    assert.ok(step, "unexpected SQL query");
    assert.match(text, step.query, "SQL query appeared out of sequence");
    this.calls.push({ text, values });
    const rows = typeof step.rows === "function" ? step.rows(values) : step.rows;
    return { rows: [...rows] as T[] };
  }

  assertComplete(): void {
    assert.equal(this.next, this.steps.length, "expected all SQL steps to run");
  }
}

function persistenceStep(): QueryStep {
  return {
    query: /INSERT INTO banuchat\.messages/u,
    rows: (values) => {
      assert.ok(values, "persistence must receive SQL values");
      return [{
        status: "inserted",
        user_message_id: USER_MESSAGE_ID,
        user_ordinal: values[2],
        user_content: values[3],
        user_created_at: "2026-10-01T14:00:01.000Z",
        assistant_message_id: ASSISTANT_MESSAGE_ID,
        assistant_ordinal: Number(values[2]) + 1,
        assistant_content: values[4],
        assistant_created_at: "2026-10-01T14:00:01.001Z",
        assistant_insufficient_evidence: values[5],
      }];
    },
  };
}

function conversationStep(): QueryStep {
  return {
    query: /FROM banuchat\.conversations c/u,
    rows: [{
      dataset_release_id: RELEASE_ID,
      profile_key: PROFILE_KEY,
      current_release_id: RELEASE_ID,
      current_release_is_ready: true,
      expected_next_ordinal: 0,
    }],
  };
}

function persistenceCall(sql: ScriptedSqlClient): QueryCall {
  const calls = sql.calls.filter(({ text }) => /INSERT INTO banuchat\.messages/u.test(text));
  assert.equal(calls.length, 1, "one turn must be persisted");
  return calls[0]!;
}

function citationRecords(call: QueryCall): Array<Record<string, unknown>> {
  assert.ok(call.values);
  const records: unknown = JSON.parse(String(call.values[6]));
  assert.ok(Array.isArray(records));
  return records as Array<Record<string, unknown>>;
}

async function withRuntimeServer(
  sql: ScriptedSqlClient,
  documentRag: DocumentRagResponder,
  action: (baseUrl: string) => Promise<void>,
  loadRouter: () => Promise<IntentRouter> = loadDefaultIntentRouter,
): Promise<void> {
  const server = await createRuntimeApiServer(sql, documentRag, loadRouter);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address() as AddressInfo;
    await action(`http://127.0.0.1:${address.port}`);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error === undefined ? resolve() : reject(error));
      });
    }
  }
}

async function postMessage(baseUrl: string, content: string): Promise<SendMessageResult> {
  const response = await fetch(
    `${baseUrl}/api/v1/conversations/${CONVERSATION_ID}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  const body = await response.text();
  assert.equal(response.status, 201, body);
  return JSON.parse(body) as SendMessageResult;
}

async function assertProgressFastPath(prompt: string): Promise<void> {
  const sql = new ScriptedSqlClient([
    conversationStep(),
    {
      query: /JOIN banuchat\.dataset_releases/u,
      rows: [{ release_id: RELEASE_ID, embedding_config_id: EMBEDDING_CONFIG_ID }],
    },
    {
      query: /FROM banuchat\.synthetic_profiles/u,
      rows: [{
        profile_key: PROFILE_KEY,
        alias: "Perfil Integración",
        source_path: "profiles/integration/profile.json",
        source_locator: `profile:${PROFILE_KEY}`,
        source_sha256: SHA256,
      }],
    },
    {
      query: /FROM banuchat\.profile_courses/u,
      rows: [{
        course_key: "curso_integracion",
        course_name: "Curso Integración",
        status: "completed",
        progress_percent: 100,
        started_at: "2026-01-01T09:00:00-05:00",
        completed_at: "2026-02-01T09:00:00-05:00",
        source_path: "profiles/integration/progress.json",
        source_locator: `profile_course:${PROFILE_KEY}:curso_integracion`,
        source_sha256: SHA256,
      }],
    },
    persistenceStep(),
  ]);
  let documentRagCalls = 0;
  const documentRag: DocumentRagResponder = async () => {
    documentRagCalls++;
    throw new Error("Document RAG must not run on the progress fast path");
  };

  await withRuntimeServer(sql, documentRag, async (baseUrl) => {
    const result = await postMessage(baseUrl, prompt);
    assert.equal(result.conversation_id, CONVERSATION_ID);
    assert.equal(result.user_message.role, "user");
    assert.equal(result.user_message.content, prompt);
    assert.equal(result.assistant_message.role, "assistant");
    assert.ok(result.assistant_message.content.length > 0);
    assert.equal(result.assistant_message.insufficient_evidence, false);
    assert.ok(Array.isArray(result.assistant_message.citations));
    assert.ok(result.assistant_message.citations.some((item) => item.source_kind === "profile"));
    assert.ok(result.assistant_message.citations.some((item) => item.source_kind === "profile_course"));
    assert.equal(documentRagCalls, 0);

    const call = persistenceCall(sql);
    assert.equal(call.values?.[0], CONVERSATION_ID);
    assert.equal(call.values?.[3], prompt);
    assert.equal(call.values?.[4], result.assistant_message.content);
    assert.equal(call.values?.[5], false);
    const records = citationRecords(call);
    assert.deepEqual(records.map((record) => record.source_kind), ["profile", "profile_course"]);
    assert.ok(records.every((record) => record.source_path && record.source_sha256 === SHA256));
    const publicBody = JSON.stringify(result);
    for (const internal of ["source_path", "source_sha256", "citation_records"]) {
      assert.equal(publicBody.includes(internal), false);
    }
    sql.assertComplete();
  });
}

test("J2.1 real catalog routes HTTP progress to fast path and persists provenance", async () => {
  await assertProgressFastPath(FAST_PATH_PROMPT);
});

test("M3.1 lexical progress uses the real HTTP fast path and preserves the original text", async () => {
  await assertProgressFastPath(LEXICAL_FAST_PATH_PROMPT);
});

test("M6.1.2 spontaneous progress phrasing uses the real HTTP fast path", async () => {
  await assertProgressFastPath(M6_1_2_FAST_PATH_PROMPT);
});

test("M6.1.1 real catalog renders HTTP greeting without Document RAG", async () => {
  const sql = new ScriptedSqlClient([conversationStep(), persistenceStep()]);
  let documentRagCalls = 0;
  const documentRag: DocumentRagResponder = async () => {
    documentRagCalls++;
    throw new Error("Document RAG must not run for a static greeting");
  };

  await withRuntimeServer(sql, documentRag, async (baseUrl) => {
    const result = await postMessage(baseUrl, GREETING_PROMPT);
    assert.equal(result.conversation_id, CONVERSATION_ID);
    assert.equal(result.user_message.content, GREETING_PROMPT);
    assert.equal(result.assistant_message.content, GREETING_CONTENT);
    assert.equal(result.assistant_message.insufficient_evidence, false);
    assert.deepEqual(result.assistant_message.citations, []);
    assert.equal(documentRagCalls, 0);

    const call = persistenceCall(sql);
    assert.equal(call.values?.[0], CONVERSATION_ID);
    assert.equal(call.values?.[1], RELEASE_ID);
    assert.equal(call.values?.[3], GREETING_PROMPT);
    assert.equal(call.values?.[4], GREETING_CONTENT);
    assert.equal(call.values?.[5], false);
    assert.deepEqual(citationRecords(call), []);
    sql.assertComplete();
  });
});

for (const [prompt, statuses] of [
  ["¿Qué cursos hay?", undefined],
  ["¿Qué cursos están disponibles?", ["available"]],
] as const) {
  test(`M8.1 HTTP course_catalog: ${prompt}`, async () => {
    const courseRows = [
      { course_key: "course_a", name: "Curso A", description: "Descripción A", status: "available",
        source_path: "courses/catalog.json", source_locator: "course:course_a", source_sha256: SHA256 },
      { course_key: "course_b", name: "Curso B", description: "Descripción B", status: "closed",
        source_path: "courses/catalog.json", source_locator: "course:course_b", source_sha256: SHA256 },
    ];
    const expectedRows = statuses === undefined ? courseRows : [courseRows[0]!];
    let persistedContent = "";
    let persistedRecords: Array<Record<string, unknown>> = [];
    const sql = new ScriptedSqlClient([
      conversationStep(),
      { query: /JOIN banuchat\.dataset_releases/u,
        rows: [{ release_id: RELEASE_ID, embedding_config_id: EMBEDDING_CONFIG_ID }] },
      { query: /FROM banuchat\.courses/u, rows: (values) => {
        assert.deepEqual(values, statuses === undefined
          ? [RELEASE_ID, 20] : [RELEASE_ID, ["available"], 20]);
        return expectedRows;
      } },
      { query: /INSERT INTO banuchat\.messages/u, rows: (values) => {
        assert.ok(values);
        persistedContent = String(values[4]);
        persistedRecords = JSON.parse(String(values[6])) as Array<Record<string, unknown>>;
        const step = persistenceStep();
        assert.equal(typeof step.rows, "function");
        return typeof step.rows === "function" ? step.rows(values) : step.rows;
      } },
      { query: /FROM banuchat\.conversations c/u, rows: [{
        conversation_id: CONVERSATION_ID, dataset_release_id: RELEASE_ID,
        profile_key: PROFILE_KEY, profile_alias: "Perfil Integración",
        started_at: "2026-10-01T14:00:00.000Z",
      }] },
      { query: /FROM banuchat\.messages m/u, rows: () => [
        { message_id: USER_MESSAGE_ID, ordinal: 0, role: "user", content: prompt,
          created_at: "2026-10-01T14:00:01.000Z", answer_dataset_release_id: null, insufficient_evidence: false },
        { message_id: ASSISTANT_MESSAGE_ID, ordinal: 1, role: "assistant", content: persistedContent,
          created_at: "2026-10-01T14:00:01.001Z", answer_dataset_release_id: RELEASE_ID, insufficient_evidence: false },
      ] },
      { query: /FROM banuchat\.message_citations mc/u, rows: () => persistedRecords.map((record) => {
        const course = courseRows.find((row) => row.course_key === record.course_key);
        assert.ok(course);
        return {
          message_id: ASSISTANT_MESSAGE_ID, message_ordinal: 1,
          citation_index: record.citation_index, dataset_release_id: record.dataset_release_id,
          source_kind: record.source_kind, source_locator: record.source_locator,
          document_version_id: record.document_version_id, metadata_label: course.name,
        };
      }) },
    ]);
    const decisions: IntentRoutingDecision[] = [];
    const loadRouter = async (): Promise<IntentRouter> => {
      const realRouter = await loadDefaultIntentRouter();
      return {
        catalog_valid: realRouter.catalog_valid, catalog_version: realRouter.catalog_version,
        route(input) {
          const decision = realRouter.route(input);
          decisions.push(decision);
          return decision;
        },
      };
    };
    let ragCalls = 0;
    await withRuntimeServer(sql, async () => {
      ragCalls++;
      throw new Error("Document RAG must not run for course_catalog");
    }, async (baseUrl) => {
      const result = await postMessage(baseUrl, prompt);
      assert.equal(decisions.length, 1);
      assert.equal(decisions[0]?.route, "course_catalog");
      assert.deepEqual(decisions[0]?.parameters.statuses, statuses);
      assert.equal(ragCalls, 0);
      assert.equal(result.assistant_message.insufficient_evidence, false);
      assert.equal(result.assistant_message.citations.length, expectedRows.length);
      assert.match(result.assistant_message.content, /Curso A — disponible/u);
      if (statuses !== undefined) assert.doesNotMatch(result.assistant_message.content, /Curso B/u);
      for (const [index, course] of expectedRows.entries()) {
        assert.deepEqual(result.assistant_message.citations[index], {
          index, source_kind: "course", label: `Curso: ${course.name}`,
          locator: course.source_locator, release_id: RELEASE_ID,
          document_version_id: null, artifact_url: null,
        });
        assert.deepEqual(persistedRecords[index], {
          citation_index: index, source_kind: "course", course_key: course.course_key,
          dataset_release_id: RELEASE_ID, source_path: course.source_path,
          source_locator: course.source_locator, source_sha256: SHA256,
          document_version_id: null, chunk_id: null, profile_key: null,
          event_key: null, announcement_key: null,
        });
      }
      const query = sql.calls[2]!.text;
      assert.doesNotMatch(query, /profile_courses/u);
      if (statuses !== undefined) assert.match(query, /status = ANY\(\$2::text\[\]\)/u);
      else assert.doesNotMatch(query, /ANY/u);
      assert.doesNotMatch(JSON.stringify(result), /"route"|source_path|source_sha256|citation_records/u);

      const response = await fetch(`${baseUrl}/api/v1/conversations/${CONVERSATION_ID}`);
      assert.equal(response.status, 200);
      const detail = await response.json() as { messages: SendMessageResult["assistant_message"][] };
      assert.deepEqual(detail.messages[1]?.citations, result.assistant_message.citations);
      assert.equal(detail.messages[1]?.content, result.assistant_message.content);
      sql.assertComplete();
    }, loadRouter);
  });
}

for (const [prompt, title, retrievalMode] of [
  [
    "Muéstrame la guía integradora completa",
    "Guía completa de actividad integradora",
    "full_document",
  ],
  [
    "Localiza el material sobre soporte",
    "Soporte y reporte de incidencias",
    "chunked",
  ],
] as const) {
  test(`M8.2 HTTP document_lookup: ${prompt}`, async () => {
    let persistedContent = "";
    let persistedRecords: Array<Record<string, unknown>> = [];
    const documentRow = {
      document_key: retrievalMode === "full_document" ? "integration-guide" : "support-guide",
      retrieval_mode: retrievalMode,
      document_version_id: DOCUMENT_VERSION_ID,
      title,
      mime_type: "text/markdown",
      source_path: `documents/${retrievalMode}-guide.md`,
      source_locator: `document:${retrievalMode}-guide`,
      source_sha256: SHA256,
    };
    const sql = new ScriptedSqlClient([
      conversationStep(),
      {
        query: /JOIN banuchat\.dataset_releases/u,
        rows: [{ release_id: RELEASE_ID, embedding_config_id: EMBEDDING_CONFIG_ID }],
      },
      {
        query: /FROM banuchat\.document_versions dv/u,
        rows: (values) => {
          assert.deepEqual(
            values,
            retrievalMode === "full_document"
              ? [RELEASE_ID, title, "full_document", 10]
              : [RELEASE_ID, title, 10],
          );
          return [documentRow];
        },
      },
      {
        query: /INSERT INTO banuchat\.messages/u,
        rows: (values) => {
          assert.ok(values);
          persistedContent = String(values[4]);
          persistedRecords = JSON.parse(String(values[6])) as Array<Record<string, unknown>>;
          const step = persistenceStep();
          assert.equal(typeof step.rows, "function");
          return typeof step.rows === "function" ? step.rows(values) : step.rows;
        },
      },
      {
        query: /FROM banuchat\.conversations c/u,
        rows: [{
          conversation_id: CONVERSATION_ID,
          dataset_release_id: RELEASE_ID,
          profile_key: PROFILE_KEY,
          profile_alias: "Perfil Integración",
          started_at: "2026-10-01T14:00:00.000Z",
        }],
      },
      {
        query: /FROM banuchat\.messages m/u,
        rows: () => [
          {
            message_id: USER_MESSAGE_ID,
            ordinal: 0,
            role: "user",
            content: prompt,
            created_at: "2026-10-01T14:00:01.000Z",
            answer_dataset_release_id: null,
            insufficient_evidence: false,
          },
          {
            message_id: ASSISTANT_MESSAGE_ID,
            ordinal: 1,
            role: "assistant",
            content: persistedContent,
            created_at: "2026-10-01T14:00:01.001Z",
            answer_dataset_release_id: RELEASE_ID,
            insufficient_evidence: false,
          },
        ],
      },
      {
        query: /FROM banuchat\.message_citations mc/u,
        rows: () => [{
          message_id: ASSISTANT_MESSAGE_ID,
          message_ordinal: 1,
          citation_index: 0,
          dataset_release_id: RELEASE_ID,
          source_kind: "document",
          source_locator: documentRow.source_locator,
          document_version_id: DOCUMENT_VERSION_ID,
          metadata_label: title,
        }],
      },
    ]);
    const decisions: IntentRoutingDecision[] = [];
    const loadRouter = async (): Promise<IntentRouter> => {
      const realRouter = await loadDefaultIntentRouter();
      return {
        catalog_valid: realRouter.catalog_valid,
        catalog_version: realRouter.catalog_version,
        route(input) {
          const decision = realRouter.route(input);
          decisions.push(decision);
          return decision;
        },
      };
    };
    let ragCalls = 0;

    await withRuntimeServer(
      sql,
      async () => {
        ragCalls += 1;
        throw new Error("Document RAG must not run for document_lookup");
      },
      async (baseUrl) => {
        const result = await postMessage(baseUrl, prompt);
        assert.equal(decisions[0]?.route, "document_lookup");
        assert.equal(decisions[0]?.parameters.query, title);
        assert.equal(ragCalls, 0);
        assert.deepEqual(result.assistant_message.citations, [{
          index: 0,
          source_kind: "document",
          label: `Documento: ${title}`,
          locator: documentRow.source_locator,
          release_id: RELEASE_ID,
          document_version_id: DOCUMENT_VERSION_ID,
          artifact_url: `/api/v1/documents/${DOCUMENT_VERSION_ID}/artifact`,
        }]);
        assert.equal(persistedRecords[0]?.chunk_id, null);
        assert.equal(persistedRecords[0]?.document_version_id, DOCUMENT_VERSION_ID);
        assert.doesNotMatch(JSON.stringify(result), /"route"|source_path|source_sha256|citation_records/u);

        const response = await fetch(`${baseUrl}/api/v1/conversations/${CONVERSATION_ID}`);
        assert.equal(response.status, 200);
        const detail = await response.json() as {
          messages: Array<{ citations?: SendMessageResult["assistant_message"]["citations"] }>;
        };
        assert.deepEqual(detail.messages[1]?.citations, result.assistant_message.citations);
        sql.assertComplete();
      },
      loadRouter,
    );
  });
}

test("J2.2 real catalog routes HTTP fallback to deterministic Document RAG", async () => {
  const sql = new ScriptedSqlClient([conversationStep(), persistenceStep()]);
  const ragInputs: Array<{ release_id: string; query: string }> = [];
  const answer: DocumentRagAnswer = {
    release_id: RELEASE_ID,
    content: RAG_CONTENT,
    insufficient_evidence: false,
    citations: [{
      index: 0,
      label: "Documento sintético",
      locator: "document:test#chunk-1",
      release_id: RELEASE_ID,
      artifact_url: `/api/v1/documents/${DOCUMENT_VERSION_ID}/artifact`,
      source_kind: "document",
      document_version_id: DOCUMENT_VERSION_ID,
    }],
    citation_records: [{
      citation_index: 0,
      dataset_release_id: RELEASE_ID,
      source_path: "documents/test.md",
      source_locator: "document:test#chunk-1",
      source_sha256: SHA256,
      source_kind: "document",
      document_version_id: DOCUMENT_VERSION_ID,
      chunk_id: CHUNK_ID,
      profile_key: null,
      course_key: null,
      event_key: null,
      announcement_key: null,
    }],
  };
  const documentRag: DocumentRagResponder = async (input) => {
    ragInputs.push(input);
    return answer;
  };

  await withRuntimeServer(sql, documentRag, async (baseUrl) => {
    const result = await postMessage(baseUrl, RAG_PROMPT);
    assert.deepEqual(ragInputs, [{ release_id: RELEASE_ID, query: RAG_PROMPT }]);
    assert.equal(result.conversation_id, CONVERSATION_ID);
    assert.equal(result.user_message.content, RAG_PROMPT);
    assert.equal(result.assistant_message.content, RAG_CONTENT);
    assert.equal(result.assistant_message.insufficient_evidence, false);
    assert.ok(result.assistant_message.citations.some((item) => item.source_kind === "document"));
    assert.equal("citation_records" in result.assistant_message, false);

    const call = persistenceCall(sql);
    assert.equal(call.values?.[0], CONVERSATION_ID);
    assert.equal(call.values?.[3], RAG_PROMPT);
    assert.equal(call.values?.[4], RAG_CONTENT);
    assert.equal(call.values?.[5], false);
    assert.deepEqual(citationRecords(call), answer.citation_records);
    sql.assertComplete();
  });
});
