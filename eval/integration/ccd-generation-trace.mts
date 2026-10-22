/** Evaluation-only observation. Does not change the production client's signals or responses. */
export interface ProviderEvent {
  path: string; stage: 'verification_before'|'generation'|'verification_after';
  elapsed_ms: number; status?: number; aborted?: boolean; exception_name?: string; abort_reason_name?: string;
  body_observation_ms?: number; provider_error?: string; body_bytes?: number;
  done?: unknown; done_reason?: unknown; prompt_eval_count?: unknown; eval_count?: unknown;
  load_duration_ms?: number; prompt_eval_duration_ms?: number; eval_duration_ms?: number;
  content_chars?: number; thinking_chars?: number;
}

export function sanitizeProviderError(body: string): string {
  let message: unknown;
  try { const value=JSON.parse(body); message=typeof value?.error==='string'?value.error:undefined; } catch { /* no arbitrary HTML/plain payloads */ }
  if(typeof message!=='string')return '[provider error body omitted: no string error field]';
  return message.replace(/[\u0000-\u001f\u007f]/gu,' ')
    .replace(/\b(?:bearer\s+\S+|(?:password|token|api[_-]?key|secret)\s*[:=]\s*\S+)/giu,'[credential redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,'[email redacted]')
    .replace(/\bU\d{7,}\b/gu,'[identifier redacted]')
    .replace(/\b[A-Z]:[\\/][^\s"']+/giu,'[path redacted]')
    .replace(/\/(?:Users|home|mnt|tmp)\/[^\s"']+/gu,'[path redacted]')
    .replace(/https?:\/\/[^\s"']+/giu,'[url redacted]').slice(0,600);
}

export function tracedGeneratorFetch(events: ProviderEvent[], transport: typeof fetch=fetch): typeof fetch {
  let chatStarted=false;
  return async(input,init)=>{
    const path=new URL(input instanceof Request?input.url:String(input)).pathname;
    const stage=path==='/api/chat'?'generation':chatStarted?'verification_after':'verification_before';
    if(path==='/api/chat')chatStarted=true;
    const start=performance.now();
    const event:ProviderEvent={path,stage,elapsed_ms:0};events.push(event);
    try{
      const response=await transport(input,init);event.status=response.status;event.elapsed_ms=performance.now()-start;
      const observe=performance.now();
      try{
        if(!response.ok){const body=await response.clone().text();event.body_bytes=Buffer.byteLength(body);event.provider_error=sanitizeProviderError(body);}
        else if(path==='/api/chat'){
          const body=await response.clone().json() as Record<string,any>;
          for(const key of ['done','done_reason','prompt_eval_count','eval_count'] as const)event[key]=body[key];
          for(const key of ['load_duration','prompt_eval_duration','eval_duration'] as const)if(typeof body[key]==='number')event[`${key}_ms`]=body[key]/1e6;
          event.content_chars=typeof body.message?.content==='string'?body.message.content.length:0;
          event.thinking_chars=typeof body.message?.thinking==='string'?body.message.thinking.length:0;
        }
      }catch(error){event.provider_error='[diagnostic copy could not be read]';event.aborted=init?.signal?.aborted??false;
        event.exception_name=error instanceof Error?error.name:'unknown';event.abort_reason_name=init?.signal?.reason instanceof Error?init.signal.reason.name:undefined;}
      event.body_observation_ms=performance.now()-observe;
      return response;
    }catch(error){
      event.elapsed_ms=performance.now()-start;event.aborted=init?.signal?.aborted??false;
      event.abort_reason_name=init?.signal?.reason instanceof Error?init.signal.reason.name:undefined;
      event.exception_name=error instanceof Error?error.name:'unknown';throw error;
    }
  };
}
