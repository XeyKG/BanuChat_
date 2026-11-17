import {ragMetrics} from '../operations/rag-metrics.js';
import {
  GeneratorClientError,
  normalizeSha256Digest,
  type GeneratorClient,
  type GeneratorClientErrorReason,
  type GeneratorConfig,
  type GeneratorInput,
  type GeneratorResult,
} from "./generator-client.js";

const MAX_TIMEOUT_MS = 300_000;
const MODEL = "qwen3:4b-instruct";
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

type Fetch = typeof fetch;

function reject(reason: GeneratorClientErrorReason): never {
  throw new GeneratorClientError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(
  value: unknown,
  reason: "generator_runtime_mismatch" | "invalid_generator_response",
): Record<string, unknown> {
  if (!isRecord(value)) {
    return reject(reason);
  }
  return value;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function metric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return reject("invalid_generator_response");
  }
  return value;
}

function validateExpectedConfig(expected: GeneratorConfig): void {
  if (
    expected.provider !== "ollama" ||
    expected.model !== MODEL ||
    normalizeSha256Digest(expected.model_revision) === undefined ||
    !SEMVER_PATTERN.test(expected.runtime_version) ||
    expected.recipe.think !== false ||
    expected.recipe.stream !== false ||
    expected.recipe.keep_alive !== "5m" ||
    expected.recipe.options.temperature !== 0 ||
    expected.recipe.options.num_predict !== 256
  ) {
    return reject("generator_runtime_mismatch");
  }
}

export class OllamaGeneratorClient implements GeneratorClient {
  private readonly baseUrl!: URL;

  constructor(
    baseUrl: string,
    private readonly timeoutMs = 30_000,
    private readonly fetchImplementation: Fetch = fetch,
    private readonly cpuThreads?: number,
  ) {
    if (cpuThreads !== undefined && (!Number.isInteger(cpuThreads) || cpuThreads < 1 || cpuThreads > 32)) {
      reject("generator_unavailable");
    }
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      return reject("generator_unavailable");
    }

