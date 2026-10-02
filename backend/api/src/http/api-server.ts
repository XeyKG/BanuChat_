import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { createConversation } from "../application/conversations.js";
import { getConversationDetail } from "../application/conversation-detail.js";
import { deleteConversation } from "../application/delete-conversation.js";
import {
  listConversations,
  type ListConversationsInput,
} from "../application/conversation-history.js";
import {
  sendMessage,
  type DocumentRagResponder,
} from "../application/messages.js";
import { listProfiles } from "../application/profiles.js";
import {
  getDocumentArtifact,
  type DocumentArtifactResult,
  type DocumentArtifactStorage,
} from "../application/document-artifact.js";
import { getCalendarEvents, type CalendarEventType } from "../application/calendar-events.js";
import { getProfileProgress, type ProfileProgressStatus } from "../application/profile-progress.js";
import { getAnnouncements, type AnnouncementTemporalStatus } from "../application/announcements.js";
import type { SqlQueryClient } from "../data/sql-client.js";
import type { IntentRouter } from "../routing/intent-router-types.js";
import {
  ConversationActivityConflictError,
  ConversationActivityCoordinator,
} from "./conversation-activity.js";
import {
  createErrorBody,
  describeHttpError,
  InvalidHttpRequestError,
  notFoundDescription,
  type HttpErrorDescription,
} from "./http-errors.js";

const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const JSON_MEDIA_TYPE_PATTERN =
  /^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGES_PATH_PATTERN =
  /^\/api\/v1\/conversations\/([^/]+)\/messages$/u;
const CONVERSATION_DETAIL_PATH_PATTERN =
  /^\/api\/v1\/conversations\/([^/]+)$/u;
const PROFILE_PROGRESS_PATH_PATTERN = /^\/api\/v1\/profiles\/([^/]+)\/progress$/u;
const DOCUMENT_ARTIFACT_PATH_PATTERN = /^\/api\/v1\/documents\/([^/]+)\/artifact$/u;
const CALENDAR_EVENT_TYPES = new Set<CalendarEventType>(["course_session", "announcement_deadline", "general"]);
const PROFILE_PROGRESS_STATUSES = new Set<ProfileProgressStatus>(["enrolled", "in_progress", "completed"]);
const ANNOUNCEMENT_STATUSES = new Set<AnnouncementTemporalStatus>(["active", "upcoming", "expired", "all"]);

export interface ApiServerDependencies {
  sql: SqlQueryClient;
  router: IntentRouter;
  document_rag: DocumentRagResponder;
  now?: () => string;
  document_artifact?: DocumentArtifactStorage;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": JSON_CONTENT_TYPE,
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendError(
  response: ServerResponse,
  description: HttpErrorDescription,
): void {
  sendJson(response, description.status, createErrorBody(description));
}

function sendNoContent(response: ServerResponse): void {
  response.writeHead(204, { "Cache-Control": "no-store" });
  response.end();
}

function sendArtifact(response: ServerResponse, artifact: DocumentArtifactResult): void {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${artifact.document_version_id}.bin"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Length": artifact.bytes.byteLength,
  });
  response.end(artifact.bytes);
}

function requireJsonContentType(request: IncomingMessage): void {
  const contentType = request.headers["content-type"];
  if (
    typeof contentType !== "string" ||
    !JSON_MEDIA_TYPE_PATTERN.test(contentType)
  ) {
    throw new InvalidHttpRequestError();
  }
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_REQUEST_BODY_BYTES) {
      throw new InvalidHttpRequestError();
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks, byteLength).toString("utf8");
}

async function requireEmptyRequestBody(request: IncomingMessage): Promise<void> {
  let hasBody = false;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (buffer.byteLength > 0) {
      hasBody = true;
    }
  }
  if (hasBody) throw new InvalidHttpRequestError();
}

function parseCreateConversationBody(body: string): { profile_key: string } {
  let value: unknown;
  try {
    value = JSON.parse(body) as unknown;
  } catch {
    throw new InvalidHttpRequestError();
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidHttpRequestError();
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 1 ||
    keys[0] !== "profile_key" ||
    !("profile_key" in value) ||
    typeof value.profile_key !== "string"
  ) {
    throw new InvalidHttpRequestError();
  }

  return { profile_key: value.profile_key };
}

function parseSendMessageBody(body: string): { content: string } {
  let value: unknown;
  try {
    value = JSON.parse(body) as unknown;
  } catch {
    throw new InvalidHttpRequestError();
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidHttpRequestError();
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 1 ||
    keys[0] !== "content" ||
    !("content" in value) ||
    typeof value.content !== "string"
  ) {
    throw new InvalidHttpRequestError();
  }

  const length = Array.from(value.content).length;
  if (length < 1 || length > 4000 || !/\S/u.test(value.content)) {
    throw new InvalidHttpRequestError();
  }

  return { content: value.content };
}

