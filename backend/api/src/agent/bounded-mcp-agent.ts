import type { DocumentRagAnswer } from "../chat/document-rag.js";
import type {
  PersistenceCitation,
  PresentationCitation,
} from "../chat/chat-types.js";
import type { ConversationMessage } from "../chat/conversation-context.js";
import {
  McpClientError,
  validateMcpObservation,
  type McpToolName,
  type McpToolSessionFactory,
} from "./mcp-client.js";

const INSUFFICIENT =
  "No encontré evidencia suficiente en las fuentes disponibles para responder esa consulta.";
const CLARIFY_LIMIT =
  "La consulta reúne más fuentes de las que puedo verificar en un solo turno. ¿Puedes dividirla en dos preguntas más concretas?";

interface PlannedCall {
  tool: McpToolName;
  input: Record<string, unknown>;
  purpose: string;
}

export interface McpAgentStepTrace {
  step: number;
  phase: "selection" | "execution" | "observation" | "decision";
  tool: McpToolName;
  purpose: string;
  outcome: "selected" | "success" | "no_evidence" | "error" | "continue" | "stop";
  evidence: readonly string[];
  reason?: string;
}

export interface McpAgentTrace {
  intent_received: string;
  selected_tools: readonly McpToolName[];
  steps: readonly McpAgentStepTrace[];
  call_count: number;
  terminal_reason:
    | "answered"
    | "no_evidence"
    | "step_limit"
    | "tool_error"
    | "release_changed"
    | "clarification"
    | "incompatible_evidence"
    | "unauthorized_subject";
}

export interface McpAgentInput {
  release_id: string;
  profile_key: string;
  query: string;
  now: string;
  history?: readonly ConversationMessage[];
}

export interface McpAgentDependencies {
  sessions: McpToolSessionFactory;
  /** Independent pinned source releases in the authenticated product. */
  source_releases?: {documents:string;structured:string};
  trace?: (trace: McpAgentTrace) => void;
  /** Trusted experimental injection only; production uses the rule policy. */
  decision_policy?: (state: AgentDecisionState) => Promise<AgentAction>;
  limits?: Partial<{
    max_steps: number;
    max_calls: number;
    max_observation_bytes: number;
    total_timeout_ms: number;
  }>;
}

export class McpAgentError extends Error {
  constructor(
    readonly reason:
      | "release_changed"
      | "dependency_unavailable"
      | "invalid_result",
  ) {
    super("Bounded MCP agent operation rejected.");
    this.name = "McpAgentError";
  }
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es");
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function calendarRange(query: string, now: string): { date_from: string; date_to: string } {
  const today = now.slice(0, 10);
  const text = normalized(query);
  const explicit = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/gu)?.[0];
  if (explicit !== undefined) return { date_from: explicit, date_to: explicit };
  if (/\bmanana\b/u.test(text)) {
    const tomorrow = addDays(today, 1);
    return { date_from: tomorrow, date_to: tomorrow };
  }
  if (/\bhoy\b/u.test(text)) return { date_from: today, date_to: today };
  if (/\bproxima semana\b/u.test(text)) {
    return { date_from: addDays(today, 7), date_to: addDays(today, 13) };
  }
  if (/\besta semana\b/u.test(text)) {
    return { date_from: today, date_to: addDays(today, 6) };
  }
  // Compound fallback queries without a precise date receive a documented,
  // bounded horizon rather than an unbounded calendar scan.
  return { date_from: today, date_to: addDays(today, 30) };
}

function planningSubject(query: string, history: readonly ConversationMessage[] = []): string {
  const current = normalized(query);
  const followUp = /^(?:y|tambien|ademas|entonces|cuales|esas|esos|ellos|ellas)\b/u.test(
    current.replace(/^[^\p{L}\p{N}]+/u, ""),
  );
  const previousUser = followUp
    ? [...history].reverse().find((message) => message.role === "user")?.content
    : undefined;
  return previousUser === undefined ? query : `${previousUser}\n${query}`;
}

