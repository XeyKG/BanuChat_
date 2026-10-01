export interface GeneratorInput {
  system_prompt: string;
  user_prompt: string;
}

export interface GeneratorRecipe {
  think: false;
  stream: false;
  options: {
    temperature: 0;
    num_predict: 256;
  };
  keep_alive: "5m";
}

export interface GeneratorConfig {
  provider: "ollama";
  model: "qwen3:4b-instruct";
  model_revision: string;
  runtime_version: string;
  recipe: GeneratorRecipe;
}

export interface GeneratorResult {
  content: string;
  done_reason: string;
  prompt_eval_count: number;
  eval_count: number;
  total_duration_ms: number;
}

export interface GeneratorClient {
  generate(
    input: GeneratorInput,
    expectedConfig: GeneratorConfig,
  ): Promise<GeneratorResult>;
}

export type GeneratorClientErrorReason =
  | "generator_runtime_mismatch"
  | "generator_unavailable"
  | "invalid_generator_response"
  | "generator_response_incomplete";

export class GeneratorClientError extends Error {
  constructor(readonly reason: GeneratorClientErrorReason) {
    super("Generator request rejected.");
    this.name = "GeneratorClientError";
  }
}

const GENERATOR_MODEL = "qwen3:4b-instruct" as const;
const DIGEST_PATTERN = /^(?:sha256:)?([0-9a-f]{64})$/i;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function normalizeSha256Digest(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return DIGEST_PATTERN.exec(value)?.[1]?.toLowerCase();
}

function validateBaseUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("BANUCHAT_OLLAMA_BASE_URL");
  }
  if (
    parsed.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.port.length === 0 ||
    parsed.pathname !== "/" ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error("BANUCHAT_OLLAMA_BASE_URL");
  }
}

function requireEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name:
    | "BANUCHAT_GENERATOR_MODEL"
    | "BANUCHAT_GENERATOR_MODEL_REVISION"
    | "BANUCHAT_GENERATOR_RUNTIME_VERSION",
): string {
  const value = environment[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(name);
  }
  return value;
}

export interface GeneratorRuntimeConfig {
  base_url: string;
  generator: GeneratorConfig;
}

export function loadGeneratorRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GeneratorRuntimeConfig {
  const baseUrl = environment.BANUCHAT_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = requireEnvironmentValue(environment, "BANUCHAT_GENERATOR_MODEL");
  const revision = requireEnvironmentValue(
    environment,
    "BANUCHAT_GENERATOR_MODEL_REVISION",
  );
  const runtimeVersion = requireEnvironmentValue(
    environment,
    "BANUCHAT_GENERATOR_RUNTIME_VERSION",
  );
  const normalizedRevision = normalizeSha256Digest(revision);

  validateBaseUrl(baseUrl);
  if (model !== GENERATOR_MODEL) {
    throw new Error("BANUCHAT_GENERATOR_MODEL");
  }
  if (normalizedRevision === undefined) {
    throw new Error("BANUCHAT_GENERATOR_MODEL_REVISION");
  }
  if (!SEMVER_PATTERN.test(runtimeVersion)) {
    throw new Error("BANUCHAT_GENERATOR_RUNTIME_VERSION");
  }

  return {
    base_url: baseUrl,
    generator: {
      provider: "ollama",
      model: GENERATOR_MODEL,
      model_revision: normalizedRevision,
      runtime_version: runtimeVersion,
      recipe: {
        think: false,
        stream: false,
        options: { temperature: 0, num_predict: 256 },
        keep_alive: "5m",
      },
    },
  };
}
