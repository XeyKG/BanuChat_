import { readFile } from "node:fs/promises";

import type {
  IntentResponseVariant,
  IntentRoute,
  IntentRouter,
  IntentRoutingDecision,
  IntentRoutingInput,
  IntentRoutingParameters,
} from "./intent-router-types.js";

const CATALOG_VERSION = "1.1.0-draft";
const SUPPORTED_INTENTS = [
  "profile_progress",
  "course_catalog",
  "calendar_events",
  "announcements",
  "document_lookup",
  "capabilities_help",
  "basic_social",
  "known_out_of_scope",
] as const;
type SupportedIntent = (typeof SUPPORTED_INTENTS)[number];
type TemporalRule = "today" | "tomorrow" | "this_week" | "next_week";

const RESPONSE_VARIANTS = [
  "greeting",
  "thanks",
  "farewell",
  "capabilities",
  "not_available",
] as const;

const EXPECTED_NORMALIZATION = {
  unicode: "NFC",
  lowercase: true,
  accent_comparison:
    "NFD_remove_acute_diaeresis_then_NFC_preserve_enye",
  collapse_whitespace: true,
  ignored_punctuation: ["¿", "?", "¡", "!", ",", ".", ":", ";"],
  punctuation_mode: "replace_with_space_after_clause_guard",
  preserve_original: true,
  strip_optional_suffixes: ["por favor"],
  strip_limit: 1,
};

const EXPECTED_DECISION_POLICY = {
  version: "1",
  exact_score: 100,
  lexical_score: 90,
  lexical_match_mode: "required_groups_plus_allowlisted_fillers",
  lexical_max_filler_tokens: 5,
  combination_score: 80,
  generic_token_score: 0,
  threshold: 80,
  min_margin: 20,
  score_aggregation: "max_not_sum",
  full_utterance_required: true,
  multiple_strong_intents: "agent_fallback",
  conflicting_parameters: "agent_fallback",
  unconsumed_text: "agent_fallback",
  priority_usage: "evaluation_order_only",
  fallback_route: "agent_fallback",
  standalone_social_allowlist: ["hola", "gracias", "adios"],
  compound_markers: [
    "y",
    "ademas",
    "tambien",
    "pero",
    "segun",
    "compara",
    "comparar",
    "versus",
  ],
  global_exclusions: [
    "no",
    "nunca",
    "excepto",
    "sin",
    "ignora",
    "olvida",
    "instrucciones",
    "prompt",
    "sql",
  ],
  clause_guard:
    "multiple_nonempty_segments_on_question_exclamation_semicolon_or_newline",
};

const EXPECTED_TEMPORAL_POLICY = {
  timezone: "America/Bogota",
  reference_clock: "trusted_turn_now",
  week_start: "monday",
  max_inclusive_days: 366,
  selection: "starts_at_half_open",
  undated_calendar: "agent_fallback",
  rules: [
    { id: "today", operation: "civil_today" },
    { id: "tomorrow", operation: "civil_tomorrow" },
    { id: "this_week", operation: "monday_to_sunday_containing_today" },
    { id: "next_week", operation: "next_monday_to_sunday" },
  ],
  absolute_patterns: [
    {
      id: "calendar_day",
      intent_id: "calendar_events",
      pattern: "eventos del {date}",
      date_format: "YYYY-MM-DD",
      parameters: { limit: 20 },
      score: 100,
    },
    {
      id: "calendar_range",
      intent_id: "calendar_events",
      pattern: "eventos del {date_from} al {date_to}",
      date_format: "YYYY-MM-DD",
      parameters: { limit: 20 },
      score: 100,
    },
  ],
};

const INTENT_CONFIGURATION: Record<
  SupportedIntent,
  {
    routeType: "application_service" | "static_renderer";
    logicalService: string | null;
    requiresProfile: boolean;
    defaultParameters: IntentRoutingParameters;
    responseVariants: readonly IntentResponseVariant[];
  }