function interpretRequests(input: McpAgentInput): PlannedCall[] {
  const planningQuery = planningSubject(input.query, input.history);
  const text = normalized(planningQuery);
  const plans: PlannedCall[] = [];
  const profile = /\b(mi|mis|perfil|progreso|complete|completados?|inscritos?|cursando)\b/u.test(text);
  const announcements = /\b(anuncios?|convocatorias?|novedades?|becas?)\b/u.test(text);
  const calendar = /\b(cuando|fecha|fechas|plazo|plazos|calendario|eventos?|sesiones?)\b/u.test(text);
  const courses = /\b(cursos?|catalogo|oferta)\b/u.test(text);
  const document = /\b(documentos?|guias?|archivos?)\b/u.test(text);
  const asksContent = /\b(explica|resume|contenido|dice|segun|requisito|como|por que)\b/u.test(text);

  if (profile) {
    const statuses = /\b(complet|aprob)\w*\b/u.test(text)
      ? ["completed"]
      : /\b(cursando|progreso|en curso)\b/u.test(text)
        ? ["in_progress"]
        : undefined;
    plans.push({
      tool: "get_profile_progress",
      input: statuses === undefined ? { limit: 10 } : { statuses, limit: 10 },
      purpose: "observar el progreso del perfil sintético controlado",
    });
  }
  if (document) {
    const term = planningQuery.match(/[«"]([^»"]{2,500})[»"]/u)?.[1]
      ?? planningQuery.match(/\b(?:documento|gu[ií]a|archivo)s?\s+(?:sobre\s+)?(.+?)(?:[?¿.!]|,|\s+y\s+|$)/iu)?.[1]
      ?? "guía";
    plans.push({
      tool: "find_documents",
      input: { query: term, limit: 5 },
      purpose: "localizar metadata documental publicada",
    });
  }
  if (courses && !profile) {
    plans.push({
      tool: "get_courses",
      input: { limit: 10 },
      purpose: "consultar el catálogo sintético estructurado",
    });
  }
  if (announcements) {
    const temporal_status = /\bproxim|futur|por abrir\b/u.test(text)
      ? "upcoming"
      : /\bexpir|vencid|cerrad\b/u.test(text)
        ? "expired"
        : "active";
    plans.push({
      tool: "get_announcements",
      input: { reference_time: input.now, temporal_status, limit: 10 },
      purpose: "consultar anuncios en el instante confiable del turno",
    });
  }
  if (calendar) {
    plans.push({
      tool: "get_calendar_events",
      input: { ...calendarRange(input.query, input.now), limit: 10 },
      purpose: "consultar eventos en un rango civil acotado",
    });
  }
  if (plans.length === 0 || (document && asksContent)) {
    plans.push({
      tool: "search_knowledge",
      input: { query: Array.from(planningQuery).slice(0, 2_000).join(""), top_k: 5 },
      purpose: "recuperar evidencia textual relevante",
    });
  }
  return plans;
}

export function requiresConversationalOrchestration(input: McpAgentInput): boolean {
  return requiredMcpSources(input) > 1;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new McpAgentError("invalid_result");
  }
  return value as Record<string, unknown>;
}

function rows(output: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = output[key];
  if (!Array.isArray(value)) throw new McpAgentError("invalid_result");
  return value.map(object);
}

function evidenceIds(tool: McpToolName, output: Record<string, unknown>): string[] {
  const key = {
    search_knowledge: "matches",
    find_documents: "documents",
    get_courses: "courses",
    get_calendar_events: "events",
    get_announcements: "announcements",
    get_profile_progress: "courses",
  }[tool];
  return rows(output, key).map((row) =>
    String(
      row.chunk_id ??
        row.document_version_id ??
        row.course_key ??
        row.event_key ??
        row.announcement_key ??
        "evidence",
    ),
  );
}

function source(value: unknown): {
  source_kind: PersistenceCitation["source_kind"];
  source_path: string;
  source_locator: string;
  source_sha256: string;
} {
  const item = object(value);
  return {
    source_kind: item.source_kind as PersistenceCitation["source_kind"],
    source_path: String(item.source_path),
    source_locator: String(item.source_locator),
    source_sha256: String(item.source_sha256),
  };
}

