#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const TIMEOUTS = {
  get: 15_000,
  create: 15_000,
  fastPath: 30_000,
  documentRag: 120_000,
  cleanup: 15_000,
};

const FAST_PATH_PROMPT = "mi progreso";
const DOCUMENT_RAG_PROMPT = "¿Qué información debo incluir al reportar una incidencia?";
const profileKey = process.env.BANUCHAT_SMOKE_PROFILE_KEY ?? "profile-001";
let conversationId;
let failed = false;

function requireValue(condition, reason) {
  if (!condition) throw new Error(reason);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function apiBaseUrl() {
  const raw = process.env.BANUCHAT_SMOKE_API_BASE_URL ??
    "http://127.0.0.1:3000/api/v1";
  const url = new URL(raw);
  requireValue(
    ["http:", "https:"].includes(url.protocol) && !url.username &&
      !url.password && !url.search && !url.hash &&
      url.pathname.replace(/\/+$/u, "") === "/api/v1",
    "BANUCHAT_SMOKE_API_BASE_URL must end in /api/v1 and contain no credentials, query, or fragment",
  );
  return url.href.replace(/\/+$/u, "");
}

function revision() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function errorText(error) {
  return error instanceof Error ? error.message : "unknown error";
}

async function request(base, path, { method = "GET", body, timeout = TIMEOUTS.get } = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    // A failed POST /messages may still have reached the server. Never resend it.
    if (method === "POST" && path.endsWith("/messages")) {
      throw new Error(`POST /messages result uncertain (${error?.name ?? "network error"}); no retry`);
    }
    throw new Error(`${method} request failed (${error?.name ?? "network error"})`);
  }
  return response;
}