> = {
  profile_progress: {
    routeType: "application_service",
    logicalService: "ProfileProgressService",
    requiresProfile: true,
    defaultParameters: { limit: 20 },
    responseVariants: [null],
  },
  course_catalog: {
    routeType: "application_service",
    logicalService: "CourseCatalogService",
    requiresProfile: false,
    defaultParameters: { limit: 20 },
    responseVariants: [null],
  },
  calendar_events: {
    routeType: "application_service",
    logicalService: "CalendarEventsService",
    requiresProfile: false,
    defaultParameters: { limit: 20 },
    responseVariants: [null],
  },
  announcements: {
    routeType: "application_service",
    logicalService: "AnnouncementsService",
    requiresProfile: false,
    defaultParameters: { limit: 20 },
    responseVariants: [null],
  },
  document_lookup: {
    routeType: "application_service",
    logicalService: "DocumentLookupService",
    requiresProfile: false,
    defaultParameters: { limit: 10 },
    responseVariants: [null],
  },
  capabilities_help: {
    routeType: "static_renderer",
    logicalService: null,
    requiresProfile: false,
    defaultParameters: {},
    responseVariants: ["capabilities"],
  },
  basic_social: {
    routeType: "static_renderer",
    logicalService: null,
    requiresProfile: false,
    defaultParameters: {},
    responseVariants: ["greeting", "thanks", "farewell"],
  },
  known_out_of_scope: {
    routeType: "static_renderer",
    logicalService: null,
    requiresProfile: false,
    defaultParameters: {},
    responseVariants: ["not_available"],
  },
};

interface CompiledEvidence {
  readonly score: number;
  readonly parameters: IntentRoutingParameters;
  readonly temporalRule: TemporalRule | null;
  readonly responseVariant: IntentResponseVariant;
}

interface CompiledRule extends CompiledEvidence {
  readonly text: string;
}

interface CompiledLexicalPattern extends CompiledEvidence {
  readonly requiredGroups: readonly (readonly (readonly string[])[])[];
  readonly allowedFillers: ReadonlySet<string>;
  readonly maximumTokens: number;
}

interface CompiledIntent {
  readonly id: SupportedIntent;
  readonly priority: number;
  readonly requiresProfile: boolean;
  readonly defaultParameters: IntentRoutingParameters;
  readonly exclusions: readonly string[];
  readonly rules: readonly CompiledRule[];
  readonly lexicalPatterns: readonly CompiledLexicalPattern[];
}

interface CompiledCatalog {
  readonly version: string;
  readonly compoundMarkers: readonly string[];
  readonly globalExclusions: readonly string[];
  readonly intents: readonly CompiledIntent[];
}

interface RuleShape {
  readonly id: string;
  readonly parameters: IntentRoutingParameters;
  readonly temporalRule: TemporalRule | null;
  readonly responseVariant: IntentResponseVariant;
}

function fallbackDecision(): IntentRoutingDecision {
  return {
    route: "agent_fallback",
    parameters: {},
    response_variant: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return deepEqual(actual, expected);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) => deepEqual(entry, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      deepEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) => deepEqual(left[key], right[key]))
    );
  }
  return false;
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0301\u0308]/gu, "")
    .normalize("NFC");
}

function hasMultipleClauses(content: string): boolean {
  return content
    .split(/[¿?¡!;\r\n]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean).length > 1;
}

