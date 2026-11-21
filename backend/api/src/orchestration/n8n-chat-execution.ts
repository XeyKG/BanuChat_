import type { ChatTurnRoute } from '../application/messages.js';
import type { AuthCode } from '../auth/primitives.js';
import type { RagStage, RagTurnMetrics } from '../operations/rag-metrics.js';

interface Timing {
  operation_id: string;
  sequence: number;
  started_at: string;
  route: ChatTurnRoute | 'unknown';
  duration_ms: number;
  stage?: RagStage;
  rag?: RagTurnMetrics;
}

export type ChatTurnOutcome =
  | { status: 'started'; finished_at?: never }
  | { status: 'answered' | 'partial' | 'insufficient_evidence' | 'cancelled'; finished_at: string; citation_count: number }
  | { status: 'error'; finished_at: string; error_code: AuthCode };

export type ChatTurnExecution = Timing & ChatTurnOutcome;

export type ChatTurnObserver = (event: ChatTurnExecution) => void;

/** Delivers bounded, best-effort metadata independently of the chat response. */
export function createN8nChatObserver(send: typeof fetch = fetch): ChatTurnObserver {
  let inFlight = 0;
  return event => {
    if (inFlight >= 16) {
      console.warn('BanuChat: registro de ejecuciones n8n ocupado.');
      return;
    }
    inFlight++;
    const payload = {
      operation_id: event.operation_id,
      sequence: event.sequence,
      started_at: event.started_at,
      finished_at: event.finished_at ?? null,
      route: event.route,
      duration_ms: event.duration_ms,
      stage: event.stage ?? null,
      status: event.status,
      error_code: event.status === 'error' ? event.error_code : null,
      citation_count: 'citation_count' in event ? event.citation_count : 0,
      ...(event.rag ? { rag: {
        embedding_ms: event.rag.embedding_ms ?? null,
        retrieval_ms: event.rag.retrieval_ms ?? null,
        generation_ms: event.rag.generation_ms ?? null,
        ollama_http_ms: event.rag.ollama_http_ms ?? null,
        ollama_calls: event.rag.ollama_calls,
        ollama_timeouts: event.rag.ollama_timeouts,
      } } : {}),
    };
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body) > 1024) {
      inFlight--;
      return;
    }
    // The collector is bound to loopback and blocked at Caddy. No session or service credential is sent or stored.
    void Promise.resolve().then(async () => {
      const result = await send('http://127.0.0.1:15679/webhook/banuchat/internal/chat-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(3_000),
      });
      await result.body?.cancel();
      if (!result.ok) throw new Error('n8n chat execution rejected');
    }).catch(() => console.warn('BanuChat: no se pudo registrar una ejecución de chat en n8n.'))
      .finally(() => { inFlight--; });
  };
}