    if (
      parsed.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      parsed.port.length === 0 ||
      parsed.pathname !== "/" ||
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0 ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > MAX_TIMEOUT_MS
    ) {
      return reject("generator_unavailable");
    }
    this.baseUrl = parsed;
  }

  private async request(path: string, body?: unknown, classifyCapacity = false): Promise<unknown> {
    let response: Response;
    const startedAt = performance.now();
    const signal = AbortSignal.timeout(this.timeoutMs);
    try {
      response = await this.fetchImplementation(new URL(path, this.baseUrl), {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "error",
        signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      if (path === '/api/chat') ragMetrics('ollama_http', startedAt, {result: signal.aborted ? 'timeout' : 'transport_error'});
      return reject("generator_unavailable");
    }
    if (path === '/api/chat') ragMetrics('ollama_http', startedAt, {status: response.status});

    if (response.status >= 300 && response.status < 400) {
      return reject("generator_unavailable");
    }
    if (!response.ok) {
      if (classifyCapacity && path === '/api/chat' && response.status === 400) {
        // Read only a bounded diagnostic envelope; never attach it to the error.
        try {
          const reader=response.body?.getReader();let size=0;const parts:Uint8Array[]=[];
          if(reader) {
            while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>8192){await reader.cancel();break;}parts.push(next.value);}
            if(size<=8192){
              const value:unknown=JSON.parse(Buffer.concat(parts).toString('utf8'));
              const message=isRecord(value)&&typeof value.error==='string'?value.error:'';
              const counts=[...message.matchAll(/\b([0-9]{1,8})\s+tokens?\b/giu)].map(m=>Number(m[1]));
              if(/\bcontext\b/iu.test(message)&&/exceed|larger than|too (?:long|large)/iu.test(message)
                && counts.length===2 && counts[0]!>counts[1]! && counts[1]!>0) reject('generator_context_capacity_exceeded');
            }
          }
        } catch(error) { if(error instanceof GeneratorClientError)throw error; }
      }
      return reject(
        response.status >= 500
          ? "generator_unavailable"
          : "invalid_generator_response",
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      return reject("invalid_generator_response");
    }
  }

  private async verifyRuntime(expected: GeneratorConfig): Promise<void> {
    const versionResponse = record(
      await this.request("/api/version"),
      "generator_runtime_mismatch",
    );
    if (versionResponse.version !== expected.runtime_version) {
      return reject("generator_runtime_mismatch");
    }

    const tagsResponse = record(
      await this.request("/api/tags"),
      "generator_runtime_mismatch",
    );
    if (!Array.isArray(tagsResponse.models)) {
      return reject("generator_runtime_mismatch");
    }
    const model = tagsResponse.models.find(
      (candidate) =>
        isRecord(candidate) &&
        (candidate.name === expected.model || candidate.model === expected.model),
    );
    const observedDigest = isRecord(model)
      ? normalizeSha256Digest(model.digest)
      : undefined;
    const expectedDigest = normalizeSha256Digest(expected.model_revision);
    if (
      observedDigest === undefined ||
      expectedDigest === undefined ||
      observedDigest !== expectedDigest
    ) {
      return reject("generator_runtime_mismatch");
    }

    const showResponse = record(
      await this.request("/api/show", { model: expected.model }),
      "generator_runtime_mismatch",
    );
    if (
      !Array.isArray(showResponse.capabilities) ||
      !showResponse.capabilities.includes("completion")
    ) {
      return reject("generator_runtime_mismatch");
    }
  }

  async generate(
    input: GeneratorInput,
    expected: GeneratorConfig,
  ): Promise<GeneratorResult> {
    if (
      !isNonBlankString(input.system_prompt) ||
      !isNonBlankString(input.user_prompt)
    ) {
      return reject("invalid_generator_response");
    }
    validateExpectedConfig(expected);
    await this.verifyRuntime(expected);

    const startedAt = performance.now();
    const contextMetrics = {
      prompt_bytes: Buffer.byteLength(input.system_prompt) + Buffer.byteLength(input.user_prompt),
      ...(this.cpuThreads === undefined ? {} : {cpu_threads: this.cpuThreads}),
    };
    ragMetrics('generation_input', startedAt, contextMetrics);
    const response = record(
      await this.request("/api/chat", {
        model: expected.model,
        stream: false,
        think: false,
        keep_alive: "5m",
        options: {
          temperature: 0,
          num_predict: 256,
          ...(this.cpuThreads === undefined ? {} : {num_thread: this.cpuThreads}),
        },
        messages: [
          { role: "system", content: input.system_prompt },
          { role: "user", content: input.user_prompt },
        ],
      }, input.classify_context_capacity === true),
      "invalid_generator_response",
    );

    const message = record(response.message, "invalid_generator_response");
    if (
      !isNonBlankString(message.content) ||
      (typeof message.thinking === "string" && message.thinking.length > 0) ||
      (message.thinking !== undefined && typeof message.thinking !== "string")
    ) {
      return reject("invalid_generator_response");
    }
    if (response.done !== true || response.done_reason !== "stop") {
      return reject("generator_response_incomplete");
    }

    const result: GeneratorResult = {
      content: message.content,
      done_reason: response.done_reason,
      prompt_eval_count: metric(response.prompt_eval_count),
      eval_count: metric(response.eval_count),
      total_duration_ms: metric(response.total_duration) / 1_000_000,
    };
    ragMetrics('generation', startedAt, {
      prompt_tokens: result.prompt_eval_count,
      generated_tokens: result.eval_count,
      total_ms: result.total_duration_ms,
      ...(typeof response.prompt_eval_duration === 'number' && Number.isFinite(response.prompt_eval_duration)
        ? {prompt_eval_ms: response.prompt_eval_duration / 1_000_000} : {}),
      ...(typeof response.eval_duration === 'number' && Number.isFinite(response.eval_duration)
        ? {generation_ms: response.eval_duration / 1_000_000} : {}),
    });

    await this.verifyRuntime(expected);
    return result;
  }
}
