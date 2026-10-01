import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { createConversation } from "../application/conversations.js";
import {
  sendMessage,
  type DocumentRagResponder,
} from "../application/messages.js";
import { listProfiles } from "../application/profiles.js";
import type { SqlQueryClient } from "../data/sql-client.js";
import type { IntentRouter } from "../routing/intent-router-types.js";
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

export interface ApiServerDependencies {
  sql: SqlQueryClient;
  router: IntentRouter;
  document_rag: DocumentRagResponder;
  now?: () => string;
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

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApiServerDependencies,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(request.url ?? "", "http://localhost");
  } catch {
    sendError(response, notFoundDescription());
    return;
  }

  const isProfilesPath = url.pathname === "/api/v1/profiles";
  const isConversationsPath = url.pathname === "/api/v1/conversations";
  const messagesMatch = MESSAGES_PATH_PATTERN.exec(url.pathname);
  const isMessagesPath = messagesMatch !== null;

  if (
    (isProfilesPath || isConversationsPath || isMessagesPath) &&
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
        const result = await sendMessage(
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
  return createServer((request, response) => {
    void handleRequest(request, response, dependencies);
  });
}
