import { randomUUID } from 'node:crypto';

import type { ChatTurnRoute } from '../application/messages.js';
import type { AuthCode } from '../auth/primitives.js';
import type { RagTurnMetrics } from '../operations/rag-metrics.js';

interface Timing {
  route: ChatTurnRoute | 'unknown';
  duration_ms: number;
  rag?: RagTurnMetrics;
}

export type ChatTurnExecution = Timing & (
  | { status: 'answered' | 'partial' | 'insufficient_evidence'; citation_count: number }
  | { status: 'error'; error_code: AuthCode }
);

export type ChatTurnObserver = (event: ChatTurnExecution) => void;

/** Records an admitted turn after it finishes. Only operational metadata leaves the API. */
export function createN8nChatObserver(send: typeof fetch = fetch): ChatTurnObserver {
  let inFlight = 0;
  return event => {
    if (inFlight >= 16) {
      console.warn('BanuChat: registro de ejecuciones n8n ocupado.');
      return;
    }
    inFlight++;
    const payload = {
      operation_id: randomUUID(),
      route: event.route,
      duration_ms: event.duration_ms,
      status: event.status,
      ...(event.status === 'error' ? { error_code: event.error_code } : { citation_count: event.citation_count }),
      ...(event.rag ? { rag: {
        embedding_ms: event.rag.embedding_ms ?? null,
        retrieval_ms: event.rag.retrieval_ms ?? null,
        ollama_http_ms: event.rag.ollama_http_ms ?? null,
        ollama_calls: event.rag.ollama_calls,
        ollama_timeouts: event.rag.ollama_timeouts,
      } } : {}),
    };
    // The collector is bound to loopback and blocked at Caddy. No session or service credential is sent or stored.
    void Promise.resolve().then(async () => {
      const result = await send('http://127.0.0.1:15679/webhook/banuchat/internal/chat-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(3_000),
      });
      await result.body?.cancel();
      if (!result.ok) throw new Error('n8n chat execution rejected');
    }).catch(() => console.warn('BanuChat: no se pudo registrar una ejecución de chat en n8n.'))
      .finally(() => { inFlight--; });
  };
}