function parseListConversationsQuery(url: URL): ListConversationsInput {
  const allowedParameters = new Set(["profile_key", "limit"]);
  if ([...url.searchParams.keys()].some((key) => !allowedParameters.has(key))) {
    throw new InvalidHttpRequestError();
  }

  const profileKeys = url.searchParams.getAll("profile_key");
  const limits = url.searchParams.getAll("limit");
  if (profileKeys.length !== 1 || limits.length > 1) {
    throw new InvalidHttpRequestError();
  }

  const profileKey = profileKeys[0];
  if (profileKey === undefined) {
    throw new InvalidHttpRequestError();
  }

  if (limits.length === 0) {
    return { profile_key: profileKey };
  }

  const rawLimit = limits[0];
  if (rawLimit === undefined || !/^(?:[1-9]|[1-4][0-9]|50)$/u.test(rawLimit)) {
    throw new InvalidHttpRequestError();
  }
  return { profile_key: profileKey, limit: Number(rawLimit) };
}

function readLimit(url: URL): number | undefined {
  const values = url.searchParams.getAll("limit");
  if (values.length === 0) return undefined;
  if (values.length !== 1 || !/^(?:[1-9]|[1-4][0-9]|50)$/u.test(values[0] ?? "")) {
    throw new InvalidHttpRequestError();
  }
  return Number(values[0]);
}

function rejectUnknownParameters(url: URL, allowed: readonly string[]): void {
  const set = new Set(allowed);
  if ([...url.searchParams.keys()].some((key) => !set.has(key))) throw new InvalidHttpRequestError();
}

function readSingle(url: URL, name: string, required = false): string | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length > 1 || (required && values.length !== 1)) throw new InvalidHttpRequestError();
  return values[0];
}