function shortened(value: unknown, maximum = 180): string {
  const text = String(value).replace(/\s+/gu, " ").trim();
  return Array.from(text).slice(0, maximum).join("");
}

interface RenderedObservation {
  content: string;
  citations: PresentationCitation[];
  citation_records: PersistenceCitation[];
}

function renderObservation(
  tool: McpToolName,
  output: Record<string, unknown>,
  releaseId: string,
  startIndex: number,
): RenderedObservation {
  const citations: PresentationCitation[] = [];
  const citation_records: PersistenceCitation[] = [];
  const add = (
    row: Record<string, unknown>,
    label: string,
    identity: Partial<{
      document_version_id: string;
      chunk_id: string;
      profile_key: string;
      course_key: string;
      event_key: string;
      announcement_key: string;
    }>,
  ): void => {
    const origin = source(row.source);
    const index = startIndex + citations.length;
    if (origin.source_kind === "document") {
      const documentVersionId = String(identity.document_version_id);
      citations.push({ index, label, locator: origin.source_locator, release_id: releaseId,
        source_kind: "document", document_version_id: documentVersionId,
        artifact_url: `/api/v1/documents/${documentVersionId}/artifact` });
      citation_records.push({ citation_index: index, dataset_release_id: releaseId,
        ...origin, source_kind: "document", document_version_id: documentVersionId,
        chunk_id: identity.chunk_id ?? null, profile_key: null, course_key: null,
        event_key: null, announcement_key: null });
      return;
    }
    citations.push({ index, label, locator: origin.source_locator, release_id: releaseId,
      source_kind: origin.source_kind, document_version_id: null, artifact_url: null });
    const common = { citation_index: index, dataset_release_id: releaseId, ...origin,
      document_version_id: null, chunk_id: null };
    if (origin.source_kind === "course") citation_records.push({ ...common, source_kind: "course",
      profile_key: null, course_key: String(identity.course_key), event_key: null, announcement_key: null });
    else if (origin.source_kind === "profile_course") citation_records.push({ ...common, source_kind: "profile_course",
      profile_key: String(identity.profile_key), course_key: String(identity.course_key), event_key: null, announcement_key: null });
    else if (origin.source_kind === "profile") citation_records.push({ ...common, source_kind: "profile",
      profile_key: String(identity.profile_key), course_key: null, event_key: null, announcement_key: null });
    else if (origin.source_kind === "calendar_event") citation_records.push({ ...common, source_kind: "calendar_event",
      profile_key: null, course_key: null, event_key: String(identity.event_key), announcement_key: null });
    else citation_records.push({ ...common, source_kind: "announcement", profile_key: null,
      course_key: null, event_key: null, announcement_key: String(identity.announcement_key) });
  };

  const lines: string[] = [];
  if (tool === "search_knowledge") {
    for (const row of rows(output, "matches").slice(0, 3)) {
      lines.push(`- ${row.document_title}: ${shortened(row.content, 320)}`);
      add(row, String(row.document_title), { document_version_id: String(row.document_version_id), chunk_id: String(row.chunk_id) });
    }
  } else if (tool === "find_documents") {
    for (const row of rows(output, "documents").slice(0, 5)) {
      lines.push(`- ${row.title} (${row.retrieval_mode})`);
      add(row, String(row.title), { document_version_id: String(row.document_version_id) });
    }
  } else if (tool === "get_courses") {
    for (const row of rows(output, "courses").slice(0, 5)) {
      lines.push(`- ${row.name} — ${row.status}: ${shortened(row.description)}`);
      add(row, String(row.name), { course_key: String(row.course_key) });
    }
  } else if (tool === "get_calendar_events") {
    for (const row of rows(output, "events").slice(0, 5)) {
      lines.push(`- ${row.title}: ${row.starts_at}${row.ends_at === null ? "" : ` a ${row.ends_at}`}`);
      add(row, String(row.title), { event_key: String(row.event_key) });
    }
  } else if (tool === "get_announcements") {
    for (const row of rows(output, "announcements").slice(0, 5)) {
      lines.push(`- ${row.title} — ${row.temporal_status}: ${shortened(row.description)}`);
      add(row, String(row.title), { announcement_key: String(row.announcement_key) });
    }
  } else {
    const profile = object(output.profile);
    for (const row of rows(output, "courses").slice(0, 5)) {
      lines.push(`- ${row.course_name}: ${row.status}, ${row.progress_percent}%`);
      add(row, String(row.course_name), { profile_key: String(profile.profile_key), course_key: String(row.course_key) });
    }
  }
  return { content: lines.join("\n"), citations, citation_records };
}