async function jsonResponse(response, expectedStatus, { postMessage = false } = {}) {
  requireValue(response.status === expectedStatus,
    `expected HTTP ${expectedStatus}, received HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    if (postMessage) {
      throw new Error("POST /messages result uncertain (response body unreadable); no retry");
    }
    throw new Error("expected a JSON response");
  }
}

async function step(name, action) {
  const start = performance.now();
  try {
    const detail = await action();
    const elapsed = Math.round(performance.now() - start);
    console.log(`PASS ${name.padEnd(25)} ${elapsed} ms${detail ? `  ${detail}` : ""}`);
    return true;
  } catch (error) {
    failed = true;
    console.log(`FAIL ${name}`);
    console.log(`reason: ${errorText(error)}`);
    return false;
  }
}

function assertAnswer(data, prompt, id, sourceKind) {
  requireValue(isRecord(data), "expected a message response object");
  requireValue(data.conversation_id === id, "conversation_id mismatch");
  requireValue(isRecord(data.user_message) && data.user_message.role === "user" &&
    data.user_message.content === prompt, "user message mismatch");
  requireValue(isRecord(data.assistant_message) &&
    data.assistant_message.role === "assistant" &&
    nonemptyString(data.assistant_message.content), "expected a nonempty assistant answer");
  requireValue(data.assistant_message.insufficient_evidence === false,
    "assistant reported insufficient evidence");
  requireValue(Array.isArray(data.assistant_message.citations) &&
    data.assistant_message.citations.length > 0, "expected assistant citations");
  if (sourceKind) {
    requireValue(data.assistant_message.citations.some((citation) =>
      isRecord(citation) && citation.source_kind === sourceKind),
    `expected at least one ${sourceKind} citation`);
  }
  requireValue(nonemptyString(data.user_message.message_id) &&
    nonemptyString(data.assistant_message.message_id), "expected message IDs");
  return data;
}

async function main() {
  console.log("BanuChat J1 vertical smoke");
  console.log(`revision: ${revision()}`);

  let base;
  try {
    base = apiBaseUrl();
    requireValue(nonemptyString(profileKey), "BANUCHAT_SMOKE_PROFILE_KEY must be nonempty");
  } catch (error) {
    console.log("FAIL configuration");
    console.log(`reason: ${errorText(error)}`);
    console.log("J1 RESULT: FAIL");
    process.exitCode = 1;
    return;
  }
  console.log(`api: ${base}`);
  console.log();

  try {
    if (!await step("profiles", async () => {
      const data = await jsonResponse(await request(base, "/profiles"), 200);
      requireValue(isRecord(data) && nonemptyString(data.release_id) &&
        Array.isArray(data.profiles), "invalid profiles response");
      const selected = data.profiles.find((profile) =>
        isRecord(profile) && profile.profile_key === profileKey);
      requireValue(selected && nonemptyString(selected.profile_key) &&
        nonemptyString(selected.alias), `selected profile ${profileKey} is missing or invalid`);
      return `profile_key=${selected.profile_key} alias=${selected.alias}`;
    })) return;

    if (!await step("calendar", async () => {
      const data = await jsonResponse(await request(base,
        "/calendar/events?date_from=2026-10-03&date_to=2026-11-01"), 200);
      requireValue(isRecord(data) && Array.isArray(data.events) &&
        data.events.length > 0, "expected at least one calendar event");
      requireValue(data.events.every((event) => isRecord(event) &&
        ["event_key", "title", "event_type", "starts_at"].every((key) =>
          nonemptyString(event[key]))), "calendar event is missing required fields");
      return `events=${data.events.length}`;
    })) return;

    if (!await step("progress", async () => {
      const data = await jsonResponse(await request(base,
        `/profiles/${encodeURIComponent(profileKey)}/progress`), 200);
      requireValue(isRecord(data) && isRecord(data.profile) &&
        data.profile.profile_key === profileKey && nonemptyString(data.profile.alias) &&
        Array.isArray(data.courses) && data.courses.length > 0,
      "invalid profile progress response");
      requireValue(data.courses.every((course) => isRecord(course) &&
        ["course_key", "course_name", "status"].every((key) =>
          nonemptyString(course[key])) &&
        typeof course.progress_percent === "number" &&
        Number.isFinite(course.progress_percent)),
      "course is missing required fields");
      return `courses=${data.courses.length}`;
    })) return;

    if (!await step("create_conversation", async () => {
      const data = await jsonResponse(await request(base, "/conversations", {
        method: "POST", body: { profile_key: profileKey }, timeout: TIMEOUTS.create,
      }), 201);
      // Capture the ID before other assertions so finally can attempt cleanup.
      if (isRecord(data) && nonemptyString(data.conversation_id)) {
        conversationId = data.conversation_id;
      }
      requireValue(conversationId && data.profile_key === profileKey &&
        nonemptyString(data.profile_alias) && nonemptyString(data.created_at),
      "invalid created conversation response");
    })) return;

    const messagePath = `/conversations/${encodeURIComponent(conversationId)}/messages`;
    let fastPathTurn;
    if (!await step("fast_path", async () => {
      fastPathTurn = assertAnswer(await jsonResponse(await request(base, messagePath, {
        method: "POST", body: { content: FAST_PATH_PROMPT },
        timeout: TIMEOUTS.fastPath,
      }), 201, { postMessage: true }), FAST_PATH_PROMPT, conversationId);
    })) return;

    let ragTurn;
    if (!await step("document_rag", async () => {
      ragTurn = assertAnswer(await jsonResponse(await request(base, messagePath, {
        method: "POST", body: { content: DOCUMENT_RAG_PROMPT },
        timeout: TIMEOUTS.documentRag,
      }), 201, { postMessage: true }), DOCUMENT_RAG_PROMPT, conversationId, "document");
    })) return;

    await step("conversation_history", async () => {
      const data = await jsonResponse(await request(base,
        `/conversations/${encodeURIComponent(conversationId)}`), 200);
      requireValue(isRecord(data) && data.conversation_id === conversationId &&
        isRecord(data.profile) && data.profile.profile_key === profileKey &&
        Array.isArray(data.messages) && data.messages.length === 4,
      "expected exactly four persisted messages for this new conversation");
      const expected = [fastPathTurn.user_message, fastPathTurn.assistant_message,
        ragTurn.user_message, ragTurn.assistant_message];
      requireValue(data.messages.every((message, index) =>
        isRecord(message) && message.message_id === expected[index].message_id &&
        message.role === expected[index].role &&
        message.content === expected[index].content),
      "persisted messages do not match the sent turns in order");
      requireValue(Array.isArray(data.messages[3].citations) &&
        data.messages[3].citations.some((citation) =>
          isRecord(citation) && citation.source_kind === "document"),
      "persisted RAG answer has no visible document citation");
    });
  } finally {
    if (conversationId) {
      const cleaned = await step("cleanup", async () => {
        const path = `/conversations/${encodeURIComponent(conversationId)}`;
        const response = await request(base, path, {
          method: "DELETE", timeout: TIMEOUTS.cleanup,
        });
        if (response.status === 409) {
          throw new Error("CLEANUP NOT CONFIRMED: HTTP 409, operation may still be active");
        }
        requireValue(response.status === 204,
          `CLEANUP NOT CONFIRMED: expected HTTP 204, received HTTP ${response.status}`);
        const after = await request(base, path);
        requireValue(after.status === 404,
          `CLEANUP NOT CONFIRMED: expected HTTP 404 after delete, received HTTP ${after.status}`);
      });
      if (!cleaned) console.log("CLEANUP NOT CONFIRMED");
    }
    console.log();
    console.log(`J1 RESULT: ${failed ? "FAIL" : "PASS"}`);
    if (failed) process.exitCode = 1;
  }
}

await main();