function normalizeInput(content: string): string | null {
  if (hasMultipleClauses(content)) return null;
  let normalized = normalizeComparable(content)
    .replace(/[¿?¡!,.:;]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  normalized = normalized.replace(/(?:^|\s)por favor$/u, "").trim();
  return normalized;
}

function normalizeCatalogPhrase(value: string): string {
  return normalizeComparable(value).replace(/\s+/gu, " ").trim();
}

function containsDelimitedPhrase(content: string, phrase: string): boolean {
  if (content === phrase) return true;
  const start = content.startsWith(`${phrase} `);
  const middle = content.includes(` ${phrase} `);
  const end = content.endsWith(` ${phrase}`);
  return start || middle || end;
}

function tokenizeNormalized(phrase: string): string[] {
  return phrase.split(" ");
}

function isNormalizedLexicalPhrase(phrase: string): boolean {
  return (
    phrase.length > 0 &&
    phrase === normalizeCatalogPhrase(phrase) &&
    /^[a-z0-9ñ]+(?: [a-z0-9ñ]+)*$/u.test(phrase)
  );
}

function matchesLexicalPattern(
  tokens: readonly string[],
  pattern: CompiledLexicalPattern,
): boolean {
  if (tokens.length > pattern.maximumTokens) return false;
  const consumed = new Array<boolean>(tokens.length).fill(false);

  function assignGroup(groupIndex: number): boolean {
    if (groupIndex === pattern.requiredGroups.length) {
      const residual = tokens.filter((_, index) => !consumed[index]);
      return (
        residual.length <= EXPECTED_DECISION_POLICY.lexical_max_filler_tokens &&
        residual.every((token) => pattern.allowedFillers.has(token))
      );
    }
    const group = pattern.requiredGroups[groupIndex];
    if (group === undefined) return false;
    for (const alternative of group) {
      for (let start = 0; start + alternative.length <= tokens.length; start++) {
        if (
          alternative.every(
            (token, offset) =>
              !consumed[start + offset] && tokens[start + offset] === token,
          )
        ) {
          for (let offset = 0; offset < alternative.length; offset++) {
            consumed[start + offset] = true;
          }
          if (assignGroup(groupIndex + 1)) return true;
          for (let offset = 0; offset < alternative.length; offset++) {
            consumed[start + offset] = false;
          }
        }
      }
    }
    return false;
  }

  return assignGroup(0);
}

function stringArray(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    return null;
  }
  return [...value];
}

function isSupportedIntent(value: unknown): value is SupportedIntent {
  return (
    typeof value === "string" &&
    (SUPPORTED_INTENTS as readonly string[]).includes(value)
  );
}

function isResponseVariant(value: unknown): value is IntentResponseVariant {
  return (
    value === null ||
    (typeof value === "string" &&
      (RESPONSE_VARIANTS as readonly string[]).includes(value))
  );
}

function uniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function readParameters(
  intentId: SupportedIntent,
  value: unknown,
): IntentRoutingParameters | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  const allowedByIntent: Record<SupportedIntent, readonly string[]> = {
    profile_progress: ["limit", "statuses"],
    course_catalog: ["limit", "statuses"],
    calendar_events: ["limit", "event_types", "date_from", "date_to"],
    announcements: ["limit", "temporal_status", "reference_time"],
    document_lookup: ["limit", "query", "retrieval_mode"],
    capabilities_help: [],
    basic_social: [],
    known_out_of_scope: [],
  };
  if (keys.some((key) => !allowedByIntent[intentId].includes(key))) return null;

  if (
    "limit" in value &&
    (!Number.isInteger(value.limit) ||
      (value.limit as number) < 1 ||
      (value.limit as number) > (intentId === "document_lookup" ? 20 : 50))
  ) {
    return null;
  }

  if ("statuses" in value) {
    const allowed =
      intentId === "profile_progress"
        ? ["enrolled", "in_progress", "completed"]
        : ["available", "closed", "archived"];
    if (
      !Array.isArray(value.statuses) ||
      value.statuses.length < 1 ||
      value.statuses.length > 3 ||
      !uniqueStrings(value.statuses.filter((item): item is string => typeof item === "string")) ||
      value.statuses.some(
        (item) => typeof item !== "string" || !allowed.includes(item),
      )
    ) {
      return null;
    }
  }

  if ("event_types" in value) {
    const allowed = ["course_session", "announcement_deadline", "general"];
    if (
      !Array.isArray(value.event_types) ||
      value.event_types.length < 1 ||
      value.event_types.length > 3 ||
      !uniqueStrings(
        value.event_types.filter((item): item is string => typeof item === "string"),
      ) ||
      value.event_types.some(
        (item) => typeof item !== "string" || !allowed.includes(item),
      )
    ) {
      return null;
    }
  }

  if (
    "temporal_status" in value &&
    !["active", "upcoming", "expired", "all"].includes(
      value.temporal_status as string,
    )
  ) {
    return null;
  }
  if (
    "retrieval_mode" in value &&
    !["chunked", "full_document"].includes(value.retrieval_mode as string)
  ) {
    return null;
  }
  if (
    "query" in value &&
    (typeof value.query !== "string" ||
      value.query.length < 2 ||
      value.query.length > 500 ||
      !/\S/u.test(value.query))
  ) {
    return null;
  }
  for (const key of ["date_from", "date_to", "reference_time"] as const) {
    if (key in value && typeof value[key] !== "string") return null;
  }

  return structuredClone(value) as IntentRoutingParameters;
}

