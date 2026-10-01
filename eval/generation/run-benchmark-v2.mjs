import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const MODEL = "qwen3:4b-instruct";
const SYSTEM_PROMPT = `Eres BanuChat, un asistente de demostración que trabaja únicamente
con información sintética proporcionada como contexto. Responde en
español usando solo la evidencia disponible. No inventes información
institucional ni hechos que no aparezcan en el contexto. Si la
evidencia no es suficiente, indícalo. Responde de forma breve,
preferiblemente en un máximo de tres oraciones.`;
const OPTIONS = Object.freeze({ temperature: 0, num_predict: 128 });
const KEEP_ALIVE = "5m";
const REQUEST_TIMEOUT_MS = 180_000;
const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS_V1_PATH = join(HERE, "prompts-v1.json");
const PROMPTS_PATH = join(HERE, "prompts-v2.json");
const RESULTS_DIR = join(HERE, "results");

function getBaseUrl() {
  const raw = process.env.BANUCHAT_EVAL_OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("BANUCHAT_EVAL_OLLAMA_BASE_URL no es una URL válida.");
  }

  if (
    url.protocol !== "http:" ||
    !LOOPBACK_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Ollama debe usar HTTP local sin credenciales, ruta, query ni fragmento: 127.0.0.1, localhost o [::1].",
    );
  }

  return url.origin;
}

async function ollamaRequest(baseUrl, path, { method = "GET", body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = (await response.text()).slice(0, 500);
      throw new Error(`${method} ${path} respondió ${response.status}: ${text}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${method} ${path} excedió el timeout de ${REQUEST_TIMEOUT_MS} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validatePrompts(prompts, promptsV1) {
  if (
    prompts?.schema_version !== "2" ||
    prompts?.benchmark_id !== "banuchat-generator-g0-v2" ||
    prompts?.model !== MODEL ||
    prompts?.think !== false ||
    prompts?.stream !== false ||
    !Array.isArray(prompts?.cases) ||
    prompts.cases.length !== 10
  ) {
    throw new Error("prompts-v2.json no cumple el encabezado congelado del benchmark G0 v2.");
  }

  if (!Array.isArray(promptsV1?.cases) || promptsV1.cases.length !== prompts.cases.length) {
    throw new Error("prompts-v1.json no contiene los mismos 10 casos que prompts-v2.json.");
  }

  const expectedIds = Array.from({ length: 10 }, (_, index) => `G0-${String(index + 1).padStart(2, "0")}`);
  for (const [index, benchmarkCase] of prompts.cases.entries()) {
    if (
      benchmarkCase?.id !== expectedIds[index] ||
      typeof benchmarkCase?.context !== "string" ||
      benchmarkCase.context.trim() === "" ||
      typeof benchmarkCase?.question !== "string" ||
      benchmarkCase.question.trim() === ""
    ) {
      throw new Error(`Caso inválido en la posición ${index + 1}; se esperaba ${expectedIds[index]}.`);
    }
    const v1Case = promptsV1.cases[index];
    for (const field of ["id", "context", "question"]) {
      if (benchmarkCase[field] !== v1Case?.[field]) {
        throw new Error(`prompts v1/v2 difieren en ${field} para la posición ${index + 1}.`);
      }
    }
  }
}

function buildUserPrompt(benchmarkCase) {
  return `CONTEXTO:\n${benchmarkCase.context}\n\nPREGUNTA:\n${benchmarkCase.question}`;
}

function chatBody(benchmarkCase, keepAlive = KEEP_ALIVE) {
  return {
    model: MODEL,
    stream: false,
    think: false,
    keep_alive: keepAlive,
    options: OPTIONS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(benchmarkCase) },
    ],
  };
}

function requireFiniteNonNegative(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Ollama no proporcionó una métrica válida: ${field}.`);
  }
  return value;
}

