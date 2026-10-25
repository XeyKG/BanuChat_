#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const cases = [1, 2, 5].map(concurrency => ({
  concurrency,
  name: `oe6-performance-docker-c${concurrency}-2026-10-25.json`,
}));
const resultsDirectory = fileURLToPath(new URL("./results/", import.meta.url));

function revision() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

const sources = [];
const comparison = [];
for (const item of cases) {
  const path = new URL(`./results/${item.name}`, import.meta.url);
  const bytes = await readFile(path);
  const report = JSON.parse(bytes.toString("utf8"));
  if (report?.configuration?.concurrency !== item.concurrency ||
      report?.configuration?.sample_size_per_branch !== 10 ||
      !Array.isArray(report?.results) || report.results.length !== 3) {
    throw new Error(`invalid_performance_report:${item.name}`);
  }
  sources.push({
    path: `eval/oe6/results/${item.name}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  for (const result of report.results) {
    const stats = result.statistics;
    comparison.push({
      concurrency: item.concurrency,
      branch: result.branch,
      samples: stats.samples,
      mean_ms: stats.mean_ms,
      median_ms: stats.median_ms,
      p95_ms: stats.p95_ms,
      max_ms: stats.max_ms,
      errors: stats.errors,
      timeouts: stats.timeouts,
      over_target_5s: stats.over_target_5s,
      ...(result.branch === "document_rag" ? {
        cold_start_samples: stats.cold_start?.samples ?? 0,
        warm_samples: stats.warm?.samples ?? 0,
      } : {}),
    });
  }
}

const summary = {
  schema_version: "banuchat-oe6-concurrency-summary-1",
  generated_at: new Date().toISOString(),
  baseline_revision: revision(),
  environment: {
    deployment: "Docker Desktop Compose profile ollama-container",
    ollama_volume: "banuchat-closure-ollama-models",
    hardware_class: "local laptop; not UNAB infrastructure",
    state: "embedding explicitly warmed before each bounded run",
  },
  method: {
    concurrency_levels: [1, 2, 5],
    samples_per_branch_per_level: 10,
    branches: ["fast_path", "document_rag", "n8n_mcp"],
    retries: 0,
    target_ms: 5000,
    measurement_boundary: "HTTP POST /messages start to parsed JSON response",
  },
  sources,
  comparison,
  aggregate: {
    samples: comparison.reduce((sum, row) => sum + row.samples, 0),
    errors: comparison.reduce((sum, row) => sum + row.errors, 0),
    timeouts: comparison.reduce((sum, row) => sum + row.timeouts, 0),
    over_target_5s: comparison.reduce((sum, row) => sum + row.over_target_5s, 0),
    highest_bounded_concurrency: 5,
    saturation_observed_through_highest_level: false,
    higher_concurrency_tested: false,
  },
};

const output = `${resultsDirectory}oe6-concurrency-summary-2026-10-25.json`;
await writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", output: "eval/oe6/results/oe6-concurrency-summary-2026-10-25.json" }));