function readRuleShape(
  value: unknown,
  intentId: SupportedIntent,
  seenRuleIds: Set<string>,
): RuleShape | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9_]+$/u.test(value.id) ||
    seenRuleIds.has(value.id) ||
    !isResponseVariant(value.response_variant)
  ) {
    return null;
  }
  const temporalRule = value.temporal_rule;
  if (
    temporalRule !== null &&
    temporalRule !== "today" &&
    temporalRule !== "tomorrow" &&
    temporalRule !== "this_week" &&
    temporalRule !== "next_week"
  ) {
    return null;
  }
  if (temporalRule !== null && intentId !== "calendar_events") return null;
  if (!INTENT_CONFIGURATION[intentId].responseVariants.includes(value.response_variant)) {
    return null;
  }
  const parameters = readParameters(intentId, value.parameters);
  if (parameters === null) return null;
  seenRuleIds.add(value.id);
  return {
    id: value.id,
    parameters,
    temporalRule,
    responseVariant: value.response_variant,
  };
}

function compileLexicalPattern(
  value: unknown,
  intentId: SupportedIntent,
  seenRuleIds: Set<string>,
): CompiledLexicalPattern | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "required_groups",
      "allowed_fillers",
      "parameters",
      "temporal_rule",
      "response_variant",
    ]) ||
    !Array.isArray(value.required_groups) ||
    value.required_groups.length < 2 ||
    value.required_groups.length > 4 ||
    !Array.isArray(value.allowed_fillers) ||
    value.allowed_fillers.length > 8
  ) {
    return null;
  }
  const shape = readRuleShape(value, intentId, seenRuleIds);
  if (shape === null) return null;
  if (intentId === "calendar_events" && shape.temporalRule === null) return null;

  const requiredGroups: string[][][] = [];
  for (const rawGroup of value.required_groups) {
    const group = stringArray(rawGroup);
    if (group === null || group.length < 1 || group.length > 4 || !uniqueStrings(group)) {
      return null;
    }
    const alternatives: string[][] = [];
    for (const phrase of group) {
      if (!isNormalizedLexicalPhrase(phrase) || phrase.length > 80) return null;
      const tokens = tokenizeNormalized(phrase);
      if (tokens.length > 4) return null;
      alternatives.push(tokens);
    }
    requiredGroups.push(alternatives);
  }

  const fillers = stringArray(value.allowed_fillers);
  if (
    fillers === null ||
    !uniqueStrings(fillers) ||
    fillers.some((filler) =>
      !isNormalizedLexicalPhrase(filler) || tokenizeNormalized(filler).length !== 1,
    )
  ) {
    return null;
  }
  return {
    requiredGroups,
    allowedFillers: new Set(fillers),
    maximumTokens: requiredGroups.reduce(
      (total, group) => Math.max(...group.map((phrase) => phrase.length)) + total,
      EXPECTED_DECISION_POLICY.lexical_max_filler_tokens,
    ),
    score: EXPECTED_DECISION_POLICY.lexical_score,
    parameters: shape.parameters,
    temporalRule: shape.temporalRule,
    responseVariant: shape.responseVariant,
  };
}

