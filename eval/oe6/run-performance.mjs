#!/usr/bin/env node

import { cpus, totalmem, platform, release, arch } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const base = process.env.BANUCHAT_OE6_API_BASE_URL ?? "http://127.0.0.1:3000/api/v1";
const profileKey = process.env.BANUCHAT_OE6_PROFILE_KEY ?? "profile-001";
const sampleSize = Number(process.env.BANUCHAT_OE6_SAMPLE_SIZE ?? "10");
const concurrency = Number(process.env.BANUCHAT_OE6_CONCURRENCY ?? "1");
const timeoutMs = Number(process.env.BANUCHAT_OE6_TIMEOUT_MS ?? "120000");
const output = fileURLToPath(new URL("./results/oe6-performance-2026-10-25.json", import.meta.url));
const branches = [
  { name: "fast_path", prompt: "mi progreso", expected: "profile_course" },
  { name: "document_rag", prompt: "¿Qué información debo incluir al reportar una incidencia?", expected: "document" },
  { name: "n8n_mcp", prompt: "Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?", expected: "announcement" },
];

if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100 ||
    !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10 ||
    !Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
  throw new Error("invalid_benchmark_configuration");
}

async function json(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(init.timeout ?? 15_000),
  });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  return { response, body };
}

async function loadedModels() {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/ps", { signal: AbortSignal.timeout(5_000) });
    const body = await response.json();
    return Array.isArray(body.models) ? body.models.map(model => model.name) : [];
  } catch {
    return [];
  }
}

async function attempt(branch, ordinal) {
  let conversationId;
  const modelStateBefore = await loadedModels();
  let measuredMs = 0;
  try {
    const created = await json("/conversations", {
      method: "POST",
      body: JSON.stringify({ profile_key: profileKey }),
      timeout: 15_000,
    });
    if (created.response.status !== 201 || typeof created.body?.conversation_id !== "string") {
      throw new Error(`create_http_${created.response.status}`);
    }
    conversationId = created.body.conversation_id;
    const started = performance.now();
    let sent;
    try {
      sent = await json(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: branch.prompt }),
        timeout: timeoutMs,
      });
    } finally {
      measuredMs = Math.round(performance.now() - started);
    }
    const citations = sent.body?.assistant_message?.citations;
    if (sent.response.status !== 201) throw new Error(`message_http_${sent.response.status}`);
    if (sent.body?.assistant_message?.insufficient_evidence !== false || !Array.isArray(citations) ||
        !citations.some(citation => citation?.source_kind === branch.expected)) {
      throw new Error("response_semantics_invalid");
    }
    return { ordinal, outcome: "PASS", duration_ms: measuredMs, model_state_before: modelStateBefore };
  } catch (error) {
    return { ordinal, outcome: "FAIL", duration_ms: measuredMs || timeoutMs,
      error: error instanceof Error ? error.message : "unknown_error", model_state_before: modelStateBefore };
  } finally {
    if (conversationId) {
      const cleaned = await json(`/conversations/${encodeURIComponent(conversationId)}`, {
        method: "DELETE", timeout: 15_000,
      }).catch(() => undefined);
      if (cleaned?.response.status !== 204) {
        process.stderr.write(`cleanup_not_confirmed branch=${branch.name} ordinal=${ordinal}\n`);
      }
    }
  }
}

function stats(attempts) {
  const values = attempts.map(item => item.duration_ms).sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const percentile = p => values[Math.max(0, Math.ceil(values.length * p) - 1)];
  return {
    samples: values.length,
    concurrency,
    mean_ms: Math.round(mean * 100) / 100,
    median_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    max_ms: values.at(-1),
    errors: attempts.filter(item => item.outcome !== "PASS").length,
    timeouts: attempts.filter(item => item.error?.includes("Timeout") || item.error?.includes("timeout")).length,
    over_target_5s: values.filter(value => value > 5_000).length,
    target_mean_le_5s: mean <= 5_000,
  };
}

const startedAt = new Date().toISOString();
const results = [];
for (const branch of branches) {
  const attempts = [];
  for (let offset = 0; offset < sampleSize; offset += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, sampleSize - offset) },
      (_, index) => attempt(branch, offset + index + 1));
    attempts.push(...await Promise.all(batch));
  }
  results.push({ branch: branch.name, measurement_boundary: "HTTP POST /messages start to parsed JSON response",
    statistics: stats(attempts), attempts });
  process.stdout.write(`${branch.name}: ${JSON.stringify(results.at(-1).statistics)}\n`);
}

const report = {
  schema_version: "banuchat-oe6-performance-1",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  environment: {
    platform: platform(), os_release: release(), architecture: arch(),
    cpu: cpus()[0]?.model ?? "unknown", logical_processors: cpus().length,
    memory_bytes: totalmem(), gpu: "NVIDIA GeForce RTX 3050 6GB Laptop GPU (observed by OE6 inventory)",
    node: process.version, api_base_url: base, local_hardware_not_university_server: true,
  },
  configuration: { sample_size_per_branch: sampleSize, concurrency, timeout_ms: timeoutMs,
    target_mean_ms: 5_000, retries: 0, errors_included_in_primary_statistics: true },
  fixtures_or_mocks: false,
  results,
};
await mkdir(fileURLToPath(new URL("./results/", import.meta.url)), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: results.every(item => item.statistics.errors === 0) ? "PASS" : "FAIL",
  output: "eval/oe6/results/oe6-performance-2026-10-25.json" }));
if (results.some(item => item.statistics.errors > 0)) process.exitCode = 1;
