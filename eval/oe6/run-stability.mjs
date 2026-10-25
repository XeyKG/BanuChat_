#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const base = process.env.BANUCHAT_OE6_API_BASE_URL ?? "http://127.0.0.1:3000/api/v1";
const container = process.env.BANUCHAT_N8N_CONTAINER ?? "banuchat-n8n";
const output = fileURLToPath(new URL("./results/oe6-stability-2026-10-25.json", import.meta.url));
const prompt = "Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?";
const apiDirectory = fileURLToPath(new URL("../../backend/api/", import.meta.url));

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(init.timeout ?? 15_000),
  });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  return { response, body };
}

async function waitForN8n() {
  const started = performance.now();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:5678/healthz", {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        // /healthz becomes ready before published webhooks are always registered.
        await new Promise(resolve => setTimeout(resolve, 5_000));
        return Math.round(performance.now() - started);
      }
    } catch {
      // Expected while the service is restarting.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("n8n_recovery_timeout");
}

async function runOllamaFault() {
  const faultBase = "http://127.0.0.1:3005/api/v1";
  const child = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      BANUCHAT_API_PORT: "3005",
      BANUCHAT_OLLAMA_BASE_URL: "http://127.0.0.1:11999",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let conversation;
  try {
    const deadline = Date.now() + 30_000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        ready = (await fetch(`${faultBase}/profiles`, { signal: AbortSignal.timeout(1_000) })).ok;
      } catch { ready = false; }
      if (ready) break;
      if (child.exitCode !== null) throw new Error("isolated_api_exited");
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("isolated_api_start_timeout");
    const created = await fetch(`${faultBase}/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_key: "profile-001" }), signal: AbortSignal.timeout(10_000),
    });
    const createdBody = await created.json();
    conversation = createdBody.conversation_id;
    const started = performance.now();
    const failed = await fetch(`${faultBase}/conversations/${conversation}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "¿Qué información debo incluir al reportar una incidencia?" }),
      signal: AbortSignal.timeout(15_000),
    });
    const durationMs = Math.round(performance.now() - started);
    const history = await fetch(`${faultBase}/conversations/${conversation}`, {
      signal: AbortSignal.timeout(10_000),
    }).then(response => response.json());
    if (failed.status !== 503 || history.messages?.length !== 0) {
      throw new Error("ollama_failure_semantics_invalid");
    }
    return { injection: "isolated API pointed at a closed loopback port",
      http_status: failed.status, detection_ms: durationMs,
      messages_persisted_during_failure: history.messages.length, outcome: "PASS" };
  } finally {
    if (conversation) {
      await fetch(`${faultBase}/conversations/${conversation}`, {
        method: "DELETE", signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
    }
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise(resolve => child.once("exit", resolve));
    }
  }
}

let conversationId;
let n8nStopped = false;
const startedAt = new Date().toISOString();
try {
  const created = await request("/conversations", {
    method: "POST", body: JSON.stringify({ profile_key: "profile-001" }),
  });
  if (created.response.status !== 201 || typeof created.body?.conversation_id !== "string") {
    throw new Error("conversation_setup_failed");
  }
  conversationId = created.body.conversation_id;

  execFileSync("docker", ["stop", "--time", "15", container], { stdio: "ignore" });
  n8nStopped = true;
  const failureStart = performance.now();
  const failed = await request(`/conversations/${conversationId}/messages`, {
    method: "POST", body: JSON.stringify({ content: prompt }), timeout: 15_000,
  });
  const failureDuration = Math.round(performance.now() - failureStart);
  const afterFailure = await request(`/conversations/${conversationId}`);
  if (failed.response.status !== 503 || afterFailure.body?.messages?.length !== 0) {
    throw new Error("n8n_failure_semantics_invalid");
  }

  execFileSync("docker", ["start", container], { stdio: "ignore" });
  n8nStopped = false;
  const recoveryMs = await waitForN8n();
  const recoveredStart = performance.now();
  const recovered = await request(`/conversations/${conversationId}/messages`, {
    method: "POST", body: JSON.stringify({ content: prompt }), timeout: 60_000,
  });
  const recoveredDuration = Math.round(performance.now() - recoveredStart);
  const afterRecovery = await request(`/conversations/${conversationId}`);
  if (recovered.response.status !== 201 || afterRecovery.body?.messages?.length !== 2) {
    throw new Error("n8n_recovery_semantics_invalid");
  }
  const ollamaFault = await runOllamaFault();

  const report = {
    schema_version: "banuchat-oe6-stability-1",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    environment: "local synthetic; PostgreSQL and Ollama kept available",
    fault: "real temporary stop of the local N8N container",
    result: {
      failure_http_status: failed.response.status,
      failure_detection_ms: failureDuration,
      messages_persisted_during_failure: afterFailure.body.messages.length,
      recovery_ms: recoveryMs,
      post_recovery_http_status: recovered.response.status,
      post_recovery_request_ms: recoveredDuration,
      messages_after_recovery: afterRecovery.body.messages.length,
      duplicate_turn_detected: afterRecovery.body.messages.length !== 2,
      recovery_within_five_minutes: recoveryMs <= 300_000,
    },
    ollama_fault: ollamaFault,
    status: "PASS",
    limitations: [
      "This is a planned fault injection, not evidence of continuous availability.",
      "PostgreSQL was not stopped because the canonical database is protected.",
      "Ollama unavailability used an isolated API with a closed loopback endpoint; the shared daemon was not killed.",
    ],
  };
  await mkdir(fileURLToPath(new URL("./results/", import.meta.url)), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "PASS", output: "eval/oe6/results/oe6-stability-2026-10-25.json", ...report.result,
    ollama_fault: report.ollama_fault }));
} finally {
  if (n8nStopped) {
    execFileSync("docker", ["start", container], { stdio: "ignore" });
  }
  if (conversationId) {
    const cleaned = await request(`/conversations/${conversationId}`, { method: "DELETE" }).catch(() => undefined);
    if (cleaned?.response.status !== 204) process.stderr.write("cleanup_not_confirmed\n");
  }
}