function compileIntent(
  value: unknown,
  seenRuleIds: Set<string>,
): CompiledIntent | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "priority",
      "route_type",
      "logical_service",
      "requires_profile",
      "default_parameters",
      "exclusions",
      "strong_expressions",
      "token_combinations",
      "lexical_patterns",
    ]) ||
    !isSupportedIntent(value.id) ||
    !Number.isInteger(value.priority) ||
    (value.priority as number) < 0 ||
    (value.priority as number) > 100
  ) {
    return null;
  }
  const id = value.id;
  const configuration = INTENT_CONFIGURATION[id];
  if (
    value.route_type !== configuration.routeType ||
    value.logical_service !== configuration.logicalService ||
    value.requires_profile !== configuration.requiresProfile
  ) {
    return null;
  }
  const defaultParameters = readParameters(id, value.default_parameters);
  const exclusions = stringArray(value.exclusions);
  if (
    defaultParameters === null ||
    !deepEqual(defaultParameters, configuration.defaultParameters) ||
    exclusions === null ||
    !uniqueStrings(exclusions) ||
    !Array.isArray(value.strong_expressions) ||
    value.strong_expressions.length < 1 ||
    !Array.isArray(value.token_combinations) ||
    value.token_combinations.length < 1 ||
    !Array.isArray(value.lexical_patterns) ||
    value.lexical_patterns.length > 8
  ) {
    return null;
  }

  const rules: CompiledRule[] = [];
  for (const rawRule of value.strong_expressions) {
    if (
      !isRecord(rawRule) ||
      !hasExactKeys(rawRule, [
        "id",
        "text",
        "parameters",
        "temporal_rule",
        "response_variant",
      ]) ||
      typeof rawRule.text !== "string" ||
      rawRule.text.length < 2 ||
      rawRule.text.length > 500
    ) {
      return null;
    }
    const shape = readRuleShape(rawRule, id, seenRuleIds);
    if (shape === null) return null;
    const text = normalizeCatalogPhrase(rawRule.text);
    if (text.length === 0 || text !== rawRule.text) return null;
    rules.push({
      text,
      score: 100,
      parameters: shape.parameters,
      temporalRule: shape.temporalRule,
      responseVariant: shape.responseVariant,
    });
  }

  for (const rawRule of value.token_combinations) {
    if (
      !isRecord(rawRule) ||
      !hasExactKeys(rawRule, [
        "id",
        "segments",
        "parameters",
        "temporal_rule",
        "response_variant",
      ]) ||
      !Array.isArray(rawRule.segments) ||
      rawRule.segments.length < 2 ||
      rawRule.segments.length > 8
    ) {
      return null;
    }
    const shape = readRuleShape(rawRule, id, seenRuleIds);
    if (shape === null) return null;
    const segments: string[][] = [];
    for (const rawSegment of rawRule.segments) {
      const segment = stringArray(rawSegment);
      if (segment === null || segment.length === 0 || segment.length > 8) {
        return null;
      }
      const normalized = segment.map(normalizeCatalogPhrase);
      if (
        normalized.some((entry, index) =>
          entry.length === 0 || entry !== segment[index],
        ) ||
        !uniqueStrings(normalized)
      ) {
        return null;
      }
      segments.push(normalized);
    }
    let combinations = [""];
    for (const segment of segments) {
      combinations = combinations.flatMap((prefix) =>
        segment.map((alternative) =>
          prefix.length === 0 ? alternative : `${prefix} ${alternative}`,
        ),
      );
    }
    for (const text of combinations) {
      rules.push({
        text,
        score: 80,
        parameters: shape.parameters,
        temporalRule: shape.temporalRule,
        responseVariant: shape.responseVariant,
      });
    }
  }

  const lexicalPatterns: CompiledLexicalPattern[] = [];
  for (const rawPattern of value.lexical_patterns) {
    const pattern = compileLexicalPattern(rawPattern, id, seenRuleIds);
    if (pattern === null) return null;
    lexicalPatterns.push(pattern);
  }

  return {
    id,
    priority: value.priority as number,
    requiresProfile: configuration.requiresProfile,
    defaultParameters,
    exclusions: exclusions.map(normalizeCatalogPhrase),
    rules,
    lexicalPatterns,
  };
}

function compileCatalog(value: unknown): CompiledCatalog | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "artifact_type",
      "catalog_version",
      "language",
      "normalization",
      "decision_policy",
      "temporal_policy",
      "intents",
    ]) ||
    value.artifact_type !== "intent_routing_catalog" ||
    value.catalog_version !== CATALOG_VERSION ||
    value.language !== "es" ||
    !deepEqual(value.normalization, EXPECTED_NORMALIZATION) ||
    !deepEqual(value.decision_policy, EXPECTED_DECISION_POLICY) ||
    !deepEqual(value.temporal_policy, EXPECTED_TEMPORAL_POLICY) ||
    !Array.isArray(value.intents) ||
    value.intents.length !== SUPPORTED_INTENTS.length
  ) {
    return null;
  }

  const seenRuleIds = new Set<string>();
  const intents: CompiledIntent[] = [];
  for (const rawIntent of value.intents) {
    const intent = compileIntent(rawIntent, seenRuleIds);
    if (intent === null || intents.some((entry) => entry.id === intent.id)) {
      return null;
    }
    intents.push(intent);
  }
  if (SUPPORTED_INTENTS.some((id) => !intents.some((intent) => intent.id === id))) {
    return null;
  }

  intents.sort((left, right) =>
    right.priority === left.priority
      ? left.id.localeCompare(right.id)
      : right.priority - left.priority,
  );
  return {
    version: CATALOG_VERSION,
    compoundMarkers: EXPECTED_DECISION_POLICY.compound_markers,
    globalExclusions: EXPECTED_DECISION_POLICY.global_exclusions,
    intents,
  };
}

function isValidCivilDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidRfc3339(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(
    value,
  );
  if (match === null || !isValidCivilDate(`${match[1]}-${match[2]}-${match[3]}`)) {
    return false;
  }
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  return (
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}

interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function civilToDate(value: CivilDate): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(value.year, value.month - 1, value.day);
  return date;
}

function dateToCivil(value: Date): CivilDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function addCivilDays(value: CivilDate, days: number): CivilDate {
  const date = civilToDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToCivil(date);
}

function formatCivil(value: CivilDate): string {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function bogotaCivilDate(now: string): CivilDate | null {
  if (!isValidRfc3339(now)) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const getPart = (type: Intl.DateTimeFormatPartTypes): number | null => {
    const value = parts.find((part) => part.type === type)?.value;
    if (value === undefined) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  };
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  return year === null || month === null || day === null
    ? null
    : { year, month, day };
}

function temporalParameters(
  rule: TemporalRule,
  now: string,
): IntentRoutingParameters | null {
  const today = bogotaCivilDate(now);
  if (today === null) return null;
  if (rule === "today") {
    const date = formatCivil(today);
    return { date_from: date, date_to: date };
  }
  if (rule === "tomorrow") {
    const date = formatCivil(addCivilDays(today, 1));
    return { date_from: date, date_to: date };
  }
  const weekday = civilToDate(today).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const monday = addCivilDays(today, -daysSinceMonday + (rule === "next_week" ? 7 : 0));
  return {
    date_from: formatCivil(monday),
    date_to: formatCivil(addCivilDays(monday, 6)),
  };
}

function absoluteDateParameters(content: string): IntentRoutingParameters | null {
  const match = /^eventos del (\d{4}-\d{2}-\d{2})(?: al (\d{4}-\d{2}-\d{2}))?$/u.exec(
    content,
  );
  if (match === null) return null;
  const dateFrom = match[1];
  const dateTo = match[2] ?? dateFrom;
  if (
    dateFrom === undefined ||
    dateTo === undefined ||
    !isValidCivilDate(dateFrom) ||
    !isValidCivilDate(dateTo)
  ) {
    return null;
  }
  const from = civilToDate({
    year: Number(dateFrom.slice(0, 4)),
    month: Number(dateFrom.slice(5, 7)),
    day: Number(dateFrom.slice(8, 10)),
  });
  const to = civilToDate({
    year: Number(dateTo.slice(0, 4)),
    month: Number(dateTo.slice(5, 7)),
    day: Number(dateTo.slice(8, 10)),
  });
  const inclusiveDays = (to.getTime() - from.getTime()) / 86_400_000 + 1;
  if (inclusiveDays < 1 || inclusiveDays > 366) return null;
  return { limit: 20, date_from: dateFrom, date_to: dateTo };
}

function effectiveParameters(
  intent: CompiledIntent,
  rule: CompiledEvidence,
  input: IntentRoutingInput,
): IntentRoutingParameters | null {
  const parameters: IntentRoutingParameters = {
    ...structuredClone(intent.defaultParameters),
    ...structuredClone(rule.parameters),
  };
  if (rule.temporalRule !== null) {
    const temporal = temporalParameters(rule.temporalRule, input.context.now);
    if (temporal === null) return null;
    Object.assign(parameters, temporal);
  }
  if (intent.id === "announcements") {
    if (!isValidRfc3339(input.context.now)) return null;
    parameters.reference_time = input.context.now;
  }
  return parameters;
}

function sameDecision(
  left: Pick<IntentRoutingDecision, "parameters" | "response_variant">,
  right: Pick<IntentRoutingDecision, "parameters" | "response_variant">,
): boolean {
  return (
    left.response_variant === right.response_variant &&
    deepEqual(left.parameters, right.parameters)
  );
}

function routeWithCatalog(
  catalog: CompiledCatalog,
  input: IntentRoutingInput,
): IntentRoutingDecision {
  if (
    typeof input?.content !== "string" ||
    typeof input.context?.profile_selected !== "boolean" ||
    typeof input.context?.now !== "string"
  ) {
    return fallbackDecision();
  }
  const content = normalizeInput(input.content);
  if (content === null || content.length === 0) return fallbackDecision();
  if (
    catalog.globalExclusions.some((phrase) =>
      containsDelimitedPhrase(content, phrase),
    ) ||
    catalog.compoundMarkers.some((phrase) =>
      containsDelimitedPhrase(content, phrase),
    )
  ) {
    return fallbackDecision();
  }

  const tokens = tokenizeNormalized(content);
  const candidates: Array<IntentRoutingDecision & { score: number }> = [];
  for (const intent of catalog.intents) {
    if (
      (intent.requiresProfile && !input.context.profile_selected) ||
      intent.exclusions.some((phrase) =>
        containsDelimitedPhrase(content, phrase),
      )
    ) {
      continue;
    }
    const matches: CompiledEvidence[] = [
      ...intent.rules.filter((rule) => rule.text === content),
      ...intent.lexicalPatterns.filter((pattern) =>
        matchesLexicalPattern(tokens, pattern),
      ),
    ];
    if (intent.id === "calendar_events") {
      const absolute = absoluteDateParameters(content);
      if (absolute !== null) {
        matches.push({
          score: 100,
          parameters: absolute,
          temporalRule: null,
          responseVariant: null,
        });
      }
    }
    if (matches.length === 0) continue;

    const resolved = matches.map((rule) => ({
      route: intent.id as IntentRoute,
      parameters: effectiveParameters(intent, rule, input),
      response_variant: rule.responseVariant,
      score: rule.score,
    }));
    if (resolved.some((match) => match.parameters === null)) {
      return fallbackDecision();
    }
    const first = resolved[0];
    if (
      first === undefined ||
      resolved.some((match) =>
        !sameDecision(
          { parameters: first.parameters ?? {}, response_variant: first.response_variant },
          { parameters: match.parameters ?? {}, response_variant: match.response_variant },
        ),
      )
    ) {
      return fallbackDecision();
    }
    candidates.push({
      route: first.route,
      parameters: first.parameters ?? {},
      response_variant: first.response_variant,
      score: Math.max(...resolved.map((match) => match.score)),
    });
  }

  const eligible = candidates
    .filter((candidate) => candidate.score >= 80)
    .sort((left, right) => right.score - left.score);
  if (eligible.length !== 1) return fallbackDecision();
  const winner = eligible[0];
  if (winner === undefined) return fallbackDecision();
  const runnerUpScore = candidates
    .filter((candidate) => candidate.route !== winner.route)
    .reduce((maximum, candidate) => Math.max(maximum, candidate.score), 0);
  if (winner.score - runnerUpScore < 20) return fallbackDecision();
  return {
    route: winner.route,
    parameters: winner.parameters,
    response_variant: winner.response_variant,
  };
}

function invalidRouter(): IntentRouter {
  return {
    catalog_valid: false,
    catalog_version: null,
    route: fallbackDecision,
  };
}

export function createIntentRouter(catalog: unknown): IntentRouter {
  try {
    const compiled = compileCatalog(catalog);
    if (compiled === null) return invalidRouter();
    return {
      catalog_valid: true,
      catalog_version: compiled.version,
      route: (input) => routeWithCatalog(compiled, input),
    };
  } catch {
    return invalidRouter();
  }
}

let defaultRouterPromise: Promise<IntentRouter> | undefined;

export function loadDefaultIntentRouter(): Promise<IntentRouter> {
  defaultRouterPromise ??= readFile(
    new URL("../../intent-routing.catalog.json", import.meta.url),
    "utf8",
  )
    .then((content) => createIntentRouter(JSON.parse(content) as unknown))
    .catch(() => invalidRouter());
  return defaultRouterPromise;
}
