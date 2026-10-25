#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const source = process.env.BANUCHAT_POSTGRES_CONTAINER ?? "banuchat-postgres";
const target = `banuchat-oe6-restore-${randomUUID().slice(0, 8)}`;
const root = fileURLToPath(new URL("../../", import.meta.url));
const backupDirectory = fileURLToPath(new URL("../local/oe6/backups/", import.meta.url));
const backup = fileURLToPath(new URL("../local/oe6/backups/synthetic-2026-10-25.dump", import.meta.url));
const reportPath = fileURLToPath(new URL("../../eval/oe6/results/oe6-backup-restore-2026-10-25.json", import.meta.url));
const tables = ["announcements", "calendar_events", "conversations", "courses", "dataset_releases",
  "datasets", "document_chunks", "document_versions", "documents", "embedding_configs", "ingestion_items",
  "ingestion_runs", "message_citations", "messages", "profile_courses", "synthetic_profiles"];

function docker(args, quiet = false) {
  return execFileSync("docker", args, { cwd: root, encoding: "utf8",
    stdio: quiet ? ["ignore", "ignore", "pipe"] : ["ignore", "pipe", "pipe"] });
}

function sourceConfiguration() {
  const inspected = JSON.parse(docker(["inspect", source]));
  const env = Object.fromEntries((inspected[0]?.Config?.Env ?? []).map(value => {
    const index = value.indexOf("=");
    return [value.slice(0, index), value.slice(index + 1)];
  }));
  if (!env.POSTGRES_USER || !env.POSTGRES_DB || env.POSTGRES_DB.toLowerCase().includes("ccd")) {
    throw new Error("synthetic_source_rejected");
  }
  return { user: env.POSTGRES_USER, database: env.POSTGRES_DB };
}

function psql(container, user, database, sql) {
  return docker(["exec", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database,
    "-At", "-c", sql]).trim();
}

function fingerprint(container, user, database) {
  return Object.fromEntries(tables.map(table => {
    const value = psql(container, user, database,
      `SELECT count(*)::text || '|' || COALESCE(md5(string_agg(row_hash,'' ORDER BY row_hash)),md5(''))
       FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM banuchat.${table} t) rows`);
    return [table, value];
  }));
}

let targetCreated = false;
const startedAt = new Date().toISOString();
const sourceConfig = sourceConfiguration();
await mkdir(backupDirectory, { recursive: true });
try {
  const backupStart = performance.now();
  docker(["exec", source, "pg_dump", "-U", sourceConfig.user, "-d", sourceConfig.database,
    "--format=custom", "--no-owner", "--no-privileges", "--file=/tmp/oe6-synthetic.dump"], true);
  docker(["cp", `${source}:/tmp/oe6-synthetic.dump`, backup], true);
  const backupMs = Math.round(performance.now() - backupStart);
  const sourceFingerprint = fingerprint(source, sourceConfig.user, sourceConfig.database);

  const restoreStart = performance.now();
  docker(["run", "--detach", "--pull=never", "--name", target, "--network", "none",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=1g", "-e", "POSTGRES_DB=oe6_restore",
    "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "pgvector/pgvector:pg16"], true);
  targetCreated = true;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      docker(["exec", target, "pg_isready", "-U", "postgres", "-d", "oe6_restore"], true);
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  docker(["cp", backup, `${target}:/tmp/oe6-synthetic.dump`], true);
  docker(["exec", target, "pg_restore", "-U", "postgres", "-d", "oe6_restore",
    "--no-owner", "--no-privileges", "/tmp/oe6-synthetic.dump"], true);
  const targetFingerprint = fingerprint(target, "postgres", "oe6_restore");
  const restoreMs = Math.round(performance.now() - restoreStart);
  const matching = tables.every(table => sourceFingerprint[table] === targetFingerprint[table]);
  if (!matching) throw new Error("restored_database_fingerprint_mismatch");
  const bytes = await readFile(backup);
  const metadata = await stat(backup);
  const report = {
    schema_version: "banuchat-oe6-backup-restore-1",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    source: { container: source, database: sourceConfig.database, synthetic_only: true },
    backup: { path: "infra/local/oe6/backups/synthetic-2026-10-25.dump", bytes: metadata.size,
      sha256: createHash("sha256").update(bytes).digest("hex"), duration_ms: backupMs },
    restore: { destination: "isolated disposable container with tmpfs and no network",
      duration_ms: restoreMs, table_fingerprints_compared: tables.length,
      fingerprints_match: matching, persistent_volume_created: false },
    status: "PASS",
    limitations: ["The restore target was ephemeral and is not a university server.",
      "The backup contains only synthetic local data and remains excluded from Git."],
  };
  await mkdir(fileURLToPath(new URL("../../eval/oe6/results/", import.meta.url)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "PASS", output: "eval/oe6/results/oe6-backup-restore-2026-10-25.json",
    backup_ms: backupMs, restore_ms: restoreMs, fingerprints_match: matching }));
} finally {
  try { docker(["exec", source, "rm", "-f", "/tmp/oe6-synthetic.dump"], true); } catch {}
  if (targetCreated) {
    try { docker(["rm", "--force", target], true); } catch {}
  }
}