function validateChatResponse(response) {
  if (typeof response?.message?.content !== "string" || response.message.content.trim() === "") {
    throw new Error("Ollama devolvió message.content vacío o inválido.");
  }
  if (typeof response?.message?.thinking === "string" && response.message.thinking.trim() !== "") {
    throw new Error("Ollama devolvió razonamiento interno no vacío pese a think=false.");
  }
  if (response?.done !== true) {
    throw new Error("Ollama no confirmó la terminación con done=true.");
  }
  if (
    response.done_reason !== undefined &&
    (typeof response.done_reason !== "string" || response.done_reason.trim() === "")
  ) {
    throw new Error("Ollama devolvió done_reason vacío o inválido.");
  }
}

const REASONING_PREAMBLES = ["okay, let's", "okay, let’s", "first, i", "the user is asking", "i need to"];

function startsWithKnownReasoningPreamble(content) {
  const beginning = content.slice(0, 200).trimStart().toLocaleLowerCase("en");
  return REASONING_PREAMBLES.some((preamble) => beginning.startsWith(preamble));
}

async function measuredChat(baseUrl, benchmarkCase, id) {
  const startedAt = performance.now();
  const response = await ollamaRequest(baseUrl, "/api/chat", {
    method: "POST",
    body: chatBody(benchmarkCase),
  });
  const wallClockMs = performance.now() - startedAt;
  validateChatResponse(response);

  const evalDuration = requireFiniteNonNegative(response.eval_duration, "eval_duration");
  if (evalDuration <= 0) {
    throw new Error(`eval_duration debe ser mayor que cero para ${id}.`);
  }
  const evalCount = requireFiniteNonNegative(response.eval_count, "eval_count");

  return {
    id,
    wall_clock_ms: wallClockMs,
    ollama_total_duration_ms: requireFiniteNonNegative(response.total_duration, "total_duration") / 1e6,
    load_duration_ms: requireFiniteNonNegative(response.load_duration, "load_duration") / 1e6,
    prompt_eval_duration_ms:
      requireFiniteNonNegative(response.prompt_eval_duration, "prompt_eval_duration") / 1e6,
    eval_duration_ms: evalDuration / 1e6,
    prompt_eval_count: requireFiniteNonNegative(response.prompt_eval_count, "prompt_eval_count"),
    eval_count: evalCount,
    tokens_per_second: evalCount / (evalDuration / 1e9),
    done: response.done,
    done_reason: response.done_reason ?? null,
    thinking_present:
      typeof response.message.thinking === "string" && response.message.thinking.trim() !== "",
    starts_with_known_reasoning_preamble: startsWithKnownReasoningPreamble(response.message.content),
    response: response.message.content,
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function aggregateWarmRuns(runs) {
  const wall = runs.map((run) => run.wall_clock_ms);
  const total = runs.map((run) => run.ollama_total_duration_ms);
  const evalTokens = runs.map((run) => run.eval_count);
  const tokensPerSecond = runs.map((run) => run.tokens_per_second);
  const otherDoneReasons = {};
  for (const run of runs) {
    if (run.done_reason !== "stop" && run.done_reason !== "length") {
      const key = run.done_reason ?? "not_provided";
      otherDoneReasons[key] = (otherDoneReasons[key] ?? 0) + 1;
    }
  }
  return {
    count: runs.length,
    mean_wall_clock_ms: mean(wall),
    median_wall_clock_ms: median(wall),
    min_wall_clock_ms: Math.min(...wall),
    max_wall_clock_ms: Math.max(...wall),
    mean_ollama_total_duration_ms: mean(total),
    median_ollama_total_duration_ms: median(total),
    mean_eval_tokens: mean(evalTokens),
    mean_tokens_per_second: mean(tokensPerSecond),
    median_tokens_per_second: median(tokensPerSecond),
    under_5000_ms_count: wall.filter((value) => value < 5_000).length,
    at_or_over_5000_ms_count: wall.filter((value) => value >= 5_000).length,
    natural_completion_count: runs.filter((run) => run.done_reason === "stop").length,
    length_limited_count: runs.filter((run) => run.done_reason === "length").length,
    reasoning_preamble_count: runs.filter((run) => run.starts_with_known_reasoning_preamble).length,
    other_done_reason_counts: otherDoneReasons,
  };
}

function bogotaDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function formatNumber(value, digits = 2) {
  return value.toFixed(digits);
}

function markdownReport(report) {
  const { metadata, initial_cold_observation: cold, warm_runs: runs, warm_aggregates: warm } = report;
  const rows = runs
    .map(
      (run) =>
        `| ${run.id} | ${formatNumber(run.wall_clock_ms)} | ${run.eval_count} | ${formatNumber(run.tokens_per_second)} | ${run.done_reason ?? "no informado"} | ${run.starts_with_known_reasoning_preamble ? "sí" : "no"} |`,
    )
    .join("\n");

  return `# Benchmark de generación G0 v2 — qwen3:4b-instruct

## Reproducibilidad

- Modelo: \`${metadata.model}\`
- Digest: \`${metadata.model_digest}\`
- Ollama: \`${metadata.ollama_runtime_version}\`
- Commit: \`${metadata.implementation_revision}\`
- SHA-256 de prompts: \`${metadata.prompts_sha256}\`
- Generado: \`${metadata.generated_at}\`
- Parámetros: \`think=false\`, \`stream=false\`, \`temperature=0\`, \`num_predict=128\`

## Observación cold inicial

| wall ms | total Ollama ms | load ms | output tokens | tokens/s |
| ---: | ---: | ---: | ---: | ---: |
| ${formatNumber(cold.wall_clock_ms)} | ${formatNumber(cold.ollama_total_duration_ms)} | ${formatNumber(cold.load_duration_ms)} | ${cold.eval_count} | ${formatNumber(cold.tokens_per_second)} |

La observación cold se ejecutó después de una petición de control con \`keep_alive=0\`. Ni el control, ni esta observación, ni el warmup forman parte de los agregados warm.

## Diez ejecuciones warm

| ID | wall ms | tokens | tokens/s | done_reason | reasoning preamble |
| --- | ---: | ---: | ---: | --- | --- |
${rows}

## Agregados warm

- Wall clock: media ${formatNumber(warm.mean_wall_clock_ms)} ms; mediana ${formatNumber(warm.median_wall_clock_ms)} ms; mínimo ${formatNumber(warm.min_wall_clock_ms)} ms; máximo ${formatNumber(warm.max_wall_clock_ms)} ms.
- Duración total Ollama: media ${formatNumber(warm.mean_ollama_total_duration_ms)} ms; mediana ${formatNumber(warm.median_ollama_total_duration_ms)} ms.
- Tokens de salida: media ${formatNumber(warm.mean_eval_tokens)}.
- Tokens/s: media ${formatNumber(warm.mean_tokens_per_second)}; mediana ${formatNumber(warm.median_tokens_per_second)}.
- Casos por debajo de 5000 ms: ${warm.under_5000_ms_count}; casos en o por encima de 5000 ms: ${warm.at_or_over_5000_ms_count}.
- Terminaciones naturales: ${warm.natural_completion_count}.
- Terminaciones limitadas por longitud: ${warm.length_limited_count}.
- Respuestas con prefacio de razonamiento conocido: ${warm.reasoning_preamble_count}.
- Otros valores de done_reason: \`${JSON.stringify(warm.other_done_reason_counts)}\`.

## Interpretación

Se muestran 5000 ms como referencia porque el proyecto conserva un objetivo histórico de respuesta promedio menor a 5 s. Este benchmark mide únicamente generación aislada en Ollama. No demuestra cumplimiento ni incumplimiento definitivo de OE6 end-to-end.${
    warm.mean_wall_clock_ms >= 5_000
      ? " En el hardware probado, la media warm de generación ya supera esa referencia; esto no declara la calidad académica de las respuestas ni el desempeño final de POST /messages."
      : " El resultado frente a esa referencia no declara el desempeño final de POST /messages."
  }

## Limitaciones

- Mide generación aislada.
- Usa corpus y contexto sintéticos.
- Usa una muestra pequeña de 10 prompts.
- Separa la observación cold.
- Excluye el warmup.
- No mide retrieval.
- No mide Agent/ReAct.
- No mide MCP.
- No mide persistencia.
- No mide REST ni mobile.
- No acredita OE6.
`;
}

async function preflight(baseUrl) {
  const version = await ollamaRequest(baseUrl, "/api/version");
  const tags = await ollamaRequest(baseUrl, "/api/tags");
  const models = Array.isArray(tags?.models) ? tags.models : [];
  const installed = models.find((entry) => entry?.name === MODEL || entry?.model === MODEL);
  if (!installed || typeof installed.digest !== "string" || installed.digest.trim() === "") {
    throw new Error(`${MODEL} no existe localmente o no informa un digest válido.`);
  }

  const show = await ollamaRequest(baseUrl, "/api/show", {
    method: "POST",
    body: { model: MODEL, verbose: true },
  });
  const capabilities = Array.isArray(show?.capabilities) ? show.capabilities : [];
  const thinkingMetadata = Object.fromEntries(
    Object.entries(show?.model_info ?? {}).filter(([key]) => key.toLowerCase().includes("think")),
  );

  if (typeof version?.version !== "string" || version.version.trim() === "") {
    throw new Error("GET /api/version no devolvió una versión válida de Ollama.");
  }

  return {
    ollama_runtime_version: version.version,
    model_digest: installed.digest,
    capabilities,
    thinking: {
      capability_reported: capabilities.includes("thinking"),
      model_info: thinkingMetadata,
      false_requested: true,
      execution_validation: "Cada respuesta debe omitir message.thinking o devolverlo vacío.",
    },
  };
}

async function main() {
  const baseUrl = getBaseUrl();
  const promptBytes = await readFile(PROMPTS_PATH);
  const promptsV1 = JSON.parse(await readFile(PROMPTS_V1_PATH, "utf8"));
  const prompts = JSON.parse(promptBytes.toString("utf8"));
  validatePrompts(prompts, promptsV1);

  const preflightData = await preflight(baseUrl);
  const implementationRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: join(HERE, "..", ".."),
    encoding: "utf8",
  }).trim();

  const controlCase = { id: "control", context: "Contexto sintético de control.", question: "Responde: control." };
  const controlResponse = await ollamaRequest(baseUrl, "/api/chat", {
    method: "POST",
    body: chatBody(controlCase, 0),
  });
  validateChatResponse(controlResponse);

  const cold = await measuredChat(baseUrl, prompts.cases[0], "initial_cold_observation");

  const warmupResponse = await ollamaRequest(baseUrl, "/api/chat", {
    method: "POST",
    body: chatBody(prompts.cases[0]),
  });
  validateChatResponse(warmupResponse);

  const warmRuns = [];
  for (const benchmarkCase of prompts.cases) {
    warmRuns.push(await measuredChat(baseUrl, benchmarkCase, benchmarkCase.id));
  }

  const generatedAt = new Date();
  const report = {
    schema_version: "2",
    benchmark_id: prompts.benchmark_id,
    metadata: {
      implementation_revision: implementationRevision,
      prompts_sha256: createHash("sha256").update(promptBytes).digest("hex"),
      generated_at: generatedAt.toISOString(),
      ollama_runtime_version: preflightData.ollama_runtime_version,
      model: MODEL,
      model_digest: preflightData.model_digest,
      think: false,
      stream: false,
      temperature: OPTIONS.temperature,
      num_predict: OPTIONS.num_predict,
    },
    preflight: {
      base_url: baseUrl,
      capabilities: preflightData.capabilities,
      thinking: preflightData.thinking,
    },
    phases: {
      unload_control: { completed: true, included_in_warm_aggregates: false },
      initial_cold_observation: { completed: true, included_in_warm_aggregates: false },
      warmup: { completed: true, included_in_warm_aggregates: false },
      measured_warm_runs: { completed: true, included_in_warm_aggregates: true, count: warmRuns.length },
    },
    initial_cold_observation: cold,
    warm_runs: warmRuns,
    warm_aggregates: aggregateWarmRuns(warmRuns),
  };

  const basename = `g0-v2-qwen3-4b-instruct-${bogotaDate(generatedAt)}`;
  const jsonPath = join(RESULTS_DIR, `${basename}.json`);
  const markdownPath = join(RESULTS_DIR, `${basename}.md`);
  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await writeFile(markdownPath, markdownReport(report), { encoding: "utf8", flag: "wx" });
  console.log(`Benchmark completo: ${jsonPath}`);
  console.log(`Reporte Markdown: ${markdownPath}`);
}

main().catch((error) => {
  console.error(`Benchmark abortado: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

