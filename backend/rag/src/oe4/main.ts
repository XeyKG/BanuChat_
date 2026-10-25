import { fileURLToPath, pathToFileURL } from "node:url";
import { Pool } from "pg";
import { runCalendarFixtureSync } from "./calendar-sync.js";
import { createCalendarSyncHttpServer } from "./server.js";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) throw new Error(name);
  return value;
}
function port(name: string, fallback: number): number {
  const raw = process.env[name] ?? String(fallback);
  if (!/^\d+$/u.test(raw)) throw new Error(name);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) throw new Error(name);
  return value;
}

export async function startOe4CalendarService(): Promise<void> {
  const token = required("BANUCHAT_OE4_SERVICE_TOKEN");
  const workflowRef = process.env.BANUCHAT_OE4_CALENDAR_WORKFLOW_REF ??
    "n8n/workflows/oe4-calendar-sync-fixture-v1.json";
  const database = required("POSTGRES_DB");
  const postgresPort = port("POSTGRES_PORT", 5432);
  if (database.toLowerCase().includes("ccd") || postgresPort === 55433) {
    throw new Error("OE4_SYNTHETIC_DATABASE_REQUIRED");
  }
  const pool = new Pool({ host: "127.0.0.1", port: postgresPort,
    database, user: required("POSTGRES_USER"),
    password: required("POSTGRES_PASSWORD") });
  const fixtureRoot = fileURLToPath(new URL("../../../../eval/oe4/fixtures/", import.meta.url));
  const service = {
    sync: (sourceId: string, suppliedWorkflowRef: string) => {
      if (suppliedWorkflowRef !== workflowRef) throw new Error("OE4_CALENDAR_SOURCE_NOT_AUTHORIZED");
      return runCalendarFixtureSync({ pool, fixture_root: fixtureRoot,
        source_id: sourceId as "fixture-calendar-sheet-v1", workflow_ref: workflowRef });
    },
    async status() {
      const result = await pool.query(`SELECT r.id AS release_id,r.manifest->'calendar_sync' AS calendar_sync
        FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
        WHERE d.id=1 AND r.status='ready'`);
      return result.rows[0] ?? { release_id: null, calendar_sync: null };
    },
  };
  const server = createCalendarSyncHttpServer(service, token);
  const host = process.env.BANUCHAT_OE4_INTERNAL_HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "0.0.0.0") throw new Error("BANUCHAT_OE4_INTERNAL_HOST");
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port("BANUCHAT_OE4_INTERNAL_PORT", 3012), host, resolve);
  });
  const shutdown = (): void => {
    server.close(() => void pool.end());
  };
  process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
  console.log(`BanuChat OE4 calendar service listening on ${host}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startOe4CalendarService().catch(() => { process.exitCode = 1; console.error("BanuChat OE4 calendar service failed"); });
}
