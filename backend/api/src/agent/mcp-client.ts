import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { Client, type CallToolResult, type Tool } from "@modelcontextprotocol/client";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/client/stdio";
import { Ajv2020, type AnySchema, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const PROTOCOL_REVISION = "2026-07-28";
const EXPECTED_TOOLS = [
  "search_knowledge",
  "find_documents",
  "get_courses",
  "get_calendar_events",
  "get_announcements",
  "get_profile_progress",
] as const;

export type McpToolName = (typeof EXPECTED_TOOLS)[number];

interface ToolContract {
  mcpProtocolRevision: string;
  tools: Tool[];
  executionErrorSchema: object;
}

interface ContractState {
  contract: ToolContract;
  validators: Map<McpToolName, { input: ValidateFunction; output: ValidateFunction }>;
  executionErrorValidator: ValidateFunction;
}

let cachedContract: ContractState | undefined;
function loadContract(): ContractState {
  if (cachedContract !== undefined) return cachedContract;
  const contract = JSON.parse(
    readFileSync(
      new URL("../../../mcp-server/tools.contract.json", import.meta.url),
      "utf8",
    ),
  ) as ToolContract;
  if (
    contract.mcpProtocolRevision !== PROTOCOL_REVISION ||
    JSON.stringify(contract.tools.map((tool) => tool.name)) !==
      JSON.stringify(EXPECTED_TOOLS)
  ) {
    throw new Error("mcp_client_contract_mismatch");
  }
  const ajv = new Ajv2020({ strict: true, strictTypes: false, allErrors: true, validateFormats: true });
  addFormats.default(ajv);
  const validators = new Map<McpToolName, { input: ValidateFunction; output: ValidateFunction }>();
  for (const tool of contract.tools) {
    validators.set(tool.name as McpToolName, {
      input: ajv.compile(tool.inputSchema as AnySchema),
      output: ajv.compile(tool.outputSchema as AnySchema),
    });
  }
  cachedContract = { contract, validators,
    executionErrorValidator: ajv.compile(contract.executionErrorSchema as AnySchema) };
  return cachedContract;
}

export type McpClientErrorReason =
  | "invalid_tool"
  | "invalid_input"
  | "invalid_output"
  | "tool_unavailable"
  | "not_found"
  | "timeout";

export class McpClientError extends Error {
  constructor(
    readonly reason: McpClientErrorReason,
    readonly tool?: McpToolName,
  ) {
    super("MCP client operation rejected.");
    this.name = "McpClientError";
  }
}

export interface McpToolSession {
  call(tool: McpToolName, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

export interface McpToolSessionFactory {
  open(profileKey: string): Promise<McpToolSession>;
}

export interface StdioMcpClientOptions {
  cwd?: string;
  command?: string;
  args?: string[];
  environment?: Readonly<Record<string, string>>;
  connect_timeout_ms?: number;
  call_timeout_ms?: number;
}

function parseExecutionError(result: CallToolResult, state: ContractState): McpClientErrorReason {
  const block = result.content.length === 1 ? result.content[0] : undefined;
  if (block?.type !== "text") return "invalid_output";
  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return "invalid_output";
  }
  if (!state.executionErrorValidator(parsed)) return "invalid_output";
  const code = (parsed as { code: string }).code;
  if (code === "DEPENDENCY_UNAVAILABLE") return "tool_unavailable";
  if (code === "NOT_FOUND") return "not_found";
  return "invalid_output";
}

function validateSuccess(
  tool: McpToolName,
  result: CallToolResult,
  state: ContractState,
): Record<string, unknown> {
  if (result.isError === true) {
    throw new McpClientError(parseExecutionError(result, state), tool);
  }
  const output = result.structuredContent;
  const validator = state.validators.get(tool);
  if (
    validator === undefined ||
    typeof output !== "object" ||
    output === null ||
    Array.isArray(output) ||
    !validator.output(output)
  ) {
    throw new McpClientError("invalid_output", tool);
  }
  const block = result.content.length === 1 ? result.content[0] : undefined;
  if (block?.type !== "text") {
    throw new McpClientError("invalid_output", tool);
  }
  let textValue: unknown;
  try {
    textValue = JSON.parse(block.text);
  } catch {
    throw new McpClientError("invalid_output", tool);
  }
  if (!isDeepStrictEqual(textValue, output)) {
    throw new McpClientError("invalid_output", tool);
  }
  return output as Record<string, unknown>;
}

/** Also enforce the frozen output contract for injected session implementations. */
export function validateMcpObservation(tool: McpToolName, output: unknown): void {
  if (!loadContract().validators.get(tool)?.output(output)) {
    throw new McpClientError("invalid_output", tool);
  }
}

export class StdioMcpClientFactory implements McpToolSessionFactory {
  constructor(private readonly options: StdioMcpClientOptions = {}) {}

  async open(profileKey: string): Promise<McpToolSession> {
    const state = loadContract();
    const transport = new StdioClientTransport({
      command: this.options.command ?? process.execPath,
      args: this.options.args ?? ["--import", "tsx", "src/main.ts"],
      cwd:
        this.options.cwd ??
        fileURLToPath(new URL("../../../mcp-server/", import.meta.url)),
      stderr: "pipe",
      env: {
        ...getDefaultEnvironment(),
        ...this.options.environment,
        BANUCHAT_DEMO_MODE: "synthetic",
        MCP_PROFILE_KEY: profileKey,
      },
      maxBufferSize: 256 * 1024,
    });
    // Drain the bounded, sanitized server log so a long-lived API cannot block
    // because the child stderr pipe fills.
    transport.stderr?.on("data", () => undefined);
    const client = new Client(
      { name: "banuchat-api-agent", version: "0.1.0" },
      { versionNegotiation: { mode: { pin: PROTOCOL_REVISION } } },
    );
    try {
      await client.connect(transport, {
        timeout: this.options.connect_timeout_ms ?? 10_000,
      });
      const listed = await client.listTools(undefined, {
        timeout: this.options.connect_timeout_ms ?? 10_000,
      });
      if (!isDeepStrictEqual(listed.tools, state.contract.tools)) {
        throw new McpClientError("invalid_output");
      }
    } catch (error) {
      await client.close().catch(() => undefined);
      if (error instanceof McpClientError) throw error;
      throw new McpClientError("tool_unavailable");
    }

    let closed = false;
    return {
      call: async (tool, input) => {
        if (closed || !EXPECTED_TOOLS.includes(tool)) {
          throw new McpClientError("invalid_tool", tool);
        }
        const validator = state.validators.get(tool);
        if (validator === undefined || !validator.input(input)) {
          throw new McpClientError("invalid_input", tool);
        }
        try {
          const result = await client.callTool(
            { name: tool, arguments: input },
            { timeout: this.options.call_timeout_ms ?? 15_000 },
          );
          return validateSuccess(tool, result, state);
        } catch (error) {
          if (error instanceof McpClientError) throw error;
          const text = error instanceof Error ? `${error.name} ${error.message}` : "";
          const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
          throw new McpClientError(
            code === "REQUEST_TIMEOUT" || /timeout|timed\s+out/iu.test(text) ? "timeout" : "tool_unavailable",
            tool,
          );
        }
      },
      close: async () => {
        if (closed) return;
        closed = true;
        await client.close().catch(() => undefined);
      },
    };
  }
}

