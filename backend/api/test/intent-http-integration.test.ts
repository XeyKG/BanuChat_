import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createRuntimeApiServer,
  type DocumentRagAnswer,
  type DocumentRagResponder,
  type SendMessageResult,
  type SqlQueryClient,
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
): Promise<void> {
  const server = await createRuntimeApiServer(sql, documentRag);
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
      artifact_url: null,
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