function readRepeated<T extends string>(url: URL, name: string, allowed: ReadonlySet<T>): T[] | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length === 0) return undefined;
  if (values.some((value) => value.length === 0 || value.includes(",") || !allowed.has(value as T)) || new Set(values).size !== values.length) {
    throw new InvalidHttpRequestError();
  }
  return values as T[];
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApiServerDependencies,
  activity: ConversationActivityCoordinator,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(request.url ?? "", "http://localhost");
  } catch {
    sendError(response, notFoundDescription());
    return;
  }

  if (request.method === "GET") {
    try {
      await requireEmptyRequestBody(request);
    } catch (error) {
      sendError(response, describeHttpError(error));
      return;
    }
  }

  const isProfilesPath = url.pathname === "/api/v1/profiles";
  const isConversationsPath = url.pathname === "/api/v1/conversations";
  const messagesMatch = MESSAGES_PATH_PATTERN.exec(url.pathname);
  const isMessagesPath = messagesMatch !== null;
  const conversationDetailMatch = CONVERSATION_DETAIL_PATH_PATTERN.exec(
    url.pathname,
  );
  const isConversationDetailPath = conversationDetailMatch !== null;
  const progressMatch = PROFILE_PROGRESS_PATH_PATTERN.exec(url.pathname);

  const artifactMatch = DOCUMENT_ARTIFACT_PATH_PATTERN.exec(url.pathname);
  if (request.method === "GET" && artifactMatch !== null) {
    try {
      const documentVersionId = artifactMatch[1];
      if (url.search !== "" || documentVersionId === undefined ||
        !UUID_PATTERN.test(documentVersionId)) {
        throw new InvalidHttpRequestError();
      }
      const artifact = await getDocumentArtifact(
        dependencies.sql,
        { document_version_id: documentVersionId },
        dependencies.document_artifact,
      );
      // Range is deliberately ignored: v1 always sends the complete verified bytes.
      sendArtifact(response, artifact);
    } catch (error) {
      sendError(response, describeHttpError(error));
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/calendar/events") {
    try {
      rejectUnknownParameters(url, ["date_from", "date_to", "event_types", "limit"]);
      const dateFrom = readSingle(url, "date_from", true)!;
      const dateTo = readSingle(url, "date_to", true)!;
      const eventTypes = readRepeated(url, "event_types", CALENDAR_EVENT_TYPES);
      const limit = readLimit(url);
      const result = await getCalendarEvents(dependencies.sql, { date_from: dateFrom, date_to: dateTo, ...(eventTypes ? { event_types: eventTypes } : {}), ...(limit ? { limit } : {}) });
      sendJson(response, 200, { release_id: result.release_id, events: result.events.map(({ event_key, title, description, event_type, starts_at, ends_at, course_key, announcement_key }) => ({ event_key, title, description, event_type, starts_at, ends_at, course_key, announcement_key })) });
    } catch (error) { sendError(response, describeHttpError(error)); }
    return;
  }

  if (request.method === "GET" && progressMatch !== null) {
    try {
      rejectUnknownParameters(url, ["statuses", "limit"]);
      const profileKey = progressMatch[1];
      if (profileKey === undefined) throw new InvalidHttpRequestError();
      const statuses = readRepeated(url, "statuses", PROFILE_PROGRESS_STATUSES);
      const limit = readLimit(url);
      const result = await getProfileProgress(dependencies.sql, { profile_key: profileKey, ...(statuses ? { statuses } : {}), ...(limit ? { limit } : {}) });
      sendJson(response, 200, { release_id: result.release_id, profile: { profile_key: result.profile.profile_key, alias: result.profile.alias }, courses: result.courses.map(({ course_key, course_name, status, progress_percent, started_at, completed_at }) => ({ course_key, course_name, status, progress_percent, started_at, completed_at })) });
    } catch (error) { sendError(response, describeHttpError(error)); }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/announcements") {
    try {
      rejectUnknownParameters(url, ["query", "temporal_status", "reference_time", "limit"]);
      const query = readSingle(url, "query");
      const temporalStatus = readSingle(url, "temporal_status");
      const suppliedReferenceTime = readSingle(url, "reference_time");
      const referenceTime = suppliedReferenceTime ?? (dependencies.now ?? (() => new Date().toISOString()))();
      const limit = readLimit(url);
      if (temporalStatus !== undefined && !ANNOUNCEMENT_STATUSES.has(temporalStatus as AnnouncementTemporalStatus)) throw new InvalidHttpRequestError();
      const result = await getAnnouncements(dependencies.sql, { ...(query !== undefined ? { query } : {}), ...(temporalStatus !== undefined ? { temporal_status: temporalStatus as AnnouncementTemporalStatus } : {}), reference_time: referenceTime, ...(limit ? { limit } : {}) });
      sendJson(response, 200, { release_id: result.release_id, reference_time: result.reference_time, announcements: result.announcements.map(({ announcement_key, title, description, valid_from, valid_until, temporal_status: status }) => ({ announcement_key, title, description, valid_from, valid_until, temporal_status: status })) });
    } catch (error) { sendError(response, describeHttpError(error)); }
    return;
  }

  if (
    (isProfilesPath || isMessagesPath || isConversationDetailPath ||
      (isConversationsPath && request.method !== "GET")) &&
    url.search !== ""
  ) {
    sendError(response, describeHttpError(new InvalidHttpRequestError()));
    return;
  }

  if (request.method === "GET" && isProfilesPath) {
    try {
      const result = await listProfiles(dependencies.sql);
      sendJson(response, 200, result);
    } catch (error) {
      sendError(response, describeHttpError(error));
    }
    return;
  }

  if (request.method === "POST" && isConversationsPath) {
    try {
      requireJsonContentType(request);
      const input = parseCreateConversationBody(await readRequestBody(request));
      const result = await createConversation(dependencies.sql, input);
      sendJson(response, 201, result, {
        Location: `/api/v1/conversations/${result.conversation_id}`,
      });
    } catch (error) {
      sendError(response, describeHttpError(error));
    }
    return;
  }

  if (request.method === "GET" && isConversationsPath) {
    try {
      const input = parseListConversationsQuery(url);
      const result = await listConversations(dependencies.sql, input);
      sendJson(response, 200, result);
    } catch (error) {
      sendError(response, describeHttpError(error));
    }
    return;
  }

  if (isConversationDetailPath) {
    const conversationId = conversationDetailMatch[1];
    if (conversationId === undefined || !UUID_PATTERN.test(conversationId)) {
      sendError(response, describeHttpError(new InvalidHttpRequestError()));
      return;
    }

    if (request.method === "GET") {
      try {
        const result = await getConversationDetail(dependencies.sql, {
          conversation_id: conversationId,
        });
        sendJson(response, 200, result);
      } catch (error) {
        sendError(response, describeHttpError(error));
      }
      return;
    }

    if (request.method === "DELETE") {
      try {
        await requireEmptyRequestBody(request);
        if (!activity.tryBeginDelete(conversationId)) {
          throw new ConversationActivityConflictError();
        }
        try {
          await deleteConversation(dependencies.sql, {
            conversation_id: conversationId,
          });
        } finally {
          activity.endDelete(conversationId);
        }
        sendNoContent(response);
      } catch (error) {
        sendError(response, describeHttpError(error));
      }
      return;
    }
  }

  if (isMessagesPath) {
    const conversationId = messagesMatch[1];
    if (conversationId === undefined || !UUID_PATTERN.test(conversationId)) {
      sendError(response, describeHttpError(new InvalidHttpRequestError()));
      return;
    }

    if (request.method === "POST") {
      try {
        if (request.headers["idempotency-key"] !== undefined) {
          throw new InvalidHttpRequestError();
        }
        requireJsonContentType(request);
        const input = parseSendMessageBody(await readRequestBody(request));
        const now = (dependencies.now ?? (() => new Date().toISOString()))();
        if (!activity.tryBeginMessage(conversationId)) {
          throw new ConversationActivityConflictError();
        }
        let result;
        try {
          result = await sendMessage(
            {
              sql: dependencies.sql,
              router: dependencies.router,
              document_rag: dependencies.document_rag,
            },
            {
              conversation_id: conversationId,
              content: input.content,
              now,
            },
          );
        } finally {
          activity.endMessage(conversationId);
        }
        sendJson(response, 201, result);
      } catch (error) {
        sendError(response, describeHttpError(error));
      }
      return;
    }
  }

  sendError(response, notFoundDescription());
}

export function createApiServer(
  dependencies: ApiServerDependencies,
): Server {
  const activity = new ConversationActivityCoordinator();
  return createServer((request, response) => {
    void handleRequest(request, response, dependencies, activity);
  });
}
