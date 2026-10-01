import {
  GeneratorClientError,
  type GeneratorClient,
  type GeneratorClientErrorReason,
  type GeneratorConfig,
  type GeneratorInput,
  type GeneratorResult,
} from "./generator-client.js";

const MAX_TIMEOUT_MS = 300_000;
const MODEL = "qwen3:4b-instruct";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
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
    !DIGEST_PATTERN.test(expected.model_revision) ||
    !SEMVER_PATTERN.test(expected.runtime_version) ||
    expected.recipe.think !== false ||
    expected.recipe.stream !== false ||
    expected.recipe.keep_alive !== "5m" ||
    expected.recipe.options.temperature !== 0 ||
    expected.recipe.options.num_predict !== 128
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
  ) {
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

  private async request(path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImplementation(new URL(path, this.baseUrl), {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      return reject("generator_unavailable");
    }

    if (response.status >= 300 && response.status < 400) {
      return reject("generator_unavailable");
    }
    if (!response.ok) {
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
    if (!isRecord(model) || model.digest !== expected.model_revision) {
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

    const response = record(
      await this.request("/api/chat", {
        model: expected.model,
        stream: false,
        think: false,
        keep_alive: "5m",
        options: {
          temperature: 0,
          num_predict: 128,
        },
        messages: [
          { role: "system", content: input.system_prompt },
          { role: "user", content: input.user_prompt },
        ],
      }),
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

    await this.verifyRuntime(expected);
    return result;
  }
}
