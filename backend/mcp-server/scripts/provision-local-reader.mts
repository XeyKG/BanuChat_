import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { assertReadOnlySynthetic } from "../src/runtime.js";

const ROLE = "banuchat_mcp_reader";
const OUTPUT = fileURLToPath(
  new URL("../../../infra/local/oe6/mcp-reader.env", import.meta.url),
);
const TABLES = [
  "datasets",
  "dataset_releases",
  "embedding_configs",
  "documents",
  "document_versions",
  "courses",
  "calendar_events",
  "announcements",
  "synthetic_profiles",
  "profile_courses",
] as const;

function required(name: "POSTGRES_DB" | "POSTGRES_USER" | "POSTGRES_PASSWORD"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_required`);
  return value;
}

function port(): number {
  const value = Number(process.env.POSTGRES_PORT ?? "5432");
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("POSTGRES_PORT_invalid");
  }
  return value;
}

async function formatted(pool: Pool, template: string, ...values: string[]): Promise<string> {
  const result = await pool.query<{ statement: string }>(
    "SELECT format($1, VARIADIC $2::text[]) AS statement",
    [template, values],
  );
  const statement = result.rows[0]?.statement;
  if (!statement) throw new Error("sql_format_failed");
  return statement;
}

async function main(): Promise<void> {
  const outputExists = await access(OUTPUT).then(() => true, () => false);
  if (outputExists) throw new Error("mcp_reader_environment_already_exists");
  const database = required("POSTGRES_DB");
  if (database.toLowerCase().includes("ccd")) throw new Error("ccd_destination_rejected");
  const admin = new Pool({
    host: "127.0.0.1",
    port: port(),
    database,
    user: required("POSTGRES_USER"),
    password: required("POSTGRES_PASSWORD"),
    max: 1,
  });
  const password = randomBytes(32).toString("base64url");
  try {
    const target = await admin.query<{ safe: boolean }>(`SELECT
      current_database() = $1
      AND EXISTS (
        SELECT 1
        FROM banuchat.datasets d
        JOIN banuchat.dataset_releases r
          ON r.id = d.current_release_id AND r.dataset_id = d.id
        WHERE d.id = 1 AND d.name = 'banuchat-synthetic'
          AND r.status = 'ready' AND r.manifest->'synthetic' = 'true'::jsonb
      )
      AND NOT EXISTS (
        SELECT 1 FROM banuchat.datasets WHERE name <> 'banuchat-synthetic'
      ) AS safe`, [database]);
    if (target.rows[0]?.safe !== true) throw new Error("synthetic_destination_rejected");

    const memberships = await admin.query(`SELECT 1
      FROM pg_auth_members m
      JOIN pg_roles member_role ON member_role.oid = m.member
      WHERE member_role.rolname = $1`, [ROLE]);
    if (memberships.rowCount !== 0) throw new Error("existing_role_has_memberships");

    await admin.query("BEGIN");
    try {
      const existing = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE]);
      if (existing.rowCount === 0) {
        await admin.query(`CREATE ROLE banuchat_mcp_reader`);
      }
      await admin.query(`ALTER ROLE banuchat_mcp_reader
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS
        CONNECTION LIMIT 5`);
      await admin.query(await formatted(admin,
        "ALTER ROLE %I LOGIN PASSWORD %L", ROLE, password));
      await admin.query(`ALTER ROLE banuchat_mcp_reader
        SET default_transaction_read_only = on`);
      await admin.query(`ALTER ROLE banuchat_mcp_reader SET statement_timeout = '15s'`);
      await admin.query(await formatted(admin,
        "REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I", database, ROLE));
      await admin.query(await formatted(admin,
        "GRANT CONNECT ON DATABASE %I TO %I", database, ROLE));
      await admin.query(`REVOKE ALL PRIVILEGES ON SCHEMA public, banuchat FROM banuchat_mcp_reader`);
      await admin.query(`GRANT USAGE ON SCHEMA banuchat TO banuchat_mcp_reader`);
      await admin.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA banuchat FROM banuchat_mcp_reader`);
      await admin.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA banuchat FROM banuchat_mcp_reader`);
      await admin.query(`REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA banuchat FROM banuchat_mcp_reader`);
      await admin.query(`GRANT SELECT ON ${TABLES.map(name => `banuchat.${name}`).join(", ")}
        TO banuchat_mcp_reader`);
      await admin.query(`GRANT EXECUTE ON FUNCTION banuchat.current_retrieval_context()
        TO banuchat_mcp_reader`);
      await admin.query(`GRANT EXECUTE ON FUNCTION banuchat.search_chunks_cosine(public.vector, integer, uuid)
        TO banuchat_mcp_reader`);
      await admin.query("COMMIT");
    } catch (error) {
      await admin.query("ROLLBACK");
      throw error;
    }

    const reader = new Pool({
      host: "127.0.0.1",
      port: port(),
      database,
      user: ROLE,
      password,
      options: "-c default_transaction_read_only=on -c statement_timeout=15000",
      max: 1,
    });
    try {
      await assertReadOnlySynthetic({
        async query<T>(text: string, values?: readonly unknown[]) {
          const result = await reader.query(text, values === undefined ? undefined : [...values]);
          return { rows: result.rows as T[] };
        },
      });
      const denied = await reader.query("CREATE TABLE banuchat.oe6_forbidden(value integer)")
        .then(() => false, () => true);
      if (!denied) throw new Error("write_probe_unexpectedly_succeeded");
    } finally {
      await reader.end();
    }

    await mkdir(fileURLToPath(new URL("../../../infra/local/oe6/", import.meta.url)), {
      recursive: true,
    });
    const contents = [
      `MCP_POSTGRES_DB=${database}`,
      `MCP_POSTGRES_USER=${ROLE}`,
      `MCP_POSTGRES_PASSWORD=${password}`,
      "MCP_POSTGRES_HOST=127.0.0.1",
      `MCP_POSTGRES_PORT=${port()}`,
      "",
    ].join("\n");
    await writeFile(OUTPUT, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
    if (process.platform === "win32") {
      const identity = process.env.USERNAME === undefined ? undefined
        : `${process.env.USERDOMAIN ?? "."}\\${process.env.USERNAME}`;
      try {
        if (identity === undefined) throw new Error("windows_identity_unavailable");
        execFileSync("icacls", [OUTPUT, "/inheritance:r", "/grant:r", `${identity}:(F)`], {
          stdio: "ignore",
        });
      } catch (error) {
        await rm(OUTPUT, { force: true });
        throw error;
      }
    }
    console.log(JSON.stringify({
      status: "PASS",
      role: ROLE,
      database,
      output: "infra/local/oe6/mcp-reader.env",
      checks: ["synthetic_target", "least_privilege_preflight", "write_denied"],
    }));
  } finally {
    await admin.end();
  }
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "mcp_reader_provision_failed");
  process.exitCode = 1;
});
