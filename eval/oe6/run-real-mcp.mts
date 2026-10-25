import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { StdioMcpClientFactory, type McpToolName } from "../../backend/api/src/agent/mcp-client.js";

const profileKey = process.env.BANUCHAT_OE6_PROFILE_KEY ?? "profile-001";
const calls: Array<{ tool: McpToolName; input: Record<string, unknown> }> = [
  { tool: "get_courses", input: { limit: 3 } },
  { tool: "get_calendar_events", input: { date_from: "2026-10-01", date_to: "2026-11-30", limit: 3 } },
  { tool: "get_announcements", input: { temporal_status: "all", reference_time: "2026-10-25T12:00:00-05:00", limit: 3 } },
  { tool: "get_profile_progress", input: { limit: 3 } },
  { tool: "find_documents", input: { query: "incidencia", limit: 3 } },
  { tool: "search_knowledge", input: { query: "¿Qué información debo incluir al reportar una incidencia?", top_k: 3 } },
];

function count(tool: McpToolName, output: Record<string, unknown>): number {
  const key = tool === "get_courses" || tool === "get_profile_progress" ? "courses"
    : tool === "get_calendar_events" ? "events"
      : tool === "get_announcements" ? "announcements"
        : tool === "find_documents" ? "documents" : "matches";
  const rows = output[key];
  if (!Array.isArray(rows)) throw new Error(`${tool}_rows_invalid`);
  return rows.length;
}

const factory = new StdioMcpClientFactory({
  environment: {
    MCP_POSTGRES_DB: process.env.MCP_POSTGRES_DB ?? "",
    MCP_POSTGRES_USER: process.env.MCP_POSTGRES_USER ?? "",
    MCP_POSTGRES_PASSWORD: process.env.MCP_POSTGRES_PASSWORD ?? "",
    MCP_POSTGRES_HOST: process.env.MCP_POSTGRES_HOST ?? "127.0.0.1",
    MCP_POSTGRES_PORT: process.env.MCP_POSTGRES_PORT ?? "5432",
  },
});

const startedAt = new Date().toISOString();
const session = await factory.open(profileKey);
const results: Array<Record<string, unknown>> = [];
try {
  for (const item of calls) {
    const started = performance.now();
    const output = await session.call(item.tool, item.input);
    results.push({
      tool: item.tool,
      duration_ms: Math.round(performance.now() - started),
      release_id: output.release_id,
      records: count(item.tool, output),
      outcome: "PASS",
    });
  }
} finally {
  await session.close();
}

const releases = new Set(results.map(result => result.release_id));
if (releases.size !== 1) throw new Error("mcp_release_mismatch");
const report = {
  schema_version: "banuchat-oe6-real-mcp-1",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  profile_key: profileKey,
  transport: "MCP stdio",
  dependencies: ["PostgreSQL/pgvector real", "Ollama real"],
  fixtures_or_mocks: false,
  release_id: [...releases][0],
  results,
  status: "PASS",
};
const output = fileURLToPath(new URL("./results/oe6-mcp-real-2026-10-25.json", import.meta.url));
await mkdir(fileURLToPath(new URL("./results/", import.meta.url)), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, output: "eval/oe6/results/oe6-mcp-real-2026-10-25.json" }));
