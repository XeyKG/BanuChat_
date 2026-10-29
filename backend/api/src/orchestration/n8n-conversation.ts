export type ConversationOrchestrationDirective = "invoke_bounded_mcp_agent" | "request_clarification";

export interface ConversationOrchestrationInput {
  operation_id: string;
  release_id: string;
  required_sources?: number;
  demo_mode: "synthetic" | "ccd_local";
  route: "agent_fallback";
  requested_capability: "bounded_mcp_agent";
}

export interface ConversationOrchestrationResult {
  operation_id: string;
  directive: ConversationOrchestrationDirective;
  release_id: string;
  state: "authorized" | "clarification_required";
  workflow: "oe4-conversation-v1";
}

export interface ConversationOrchestrator {
  orchestrate(input: ConversationOrchestrationInput): Promise<ConversationOrchestrationResult>;
}

export class ConversationOrchestrationError extends Error {
  constructor(readonly reason: "dependency_unavailable" | "invalid_response") {
    super("Conversation orchestration failed.");
    this.name = "ConversationOrchestrationError";
  }
}

export interface N8nConversationOrchestratorOptions {
  url: string;
  service_token: string;
  timeout_ms?: number;
  fetch?: typeof fetch;
  trace?: (result: ConversationOrchestrationResult) => void;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function validUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid N8N conversation configuration");
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") ||
    parsed.port === "" ||
    parsed.pathname === "/" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("Invalid N8N conversation configuration");
  }
  return parsed;
}

function validResult(value: unknown, input: ConversationOrchestrationInput): ConversationOrchestrationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ConversationOrchestrationError("invalid_response");
  }
  const result = value as Record<string, unknown>;
  const needsClarification = (input.required_sources ?? 2) > 2;
  const directive = needsClarification ? "request_clarification" : "invoke_bounded_mcp_agent";
  const state = needsClarification ? "clarification_required" : "authorized";
  if (
    Object.keys(result).some(
      (key) => !["operation_id", "directive", "workflow", "release_id", "state"].includes(key),
    ) ||
    result.operation_id !== input.operation_id ||
    result.release_id !== input.release_id || result.state !== state ||
    result.directive !== directive ||
    result.workflow !== "oe4-conversation-v1"
  ) {
    throw new ConversationOrchestrationError("invalid_response");
  }
  return {
    operation_id: input.operation_id, release_id: input.release_id, state,
    directive,
    workflow: "oe4-conversation-v1",
  };
}

export class N8nConversationOrchestrator implements ConversationOrchestrator {
  private readonly endpoint: URL;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: N8nConversationOrchestratorOptions) {
    this.endpoint = validUrl(options.url);
    if (
      options.service_token.length < 32 ||
      /\s/u.test(options.service_token)
    ) {
      throw new Error("Invalid N8N conversation configuration");
    }
    this.timeoutMs = options.timeout_ms ?? 4_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 100 || this.timeoutMs > 30_000) {
      throw new Error("Invalid N8N conversation configuration");
    }
    this.fetchImplementation = options.fetch ?? fetch;
  }

  async orchestrate(
    input: ConversationOrchestrationInput,
  ): Promise<ConversationOrchestrationResult> {
    if (!UUID_PATTERN.test(input.operation_id) || !UUID_PATTERN.test(input.release_id) ||
        !Number.isInteger(input.required_sources ?? 2) || (input.required_sources ?? 2) < 1 || (input.required_sources ?? 2) > 6) {
      throw new ConversationOrchestrationError("invalid_response");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: "POST",
        headers: {
          "X-BanuChat-Service-Token": this.options.service_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) {
        throw new ConversationOrchestrationError("dependency_unavailable");
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) {
        throw new ConversationOrchestrationError("invalid_response");
      }
      const raw = await response.text();
      if (Buffer.byteLength(raw, "utf8") > 8 * 1024) {
        throw new ConversationOrchestrationError("invalid_response");
      }
      let value: unknown;
      try {
        value = JSON.parse(raw) as unknown;
      } catch {
        throw new ConversationOrchestrationError("invalid_response");
      }
      const result = validResult(value, input);
      this.options.trace?.(result);
      return result;
    } catch (error) {
      if (error instanceof ConversationOrchestrationError) throw error;
      throw new ConversationOrchestrationError("dependency_unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface N8nConversationRuntimeConfig {
  url: string;
  service_token: string;
  timeout_ms: number;
}

export function loadN8nConversationRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): N8nConversationRuntimeConfig | undefined {
  const url = environment.BANUCHAT_N8N_CONVERSATION_URL;
  const token = environment.BANUCHAT_N8N_SERVICE_TOKEN;
  if (url === undefined && token === undefined) return undefined;
  if (url === undefined || token === undefined) {
    throw new Error("Incomplete N8N conversation configuration");
  }
  validUrl(url);
  if (token.length < 32 || /\s/u.test(token)) {
    throw new Error("Invalid N8N conversation configuration");
  }
  const rawTimeout = environment.BANUCHAT_N8N_CONVERSATION_TIMEOUT_MS ?? "4000";
  if (!/^\d+$/u.test(rawTimeout)) throw new Error("Invalid N8N conversation configuration");
  const timeout = Number(rawTimeout);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30_000) {
    throw new Error("Invalid N8N conversation configuration");
  }
  return { url, service_token: token, timeout_ms: timeout };
}