function insufficient(releaseId: string, content = INSUFFICIENT): DocumentRagAnswer {
  return { release_id: releaseId, content, insufficient_evidence: true, citations: [], citation_records: [] };
}

async function beforeDeadline<T>(promise: Promise<T>, remainingMs: number): Promise<T> {
  if (remainingMs <= 0) throw new McpAgentError("dependency_unavailable");
  let handle: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        handle = setTimeout(
          () => reject(new McpAgentError("dependency_unavailable")),
          remainingMs,
        );
      }),
    ]);
  } finally {
    if (handle !== undefined) clearTimeout(handle);
  }
}

export type AgentAction = McpToolName | "respond" | "clarify" | "abstain";
export interface AgentDecisionState {
  query: string;
  allowed_actions: readonly AgentAction[];
  recommended_action: AgentAction;
  observations: readonly { tool: McpToolName; evidence: readonly string[]; output: Record<string, unknown> }[];
}

export function requiredMcpSources(input: McpAgentInput): number {
  return interpretRequests(input).length;
}

export function mcpQueryRestriction(query: string, history?: readonly ConversationMessage[]): string | undefined {
  query = planningSubject(query, history);
  if (/\b(?:progreso|notas|perfil)\s+(?:personal\s+)?(?:de|del)\s+(?!mi\b|mis\b|demostracion\b)/u.test(normalized(query)) ||
      /\b(?:otro|otra)\s+(?:estudiante|usuario|persona|cuenta)|\bu[0-9]{7,}\b/u.test(normalized(query))) {
    return "Solo puedo consultar el progreso de la cuenta autenticada. No puedo consultar información personal ajena.";
  }
  return undefined;
}

export function clarifyMcpSources(releaseId: string): DocumentRagAnswer {
  return insufficient(releaseId, CLARIFY_LIMIT);
}

interface Observation { plan: PlannedCall; output: Record<string, unknown> }

/** Only validated identities and retrieval modes influence transitions, never content instructions. */
function nextDecision(requests: PlannedCall[], observations: Observation[]): {
  action: AgentAction; reason: string; allowed: AgentAction[];
} {
  const latest = observations.at(-1);
  if (latest) {
    const ids = evidenceIds(latest.plan.tool, latest.output);
    if (ids.length === 0) {
      if (latest.plan.tool === "find_documents" && requests.some(p => p.tool === "search_knowledge") &&
          !observations.some(o => o.plan.tool === "search_knowledge")) {
        return { action: "search_knowledge", reason: "metadata_empty_content_requested", allowed: ["search_knowledge", "abstain", "clarify"] };
      }
      return { action: "abstain", reason: "required_source_empty", allowed: ["abstain", "clarify"] };
    }
    if (latest.plan.tool === "find_documents" && requests.some(p => p.tool === "search_knowledge") &&
        rows(latest.output, "documents").every(row => row.retrieval_mode === "full_document")) {
      return { action: "clarify", reason: "full_document_metadata_only", allowed: ["clarify", "abstain"] };
    }
  }
  const pending = requests.filter(p => !observations.some(o => o.plan.tool === p.tool));
  return pending.length ? { action: pending[0]!.tool, reason: latest ? "evidence_allows_next_source" : "initial_user_intent",
    allowed: [...pending.map(p => p.tool), "abstain", "clarify"] }
    : { action: "respond", reason: "all_required_sources_observed", allowed: ["respond", "abstain", "clarify"] };
}

