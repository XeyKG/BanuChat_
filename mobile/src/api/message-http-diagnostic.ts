// Development console only. Never receive request inputs, URLs, headers or credentials.
const ERROR_CODES = new Set([
  'INVALID_ARGUMENT', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT',
  'INVALID_RESET', 'METHOD_NOT_ALLOWED', 'PAYLOAD_TOO_LARGE', 'RATE_LIMITED',
  'INTERNAL_ERROR', 'DEPENDENCY_UNAVAILABLE',
]);
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface Diagnostic {
  http_status: number;
  duration_ms: number;
  error_code?: string;
  request_id?: string;
}
function enabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true &&
    process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP === '1';
}
export function startMessageHttpDiagnostic(): number | undefined {
  return enabled() ? Date.now() : undefined;
}
function emit(record: Diagnostic): void {
  try { console.info('[BanuChat message HTTP]', record); }
  catch { /* A diagnostic sink must never affect a request. */ }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function recordRejectedMessageHttp(response: Response, started: number | undefined): void {
  if (!enabled() || started === undefined || response.status === 201) return;
  const elapsed = Date.now() - started;
  const diagnostic: Diagnostic = {
    http_status: response.status,
    duration_ms: Number.isFinite(elapsed) ? Math.max(0, Math.round(elapsed)) : 0,
  };
  // Always expose the status immediately, even if the error body is malformed or stalls.
  emit(diagnostic);
  try {
    // Detached clone: do not await, consume the caller's body, retry, or delay its classification.
    void response.clone().json().then((body: unknown) => {
      if (!record(body) || !record(body.error)) return;
      const code = body.error.code;
      const requestId = body.error.request_id;
      const metadata: Pick<Diagnostic, 'error_code' | 'request_id'> = {};
      if (typeof code === 'string' && ERROR_CODES.has(code)) metadata.error_code = code;
      if (typeof requestId === 'string' && requestId.length === 36 && REQUEST_ID.test(requestId)) {
        metadata.request_id = requestId;
      }
      if (enabled() && Object.keys(metadata).length > 0) emit({ ...diagnostic, ...metadata });
    }).catch(() => { /* Keep the status already emitted; never log parsing errors or the body. */ });
  } catch { /* Cloning is optional for metadata; status remains observable. */ }
}
