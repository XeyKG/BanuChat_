#!/usr/bin/env node

import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LOCAL = fileURLToPath(new URL("../local/oe6/", import.meta.url));
const ENV_FILE = fileURLToPath(new URL("../local/oe6/n8n-conversation.env", import.meta.url));
const CREDENTIAL_FILE = fileURLToPath(new URL("../local/oe6/n8n-credential.import.json", import.meta.url));
const WORKFLOW_FILE = fileURLToPath(new URL("../local/oe6/n8n-workflow.import.json", import.meta.url));
const CONTAINER = process.env.BANUCHAT_N8N_CONTAINER ?? "banuchat-n8n";

function docker(args, options = {}) {
  return execFileSync("docker", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.quiet ? ["ignore", "ignore", "pipe"] : ["ignore", "pipe", "pipe"],
  });
}

async function main() {
  if (await access(ENV_FILE).then(() => true, () => false)) {
    throw new Error("oe6_n8n_environment_already_exists");
  }
  const workflow = JSON.parse(await readFile(
    fileURLToPath(new URL("../../n8n/workflows/oe4-conversation-v1.json", import.meta.url)),
    "utf8",
  ));
  const credentialId = randomUUID();
  const credentialName = "BanuChat OE6 Conversation Service";
  const token = randomBytes(32).toString("base64url");
  const webhook = workflow.nodes.find(node => node.type === "n8n-nodes-base.webhook");
  if (!webhook) throw new Error("oe4_webhook_missing");
  webhook.credentials = {
    httpHeaderAuth: { id: credentialId, name: credentialName },
  };
  workflow.versionId = randomUUID();
  workflow.active = false;
  await mkdir(LOCAL, { recursive: true });
  await writeFile(CREDENTIAL_FILE, JSON.stringify([{
    id: credentialId,
    name: credentialName,
    type: "httpHeaderAuth",
    data: { name: "X-BanuChat-Service-Token", value: token },
  }]), { encoding: "utf8", mode: 0o600, flag: "wx" });
  await writeFile(WORKFLOW_FILE, JSON.stringify(workflow), {
    encoding: "utf8", mode: 0o600, flag: "wx",
  });
  try {
    docker(["cp", CREDENTIAL_FILE, `${CONTAINER}:/tmp/oe6-n8n-credential.json`], { quiet: true });
    docker(["cp", WORKFLOW_FILE, `${CONTAINER}:/tmp/oe6-n8n-workflow.json`], { quiet: true });
    docker(["exec", CONTAINER, "n8n", "import:credentials", "--input=/tmp/oe6-n8n-credential.json"], { quiet: true });
    docker(["exec", CONTAINER, "n8n", "import:workflow", "--input=/tmp/oe6-n8n-workflow.json"], { quiet: true });
    docker(["exec", CONTAINER, "n8n", "publish:workflow", "--id=BanuChatOe4Conversation1"], { quiet: true });
    docker(["restart", CONTAINER], { quiet: true });
    const deadline = Date.now() + 60_000;
    let healthy = false;
    while (Date.now() < deadline) {
      try {
        const response = await fetch("http://127.0.0.1:5678/healthz", {
          signal: AbortSignal.timeout(2_000),
        });
        healthy = response.ok;
      } catch {
        healthy = false;
      }
      if (healthy) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!healthy) throw new Error("n8n_health_timeout");
    const operationId = randomUUID();
    let response;
    let body;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      response = await fetch("http://127.0.0.1:5678/webhook/banuchat/internal/oe4/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BanuChat-Service-Token": token,
        },
        body: JSON.stringify({
          demo_mode: "synthetic",
          route: "agent_fallback",
          requested_capability: "bounded_mcp_agent",
          operation_id: operationId,
          release_id: randomUUID(),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      try { body = JSON.parse(text); } catch { body = undefined; }
      if (response.ok && body !== undefined) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (response === undefined) throw new Error("n8n_webhook_unreachable");
    if (!response.ok || body.operation_id !== operationId ||
        body.directive !== "invoke_bounded_mcp_agent") {
      throw new Error("n8n_webhook_verification_failed");
    }
    await writeFile(ENV_FILE, [
      "BANUCHAT_N8N_CONVERSATION_URL=http://127.0.0.1:5678/webhook/banuchat/internal/oe4/conversation",
      `BANUCHAT_N8N_SERVICE_TOKEN=${token}`,
      "BANUCHAT_N8N_CONVERSATION_TIMEOUT_MS=4000",
      "",
    ].join("\n"), { encoding: "utf8", mode: 0o600, flag: "wx" });
    if (process.platform === "win32") {
      const identity = process.env.USERNAME === undefined ? undefined
        : `${process.env.USERDOMAIN ?? "."}\\${process.env.USERNAME}`;
      try {
        if (identity === undefined) throw new Error("windows_identity_unavailable");
        execFileSync("icacls", [ENV_FILE, "/inheritance:r", "/grant:r", `${identity}:(F)`], {
          stdio: "ignore",
        });
      } catch (error) {
        await rm(ENV_FILE, { force: true });
        throw error;
      }
    }
    console.log(JSON.stringify({
      status: "PASS",
      workflow: "BanuChatOe4Conversation1",
      http_status: response.status,
      operation_correlated: true,
      secret_output: "infra/local/oe6/n8n-conversation.env",
    }));
  } finally {
    await rm(CREDENTIAL_FILE, { force: true });
    await rm(WORKFLOW_FILE, { force: true });
    try {
      docker(["exec", CONTAINER, "rm", "-f", "/tmp/oe6-n8n-credential.json", "/tmp/oe6-n8n-workflow.json"], { quiet: true });
    } catch {
      // The container may be unavailable; local plaintext imports were still removed.
    }
  }
}

await main().catch(error => {
  console.error(error instanceof Error ? error.message : "oe6_n8n_provision_failed");
  process.exitCode = 1;
});