function reconcileObservations(observations: Observation[], query: string): boolean {
  const metadata = observations.find(o => o.plan.tool === "find_documents");
  const knowledge = observations.find(o => o.plan.tool === "search_knowledge");
  if (metadata && knowledge && rows(metadata.output, "documents").length) {
    const ids = new Set(rows(metadata.output, "documents").filter(r => r.retrieval_mode === "chunked").map(r => r.document_version_id));
    const matches = rows(knowledge.output, "matches").filter(r => ids.has(r.document_version_id));
    if (!matches.length) return false;
    knowledge.output = { ...knowledge.output, matches, evidence: { status: "found", match_count: matches.length } };
  }
  const progress = observations.find(o => o.plan.tool === "get_profile_progress");
  const calendar = observations.find(o => o.plan.tool === "get_calendar_events");
  if (progress && calendar && /\b(?:mis cursos|mi progreso)\b/u.test(normalized(query))) {
    const ids = new Set(rows(progress.output, "courses").map(r => r.course_key));
    const events = rows(calendar.output, "events").filter(r => ids.has(r.course_key));
    if (!events.length) return false;
    calendar.output = { ...calendar.output, events };
  }
  return true;
}

export async function runBoundedMcpAgent(
  dependencies: McpAgentDependencies,
  input: McpAgentInput,
): Promise<DocumentRagAnswer> {
  const maxSteps = Math.min(2, dependencies.limits?.max_steps ?? 2);
  const maxCalls = Math.min(2, dependencies.limits?.max_calls ?? 2);
  const maxObservationBytes = Math.min(32 * 1024, dependencies.limits?.max_observation_bytes ?? 32 * 1024);
  const totalTimeoutMs = Math.min(30_000, dependencies.limits?.total_timeout_ms ?? 30_000);
  if (![maxSteps, maxCalls, maxObservationBytes, totalTimeoutMs].every(n => Number.isInteger(n) && n > 0)) {
    throw new McpAgentError("invalid_result");
  }
  const requests = interpretRequests(input);
  const traceSteps: McpAgentStepTrace[] = [];
  const selected: McpToolName[] = [];
  const started = performance.now();
  const remaining = (): number => totalTimeoutMs - (performance.now() - started);
  let callCount = 0;
  const finish = (terminal_reason: McpAgentTrace["terminal_reason"]): void => {
    dependencies.trace?.({ intent_received: input.query, selected_tools: [...selected],
      steps: [...traceSteps], call_count: callCount, terminal_reason });
  };
  const restriction = mcpQueryRestriction(input.query, input.history);
  if (restriction) { finish("unauthorized_subject"); return insufficient(input.release_id, restriction); }
  if (requests.length > 2) { finish("step_limit"); return clarifyMcpSources(input.release_id); }

  let session;
  let openingExpired = false;
  const opening = dependencies.sessions.open(input.profile_key).then(async opened => {
    if (openingExpired) await opened.close();
    return opened;
  });
  try { session = await beforeDeadline(opening, remaining()); }
  catch { openingExpired = true; finish("tool_error"); throw new McpAgentError("dependency_unavailable"); }
  const observations: Observation[] = [];
  try {
    while (true) {
      const decision = nextDecision(requests, observations);
      let action = decision.action;
      if (dependencies.decision_policy) {
        action = await beforeDeadline(dependencies.decision_policy({ query: planningSubject(input.query, input.history),
          allowed_actions: decision.allowed, recommended_action: decision.action,
          observations: observations.map(o => ({ tool: o.plan.tool, evidence: evidenceIds(o.plan.tool, o.output), output: structuredClone(o.output) })) }), remaining());
        if (!decision.allowed.includes(action)) throw new McpAgentError("invalid_result");
      }
      const latest = observations.at(-1);
      if (latest) traceSteps.push({ step: callCount, phase: "decision", tool: latest.plan.tool,
        purpose: latest.plan.purpose, outcome: ["respond", "clarify", "abstain"].includes(action) ? "stop" : "continue",
        evidence: evidenceIds(latest.plan.tool, latest.output), reason: decision.reason + ":" + action });
      if (action === "clarify") {
        finish("clarification");
        return insufficient(input.release_id, decision.reason === "full_document_metadata_only"
          ? "El documento localizado solo permite verificar sus metadatos. Solicita localizar el archivo para abrirlo; no puedo resumir su contenido con estas herramientas."
          : CLARIFY_LIMIT);
      }
      if (action === "abstain") { finish("no_evidence"); return insufficient(input.release_id); }
      if (action === "respond") break;
      const plan = requests.find(p => p.tool === action)!;
      const step = callCount + 1;
      if (step > maxSteps || callCount >= maxCalls) { finish("step_limit"); return clarifyMcpSources(input.release_id); }
      selected.push(plan.tool);
      traceSteps.push({ step, phase: "selection", tool: plan.tool, purpose: plan.purpose,
        outcome: "selected", evidence: [], reason: decision.reason });
      let output: Record<string, unknown>;
      try {
        callCount += 1;
        output = await beforeDeadline(session.call(plan.tool, plan.input), remaining());
        if (Buffer.byteLength(JSON.stringify(output), "utf8") > maxObservationBytes) throw new McpAgentError("invalid_result");
        validateMcpObservation(plan.tool, output);
      } catch (error) {
        traceSteps.push({ step, phase: "execution", tool: plan.tool, purpose: plan.purpose, outcome: "error", evidence: [] });
        if (error instanceof McpClientError && error.reason === "not_found") {
          finish("release_changed"); throw new McpAgentError("release_changed");
        }
        if (error instanceof McpClientError && ["tool_unavailable", "timeout"].includes(error.reason)) throw new McpAgentError("dependency_unavailable");
        if (error instanceof McpAgentError) throw error;
        throw new McpAgentError("invalid_result");
      }
      const expectedRelease = dependencies.source_releases
        ? (plan.tool === "search_knowledge" || plan.tool === "find_documents" ? dependencies.source_releases.documents : dependencies.source_releases.structured)
        : input.release_id;
      if (output.release_id !== expectedRelease) { finish("release_changed"); throw new McpAgentError("release_changed"); }
      if (plan.tool === "get_profile_progress" && object(output.profile).profile_key !== input.profile_key) throw new McpAgentError("invalid_result");
      const evidence = evidenceIds(plan.tool, output);
      traceSteps.push({ step, phase: "observation", tool: plan.tool, purpose: plan.purpose,
        outcome: evidence.length ? "success" : "no_evidence", evidence });
      observations.push({ plan, output });
      if (!reconcileObservations(observations, planningSubject(input.query, input.history))) {
        traceSteps.push({ step, phase: "decision", tool: plan.tool, purpose: plan.purpose, outcome: "stop", evidence, reason: "sources_have_no_matching_identity" });
        finish("incompatible_evidence"); return insufficient(input.release_id);
      }
    }
    const rendered: RenderedObservation[] = [];
    let citationIndex = 0;
    for (const observation of observations) {
      const part = renderObservation(observation.plan.tool, observation.output, String(observation.output.release_id), citationIndex);
      citationIndex += part.citations.length; rendered.push(part);
    }
    let content = rendered.map((part,index) => dependencies.source_releases && part.content
      ? `${observations[index]!.plan.tool === "find_documents" || observations[index]!.plan.tool === "search_knowledge"
        ? "Evidencia documental CCD" : "Datos auxiliares ficticios"}:\n${part.content}` : part.content).filter(Boolean).join("\n\n");
    if (selected.includes("get_profile_progress") && selected.includes("get_announcements")) {
      content += "\n\nEstas fuentes permiten comparar progreso y convocatorias, pero no demuestran elegibilidad ni una recomendación personal.";
    }
    finish("answered");
    return { release_id: input.release_id, content, insufficient_evidence: false,
      citations: rendered.flatMap(part => part.citations), citation_records: rendered.flatMap(part => part.citation_records) };
  } catch (error) {
    if (!(error instanceof McpAgentError && error.reason === "release_changed")) finish("tool_error");
    throw error instanceof McpAgentError ? error : new McpAgentError("invalid_result");
  } finally {
    await beforeDeadline(session.close(), Math.max(1, Math.min(1_000, remaining()))).catch(() => undefined);
  }
}
