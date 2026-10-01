import {
  QueryEmbeddingClientError,
  type QueryEmbeddingClient,
  type QueryEmbeddingConfig,
} from "./query-embedding-client.js";

const MAX_TIMEOUT_MS = 300_000;

type Fetch = typeof fetch;

function reject(
  reason:
    | "embedding_runtime_mismatch"
    | "embedding_unavailable"
    | "invalid_embedding_response",
): never {
  throw new QueryEmbeddingClientError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(
  value: unknown,
  reason: "embedding_runtime_mismatch" | "invalid_embedding_response",
): Record<string, unknown> {
  if (!isRecord(value)) {
    return reject(reason);
  }
  return value;
}

function validateVector(value: unknown, expectedDimension: number): number[] {
  if (!Array.isArray(value) || value.length !== expectedDimension) {
    return reject("invalid_embedding_response");
  }

  let nonzero = false;
  const vector = value.map((component) => {
    if (
      typeof component !== "number" ||
      !Number.isFinite(component) ||
      !Number.isFinite(Math.fround(component))
    ) {
      return reject("invalid_embedding_response");
    }
    if (Math.fround(component) !== 0) {
      nonzero = true;
    }
    return component;
  });

  if (!nonzero) {
    return reject("invalid_embedding_response");
  }
  return vector;
}

export class OllamaQueryEmbeddingClient implements QueryEmbeddingClient {
  private readonly baseUrl!: URL;

  constructor(
    baseUrl: string,
    private readonly timeoutMs = 120_000,
    private readonly fetchImplementation: Fetch = fetch,
  ) {
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      return reject("embedding_unavailable");
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
      return reject("embedding_unavailable");
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
      return reject("embedding_unavailable");
    }

    if (response.status >= 300 && response.status < 400) {
      return reject("embedding_unavailable");
    }
    if (!response.ok) {
      return reject(
        response.status >= 500
          ? "embedding_unavailable"
          : "invalid_embedding_response",
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      return reject("invalid_embedding_response");
    }
  }

  private async verifyRuntime(expected: QueryEmbeddingConfig): Promise<void> {
    const versionResponse = record(
      await this.request("/api/version"),
      "embedding_runtime_mismatch",
    );
    if (versionResponse.version !== expected.runtime_version) {
      return reject("embedding_runtime_mismatch");
    }

    const tagsResponse = record(
      await this.request("/api/tags"),
      "embedding_runtime_mismatch",
    );
    if (!Array.isArray(tagsResponse.models)) {
      return reject("embedding_runtime_mismatch");
    }
    const model = tagsResponse.models.find(
      (candidate) =>
        isRecord(candidate) &&
        (candidate.name === expected.model || candidate.model === expected.model),
    );
    if (!isRecord(model) || model.digest !== expected.model_revision) {
      return reject("embedding_runtime_mismatch");
    }

    const showResponse = record(
      await this.request("/api/show", { model: expected.model }),
      "embedding_runtime_mismatch",
    );
    if (
      !Array.isArray(showResponse.capabilities) ||
      !showResponse.capabilities.includes("embedding")
    ) {
      return reject("embedding_runtime_mismatch");
    }
    const modelInfo = record(
      showResponse.model_info,
      "embedding_runtime_mismatch",
    );
    const architecture = modelInfo["general.architecture"];
    if (typeof architecture !== "string" || architecture.length === 0) {
      return reject("embedding_runtime_mismatch");
    }
    if (
      modelInfo[`${architecture}.embedding_length`] !== expected.dimension ||
      modelInfo[`${architecture}.context_length`] !==
        expected.query.options.num_ctx
    ) {
      return reject("embedding_runtime_mismatch");
    }
  }

  async embedQuery(
    text: string,
    expected: QueryEmbeddingConfig,
  ): Promise<number[]> {
    await this.verifyRuntime(expected);

    const response = record(
      await this.request("/api/embed", {
        model: expected.model,
        input: [
          expected.query.input_prefix === null
            ? text
            : `${expected.query.input_prefix}${text}`,
        ],
        dimensions: expected.query.dimensions,
        truncate: expected.query.truncate,
        options: expected.query.options,
      }),
      "invalid_embedding_response",
    );
    if (
      "error" in response ||
      response.truncated === true ||
      (response.model !== undefined && response.model !== expected.model) ||
      !Array.isArray(response.embeddings) ||
      response.embeddings.length !== 1
    ) {
      return reject("invalid_embedding_response");
    }

    const vector = validateVector(response.embeddings[0], expected.dimension);
    await this.verifyRuntime(expected);
    return vector;
  }
}
