import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Oe2Category, Oe2RunResult } from './types.js';
import { Oe2FlowError } from './errors.js';

const CATEGORIES = new Set<Oe2Category>(['academic_offer', 'calls', 'news']);
const BODY_LIMIT = 16 * 1024;

export interface Oe2HttpService {
  run(category: Oe2Category, sourceId: string, operationId?: string): Promise<Oe2RunResult>;
  status(category: Oe2Category): Promise<unknown>;
}

function digest(value: string): Buffer { return createHash('sha256').update(value).digest(); }
function send(res: ServerResponse, status: number, body: unknown): void {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Length': bytes.length });
  res.end(bytes);
}
function authenticated(req: IncomingMessage, expected: Buffer): boolean {
  const match = typeof req.headers.authorization === 'string'
    ? /^Bearer ([^\s]+)$/.exec(req.headers.authorization) : null;
  return match !== null && timingSafeEqual(digest(match[1]!), expected);
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    length += bytes.length; if (length > BODY_LIMIT) throw new Error('too_large'); chunks.push(bytes);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
  return parsed as Record<string, unknown>;
}

export function createOe2HttpServer(service: Oe2HttpService, serviceToken: string) {
  if (serviceToken.length < 32 || /\s/u.test(serviceToken)) throw new Error('Invalid OE2 HTTP configuration');
  const expected = digest(serviceToken);
  return createServer((req, res) => void (async () => {
    if (req.method !== 'POST' || (req.url !== '/internal/oe2/run' && req.url !== '/internal/oe2/status')) {
      send(res, 404, { error_code: 'NOT_FOUND', retryable: false }); return;
    }
    if (!authenticated(req, expected)) { send(res, 401, { error_code: 'UNAUTHORIZED', retryable: false }); return; }
    let request: Record<string,unknown>,category:Oe2Category,operationId:string|undefined;
    try {
      request = await body(req);
      if (typeof request.category !== 'string' || !CATEGORIES.has(request.category as Oe2Category)) throw new Error('category');
      category = request.category as Oe2Category;
      const correlation=req.headers['x-banuchat-operation-id'];
      if (correlation!==undefined && (typeof correlation!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/u.test(correlation))) throw new Error('correlation');
      operationId=correlation;
      if (req.url === '/internal/oe2/status') {
        if (Object.keys(request).some(key => key !== 'category')) throw new Error('fields');
      } else if (Object.keys(request).some(key => !['category', 'source_id'].includes(key))
        || typeof request.source_id !== 'string' || request.source_id.length === 0) throw new Error('fields');
    } catch { send(res,400,{error_code:'INVALID_REQUEST',retryable:false}); return; }
    try {
      if (req.url === '/internal/oe2/status') send(res,200,await service.status(category));
      else send(res,200,await service.run(category,request.source_id as string,operationId));
    } catch (error) {
      const message=error instanceof Error?error.message:'';
      const code=error instanceof Oe2FlowError?error.code:message==='OE2_SOURCE_NOT_AUTHORIZED'?'SOURCE_NOT_AUTHORIZED'
        :message.startsWith('OE2_')?'SOURCE_INVALID':'INTERNAL_ERROR';
      const status=code==='SOURCE_NOT_AUTHORIZED'?403:code==='SOURCE_INVALID'?400:code==='SOURCE_EMPTY'?422:
        code==='RUN_IN_PROGRESS'?409:['SOURCE_UNAVAILABLE','STATE_ERROR'].includes(code)?503:500;
      send(res,status,{error_code:code,retryable:code==='SOURCE_UNAVAILABLE'});
    }
  })().catch(() => send(res, 500, { error_code: 'INTERNAL_ERROR', retryable: false })));
}
