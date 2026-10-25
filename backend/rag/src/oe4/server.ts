import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { CalendarSyncResult } from "./calendar-sync.js";

const BODY_LIMIT = 8 * 1024;

export interface CalendarSyncHttpService {
  sync(sourceId: string, workflowRef: string): Promise<CalendarSyncResult>;
  status(): Promise<unknown>;
}

function digest(value: string): Buffer { return createHash("sha256").update(value).digest(); }
function send(response: ServerResponse, status: number, value: unknown): void {
  if (response.writableEnded || response.destroyed) return;
  const bytes = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Content-Length": bytes.length });
  response.end(bytes);
}
function headerCount(request: IncomingMessage, name: string): number {
  let count = 0;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === name) count += 1;
  }
  return count;
}
function authenticated(request: IncomingMessage, expected: Buffer): boolean {
  const authorization = request.headers.authorization;
  const match = typeof authorization === "string" ? /^Bearer ([^\s]+)$/u.exec(authorization) : null;
  return headerCount(request, "authorization") === 1 && match !== null &&
    timingSafeEqual(digest(match[1]!), expected);
}
async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    length += bytes.length;
    if (length > BODY_LIMIT) throw new Error("INVALID_REQUEST");
    chunks.push(bytes);
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REQUEST");
  return value as Record<string, unknown>;
}

export function createCalendarSyncHttpServer(service: CalendarSyncHttpService, serviceToken: string) {
  if (serviceToken.length < 32 || /\s/u.test(serviceToken)) throw new Error("Invalid OE4 HTTP configuration");
  const expected = digest(serviceToken);
  return createServer((request, response) => void (async () => {
    const path = request.url ?? "";
    if (request.method !== "POST" || (path !== "/internal/oe4/calendar/status" && path !== "/internal/oe4/calendar/sync")) {
      send(response, 404, { error_code: "NOT_FOUND", retryable: false }); return;
    }
    if (!authenticated(request, expected)) {
      send(response, 401, { error_code: "UNAUTHORIZED", retryable: false }); return;
    }
    try {
      const body = await jsonBody(request);
      if (path.endsWith("/status")) {
        if (Object.keys(body).length !== 0) throw new Error("INVALID_REQUEST");
        send(response, 200, await service.status()); return;
      }
      if (Object.keys(body).length !== 2 || typeof body.source_id !== "string" || typeof body.workflow_ref !== "string") {
        throw new Error("INVALID_REQUEST");
      }
      send(response, 200, await service.sync(body.source_id, body.workflow_ref));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "OE4_CALENDAR_SOURCE_NOT_AUTHORIZED") {
        send(response, 403, { error_code: "SOURCE_NOT_AUTHORIZED", retryable: false });
      } else if (message.startsWith("OE4_CALENDAR_INVALID") || message === "INVALID_REQUEST") {
        send(response, 400, { error_code: "INVALID_REQUEST", retryable: false });
      } else {
        send(response, 500, { error_code: "SYNC_FAILED", retryable: false });
      }
    }
  })().catch(() => send(response, 500, { error_code: "INTERNAL_ERROR", retryable: false })));
}
