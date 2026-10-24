import assert from "node:assert/strict";
import test from "node:test";

import { captureProductionAnswer, evaluateCases, preflight } from "./run-oe1-evaluation.mjs";

const sha = "a".repeat(64);
const reference = { document_key: "ccd-demo", ordinal: 0, locator: "unit:DEMO", source_sha256: sha };
const benchmark = {
  top_k: 5,
  cases: [{ id: "SYN-001", question: "Pregunta sintética", reference_answer: "Respuesta sintética", relevant_contexts: [reference] }],
};
const contexts = new Map([[["ccd-demo", 0, "unit:DEMO", sha].join("\0"), { chunk_id: "gold", content: "Evidencia sintética" }]]);

function row(chunkId, rank) {
  return { chunk_id: chunkId, document_key: `doc-${rank}`, ordinal: 0, chunk_locator: `unit:${rank}`, source_sha256: sha, cosine_similarity: 1 - rank / 10, content: `Contexto sintético ${rank}` };
}

test("fixture sintético prepara campos RAGAS sin alterar métricas deterministas", async () => {
  const responses = new Map([["SYN-001", { status: "completed", response: "Respuesta sintética", capture: {
    method: "synthetic_test", production_retrieval: [], cited_context_ids: ["used"],
    generation_contexts: [{ chunk_id: "used", content: "Evidencia realmente entregada" }],
  } }]]);
  const result = await evaluateCases({
    benchmark, benchmarkSha: "b".repeat(64), contexts, responses, timeoutMs: 1000,
    retrieve: async () => [row("gold", 1), row("b", 2), row("c", 3), row("d", 4), row("e", 5)],
  });
  assert.equal(result.outcomes[0].metrics.reciprocal_rank_at_5, 1);
  assert.deepEqual(result.outcomes[0].response_outcome, { status: "completed" });
  assert.deepEqual(result.outcomes[0].ragas_input.retrieved_context_ids, ["used"]);
  assert.deepEqual(result.outcomes[0].ragas_input.retrieved_contexts, ["Evidencia realmente entregada"]);
  assert.deepEqual(Object.keys(result.outcomes[0].ragas_input).sort(), [
    "reference", "reference_context_ids", "reference_contexts", "response",
    "retrieved_context_ids", "retrieved_contexts", "user_input",
  ]);
});

test("captura separa retrieval productivo, prompt del generador y citas", async () => {
  const used = {
    chunk_id: "11111111-1111-4111-8111-111111111111", document_key: "ccd-used",
    document_version_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ordinal: 0,
    chunk_locator: "unit:USED", source_sha256: "b".repeat(64), content: "Evidencia usada",
    title: "Documento usado", source_path: "documents/artifacts/used.md", release_id: "release",
  };
  const noise = { ...used, chunk_id: "22222222-2222-4222-8222-222222222222", document_key: "ccd-noise", chunk_locator: "unit:NOISE", content: "Ruido", title: "Documento ruido" };
  const backend = {
    retrieveDocumentChunks: async () => [noise, used],
    generateDocumentRagAnswer: async (dependencies) => {
      const rows = await dependencies.retrieve_chunks({}, {});
      await dependencies.generator_client.generate({ system_prompt: "Sistema", user_prompt: `[1]\nTítulo: ${rows[1].title}\nLocalizador: ${rows[1].chunk_locator}\nContenido:\n${rows[1].content}\n\nPREGUNTA:\nPregunta` }, {});
      return {
        content: "Respuesta", insufficient_evidence: false,
        citations: [{ index: 0, locator: used.chunk_locator }],
        citation_records: [{ source_kind: "document", chunk_id: used.chunk_id }],
      };
    },
  };
  const captured = await captureProductionAnswer({
    backend, sql: {}, queryEmbeddingClient: {}, generatorClient: { generate: async () => ({ content: "Respuesta" }) },
    generatorConfig: {}, releaseId: "release", question: "Pregunta",
  });
  assert.equal(captured.capture.production_retrieval.length, 2);
  assert.deepEqual(captured.capture.generation_contexts.map(({ chunk_id }) => chunk_id), [used.chunk_id]);
  assert.deepEqual(captured.capture.cited_context_ids, [used.chunk_id]);
  assert.equal(captured.capture.method, "production_prompt_observer");
});

test("timeout queda visible y no produce ragas_input", async () => {
  const result = await evaluateCases({
    benchmark, benchmarkSha: "b".repeat(64), contexts, timeoutMs: 10,
    retrieve: () => new Promise(() => {}),
  });
  assert.equal(result.outcomes[0].status, "timeout");
  assert.equal("ragas_input" in result.outcomes[0], false);
});

test("un fallo de generación no oculta el resultado de retrieval independiente", async () => {
  const result = await evaluateCases({
    benchmark, benchmarkSha: "b".repeat(64), contexts, timeoutMs: 1000,
    retrieve: async () => [row("gold", 1), row("b", 2), row("c", 3), row("d", 4), row("e", 5)],
    captureResponse: async () => { throw Object.assign(new Error("fallo"), { reason: "generator_unavailable" }); },
  });
  assert.equal(result.outcomes[0].status, "completed");
  assert.equal(result.outcomes[0].metrics.hit_at_5, 1);
  assert.deepEqual(result.outcomes[0].response_outcome, { status: "error", error_code: "generator_unavailable" });
  assert.equal("ragas_input" in result.outcomes[0], false);
});

test("preflight confirma release, hashes y resolución estable del gold", async () => {
  const approved = {
    corpus: {
      dataset_key: "banuchat-ccd-local", release_id: "release", schema_version: "ccd-1.2.0",
      manifest_sha256: "m".repeat(64), document_count: 12, chunk_count: 12,
    },
    cases: benchmark.cases,
  };
  const sql = {
    calls: 0,
    async query() {
      this.calls += 1;
      if (this.calls === 1) return { rows: [{
        name: "banuchat-ccd-local", current_release_id: "release", release_id: "release", status: "ready",
        dataset_schema_version: "ccd-1.2.0", manifest_sha256: "m".repeat(64), pipeline_sha256: "p".repeat(64),
        provider: "ollama", model: "qwen3-embedding:0.6b", model_revision: "r".repeat(64), dimension: 1024,
        distance_metric: "cosine", config_sha256: "c".repeat(64), parameters: { runtime_version: "1.0.0" },
        document_count: 12, chunk_count: 12, embedding_count: 12,
      }] };
      return { rows: [{ ...reference, chunk_id: "gold", content: "Evidencia sintética" }] };
    },
  };
  const checked = await preflight(sql, approved);
  assert.equal(checked.release.manifest_sha256, "m".repeat(64));
  assert.equal(checked.contexts.size, 1);
});

test("preflight rechaza silenciosamente sustituir la release", async () => {
  const sql = { async query() { return { rows: [{
    name: "banuchat-ccd-local", current_release_id: "otra", release_id: "release", status: "ready",
    dataset_schema_version: "ccd-1.2.0", manifest_sha256: "m".repeat(64), document_count: 12,
    chunk_count: 12, embedding_count: 12, provider: "ollama", model: "qwen3-embedding:0.6b", dimension: 1024, distance_metric: "cosine",
  }] }; } };
  await assert.rejects(() => preflight(sql, {
    corpus: { dataset_key: "banuchat-ccd-local", release_id: "release", schema_version: "ccd-1.2.0", manifest_sha256: "m".repeat(64), document_count: 12, chunk_count: 12 },
    cases: benchmark.cases,
  }), /current_release_id/);
});
