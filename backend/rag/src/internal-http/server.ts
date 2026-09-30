import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { InternalIngestionService } from './service.js';
import { InternalHttpTransportError, mapInternalHttpError } from './http-errors.js';
import { parseExecuteRequest, parseRecoverRequest,
  parseRetryRequest, parseStatusRequest } from './protocol.js';

export const INTERNAL_HTTP_BODY_LIMIT = 64 * 1024;

export interface InternalIngestionHttpServerOptions {
  service: InternalIngestionService;
  serviceToken: string;
}

const ROUTES = new Set([
  '/internal/ingestion/execute',
  '/internal/ingestion/retry',
  '/internal/ingestion/recover',
  '/internal/ingestion/status',
]);

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function sendJson(res: ServerResponse, status: number, body: unknown, allow?: string): void {
  if (res.destroyed || res.writableEnded) return;
  const bytes = Buffer.from(JSON.stringify(body));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (allow !== undefined) res.setHeader('Allow', allow);
  res.setHeader('Content-Length', bytes.byteLength);
  res.end(bytes);
}

function headerCount(req: IncomingMessage, name: string): number {
  let count = 0;
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (req.rawHeaders[index]?.toLowerCase() === name) count++;
  }
  return count;
}

function authenticated(req: IncomingMessage, expectedDigest: Buffer): boolean {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  const candidate = match?.[1] ?? '';
  const equal = timingSafeEqual(digest(candidate), expectedDigest);
  return headerCount(req, 'authorization') === 1 && match !== null && equal;
}

function jsonContentType(req: IncomingMessage): boolean {
  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string') return false;
  const [mediaType, ...parameters] = contentType.split(';');
  if (mediaType?.trim().toLowerCase() !== 'application/json') return false;
  return parameters.every((parameter) => /^\s*[!#$%&'*+.^_`|~0-9A-Za-z-]+\s*=\s*[^;\s]+\s*$/.test(parameter));
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let length = 0;
  let exceeded = false;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    length += bytes.byteLength;
    if (length > INTERNAL_HTTP_BODY_LIMIT) {
      exceeded = true;
      chunks.length = 0;
    } else if (!exceeded) {
      chunks.push(bytes);
    }
  }
  if (exceeded) throw new InternalHttpTransportError(413, 'PAYLOAD_TOO_LARGE');
  if (length === 0) throw new InternalHttpTransportError(400, 'EMPTY_BODY');
  return Buffer.concat(chunks, length);
}

function parseJson(bytes: Buffer): unknown {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new InternalHttpTransportError(400, 'INVALID_ENCODING');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new InternalHttpTransportError(400, 'INVALID_ENCODING');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InternalHttpTransportError(400, 'INVALID_JSON');
  }
}

async function dispatch(
  path: string,
  body: unknown,
  service: InternalIngestionService,
): Promise<unknown> {
  switch (path) {
    case '/internal/ingestion/execute':
      return service.execute(parseExecuteRequest(body));
    case '/internal/ingestion/retry':
      return service.retry(parseRetryRequest(body));
    case '/internal/ingestion/recover': {
      const request = parseRecoverRequest(body);
      await service.recover(request);
      return { outcome: 'recovered', release_id: request.release_id, run_id: request.run_id };
    }
    case '/internal/ingestion/status':
      return service.status(parseStatusRequest(body));
    default:
      throw new InternalHttpTransportError(404, 'NOT_FOUND');
  }
}

export function createInternalIngestionHttpServer(
  options: InternalIngestionHttpServerOptions,
): Server {
  if (typeof options.serviceToken !== 'string' || options.serviceToken.length < 32) {
    throw new Error('Invalid internal HTTP configuration');
  }
  const expectedDigest = digest(options.serviceToken);
  return createServer((req, res) => {
    void (async () => {
      const path = req.url ?? '';
      if (!ROUTES.has(path)) {
        sendJson(res, 404, { error_code: 'NOT_FOUND', retryable: false });
        return;
      }
      if (req.method !== 'POST') {
        sendJson(res, 405, { error_code: 'METHOD_NOT_ALLOWED', retryable: false }, 'POST');
        return;
      }
      if (!authenticated(req, expectedDigest)) {
        sendJson(res, 401, { error_code: 'UNAUTHORIZED', retryable: false });
        return;
      }
      if (!jsonContentType(req)) {
        sendJson(res, 415, { error_code: 'UNSUPPORTED_MEDIA_TYPE', retryable: false });
        return;
      }
      try {
        const result = await dispatch(path, parseJson(await readBody(req)), options.service);
        // Client disconnect does not cancel or repeat service work. A lost response is reconciled via status.
        sendJson(res, 200, result);
      } catch (error) {
        const mapped = mapInternalHttpError(error);
        sendJson(res, mapped.status, mapped.body);
      }
    })().catch(() => {
      sendJson(res, 500, { error_code: 'INTERNAL_ERROR', retryable: false });
    });
  });
}

