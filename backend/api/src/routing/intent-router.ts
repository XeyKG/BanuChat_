import { readFile } from "node:fs/promises";

import type {
  DiagnosticIntentRouter,
  IntentResponseVariant,
  IntentRoute,
  IntentRoutingDiagnostics,
  IntentRoutingDecision,
  IntentRoutingInput,
  IntentRoutingParameters,
  WeightedIntentCandidateDiagnostic,
} from "./intent-router-types.js";

const CATALOG_VERSION = "1.2.0-draft";
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
const WEIGHTED_INTENTS = [
  "profile_progress",
  "course_catalog",
  "calendar_events",
  "announcements",
] as const;
type WeightedIntent = (typeof WEIGHTED_INTENTS)[number];
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
  version: "2",
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
  weighted_matcher: {
    calibration_note:
      "Pesos calibrados sobre el conjunto de desarrollo M3.2 para aceptar paráfrasis válidas conocidas manteniendo en fallback las consultas ambiguas o no soportadas del conjunto de desarrollo.",
    enabled_intents: [...WEIGHTED_INTENTS],
    aggregation: "sum_unique_signal_groups_minus_penalties",
    minimum_signal_groups: 2,
    unknown_content_penalty: 25,
    unknown_content_penalty_cap: 50,
    foreign_intent_penalty: 30,
    score_min: 0,
    score_max: 100,
    scaffolding_terms: [
      "que",
      "cual",
      "cuales",
      "como",
      "quiero",
      "quisiera",
      "podrias",
      "puedes",
      "puedo",
      "muestrame",
      "mostrarme",
      "dame",
      "dime",
      "necesito",
      "enseñame",
      "decirme",
      "decir",
      "saber",
      "revisar",
      "conocer",
      "consultar",
      "ver",
      "hola",
      "buenas",
      "gracias",
      "porfa",
      "me",
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "de",
      "del",
      "en",
      "para",
      "por",
      "esta",
      "estan",
      "tiene",
      "actual",
      "actualmente",
      "ahora",
      "este",
      "momento",
      "ccd",
    ],
    scaffolding_phrases: ["por favor"],
  },
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

interface CompiledWeightedSignal {
  readonly form: string;
  readonly tokens: readonly string[];
  readonly parameters: IntentRoutingParameters;
  readonly temporalRule: TemporalRule | null;
}

interface CompiledWeightedSignalGroup {
  readonly id: string;
  readonly weight: number;
  readonly signals: readonly CompiledWeightedSignal[];
}

interface CompiledIntent {
  readonly id: SupportedIntent;
  readonly priority: number;
  readonly requiresProfile: boolean;
  readonly defaultParameters: IntentRoutingParameters;
  readonly exclusions: readonly string[];
  readonly rules: readonly CompiledRule[];
  readonly lexicalPatterns: readonly CompiledLexicalPattern[];
  readonly weightedSignalGroups: readonly CompiledWeightedSignalGroup[];
}

interface CompiledCatalog {
  readonly version: string;
  readonly compoundMarkers: readonly string[];
  readonly globalExclusions: readonly string[];
  readonly scaffoldingTerms: ReadonlySet<string>;
  readonly scaffoldingPhrases: readonly (readonly string[])[];
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

function isWeightedIntent(value: SupportedIntent): value is WeightedIntent {
  return (WEIGHTED_INTENTS as readonly string[]).includes(value);
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

function compileWeightedSignalGroups(
  value: unknown,
  intentId: WeightedIntent,
  seenGroupIds: Set<string>,
): readonly CompiledWeightedSignalGroup[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 8) return null;
  const groups: CompiledWeightedSignalGroup[] = [];
  const seenForms = new Set<string>();
  for (const rawGroup of value) {
    if (
      !isRecord(rawGroup) ||
      !hasExactKeys(rawGroup, ["id", "weight", "signals"]) ||
      typeof rawGroup.id !== "string" ||
      !/^[a-z][a-z0-9_]+$/u.test(rawGroup.id) ||
      seenGroupIds.has(rawGroup.id) ||
      !Number.isInteger(rawGroup.weight) ||
      (rawGroup.weight as number) < 1 ||
      (rawGroup.weight as number) > 100 ||
      !Array.isArray(rawGroup.signals) ||
      rawGroup.signals.length < 1 ||
      rawGroup.signals.length > 30
    ) {
      return null;
    }
    const signals: CompiledWeightedSignal[] = [];
    for (const rawSignal of rawGroup.signals) {
      if (
        !isRecord(rawSignal) ||
        !hasExactKeys(rawSignal, ["form", "parameters", "temporal_rule"]) ||
        typeof rawSignal.form !== "string" ||
        !isNormalizedLexicalPhrase(rawSignal.form) ||
        rawSignal.form.length > 80 ||
        seenForms.has(rawSignal.form)
      ) {
        return null;
      }
      const parameters = readParameters(intentId, rawSignal.parameters);
      const temporalRule = rawSignal.temporal_rule;
      if (
        parameters === null ||
        (temporalRule !== null &&
          temporalRule !== "today" &&
          temporalRule !== "tomorrow" &&
          temporalRule !== "this_week" &&
          temporalRule !== "next_week") ||
        (temporalRule !== null && intentId !== "calendar_events")
      ) {
        return null;
      }
      seenForms.add(rawSignal.form);
      signals.push({
        form: rawSignal.form,
        tokens: tokenizeNormalized(rawSignal.form),
        parameters,
        temporalRule,
      });
    }
    seenGroupIds.add(rawGroup.id);
    groups.push({
      id: rawGroup.id,
      weight: rawGroup.weight as number,
      signals,
    });
  }
  return groups;
}

function compileIntent(
  value: unknown,
  seenRuleIds: Set<string>,
  seenWeightedGroupIds: Set<string>,
): CompiledIntent | null {
  const intentId = isRecord(value) && isSupportedIntent(value.id) ? value.id : null;
  const expectedKeys = [
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
    ...(intentId !== null && isWeightedIntent(intentId)
      ? ["weighted_signal_groups"]
      : []),
  ];
  if (
    !isRecord(value) ||
    !hasExactKeys(value, expectedKeys) ||
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

  const weightedSignalGroups = isWeightedIntent(id)
    ? compileWeightedSignalGroups(
        value.weighted_signal_groups,
        id,
        seenWeightedGroupIds,
      )
    : [];
  if (weightedSignalGroups === null) return null;

  return {
    id,
    priority: value.priority as number,
    requiresProfile: configuration.requiresProfile,
    defaultParameters,
    exclusions: exclusions.map(normalizeCatalogPhrase),
    rules,
    lexicalPatterns,
    weightedSignalGroups,
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
  const seenWeightedGroupIds = new Set<string>();
  const intents: CompiledIntent[] = [];
  for (const rawIntent of value.intents) {
    const intent = compileIntent(rawIntent, seenRuleIds, seenWeightedGroupIds);
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
    scaffoldingTerms: new Set(
      EXPECTED_DECISION_POLICY.weighted_matcher.scaffolding_terms,
    ),
    scaffoldingPhrases:
      EXPECTED_DECISION_POLICY.weighted_matcher.scaffolding_phrases.map(
        tokenizeNormalized,
      ),
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

interface MatchedWeightedGroup {
  readonly group: CompiledWeightedSignalGroup;
  readonly signals: readonly CompiledWeightedSignal[];
  readonly tokenIndexes: readonly number[];
}

interface WeightedEvaluation {
  readonly diagnostic: WeightedIntentCandidateDiagnostic;
  readonly decision: IntentRoutingDecision | null;
  readonly eligible: boolean;
}

function matchingTokenIndexes(
  tokens: readonly string[],
  phrase: readonly string[],
): number[] {
  const indexes: number[] = [];
  for (let start = 0; start + phrase.length <= tokens.length; start++) {
    if (phrase.every((token, offset) => tokens[start + offset] === token)) {
      for (let offset = 0; offset < phrase.length; offset++) {
        indexes.push(start + offset);
      }
    }
  }
  return indexes;
}

function uniqueInOrder<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function mergedWeightedEvidence(
  intent: CompiledIntent,
  groups: readonly MatchedWeightedGroup[],
): { parameters: IntentRoutingParameters; temporalRule: TemporalRule | null } | null {
  const parameters: IntentRoutingParameters = {};
  let temporalRule: TemporalRule | null = null;
  for (const match of groups) {
    for (const signal of match.signals) {
      for (const [key, value] of Object.entries(signal.parameters)) {
        const existing = parameters[key as keyof IntentRoutingParameters];
        if (existing !== undefined && !deepEqual(existing, value)) return null;
        Object.assign(parameters, { [key]: structuredClone(value) });
      }
      if (signal.temporalRule !== null) {
        if (temporalRule !== null && temporalRule !== signal.temporalRule) return null;
        temporalRule = signal.temporalRule;
      }
    }
  }
  if (intent.id === "calendar_events" && temporalRule === null) return null;
  return { parameters, temporalRule };
}

function legacyDecision(
  catalog: CompiledCatalog,
  input: IntentRoutingInput,
  content: string,
  tokens: readonly string[],
): { hasEvidence: boolean; decision: IntentRoutingDecision; reason: string } {
  const candidates: Array<IntentRoutingDecision & { score: number }> = [];
  for (const intent of catalog.intents) {
    if (
      (intent.requiresProfile && !input.context.profile_selected) ||
      intent.exclusions.some((phrase) => containsDelimitedPhrase(content, phrase))
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
      return { hasEvidence: true, decision: fallbackDecision(), reason: "invalid_parameters" };
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
      return { hasEvidence: true, decision: fallbackDecision(), reason: "conflicting_parameters" };
    }
    candidates.push({
      route: first.route,
      parameters: first.parameters ?? {},
      response_variant: first.response_variant,
      score: Math.max(...resolved.map((match) => match.score)),
    });
  }
  if (candidates.length === 0) {
    return { hasEvidence: false, decision: fallbackDecision(), reason: "no_legacy_match" };
  }
  const eligible = candidates
    .filter((candidate) => candidate.score >= EXPECTED_DECISION_POLICY.threshold)
    .sort((left, right) => right.score - left.score);
  if (eligible.length !== 1) {
    return { hasEvidence: true, decision: fallbackDecision(), reason: "legacy_ambiguous" };
  }
  const winner = eligible[0];
  if (winner === undefined) {
    return { hasEvidence: true, decision: fallbackDecision(), reason: "legacy_below_threshold" };
  }
  const runnerUpScore = candidates
    .filter((candidate) => candidate.route !== winner.route)
    .reduce((maximum, candidate) => Math.max(maximum, candidate.score), 0);
  if (winner.score - runnerUpScore < EXPECTED_DECISION_POLICY.min_margin) {
    return { hasEvidence: true, decision: fallbackDecision(), reason: "legacy_insufficient_margin" };
  }
  return {
    hasEvidence: true,
    decision: {
      route: winner.route,
      parameters: winner.parameters,
      response_variant: winner.response_variant,
    },
    reason: "legacy_match",
  };
}

function weightedDiagnostics(
  catalog: CompiledCatalog,
  input: IntentRoutingInput,
  content: string,
  tokens: readonly string[],
): IntentRoutingDiagnostics {
  const weightedIntents = catalog.intents.filter(
    (intent): intent is CompiledIntent & { id: WeightedIntent } =>
      isWeightedIntent(intent.id),
  );
  const matchesByIntent = new Map<WeightedIntent, MatchedWeightedGroup[]>();
  const globallyConsumed = new Set<number>();
  for (const intent of weightedIntents) {
    const matchedGroups: MatchedWeightedGroup[] = [];
    for (const group of intent.weightedSignalGroups) {
      const signals = group.signals.filter(
        (signal) => matchingTokenIndexes(tokens, signal.tokens).length > 0,
      );
      if (signals.length === 0) continue;
      const tokenIndexes = uniqueInOrder(
        signals.flatMap((signal) => matchingTokenIndexes(tokens, signal.tokens)),
      );
      tokenIndexes.forEach((index) => globallyConsumed.add(index));
      matchedGroups.push({ group, signals, tokenIndexes });
    }
    matchesByIntent.set(intent.id, matchedGroups);
  }

  const ignoredTerms: string[] = [];
  for (const phrase of catalog.scaffoldingPhrases) {
    const indexes = matchingTokenIndexes(tokens, phrase);
    if (indexes.length > 0) {
      indexes.forEach((index) => globallyConsumed.add(index));
      ignoredTerms.push(phrase.join(" "));
    }
  }
  tokens.forEach((token, index) => {
    if (!globallyConsumed.has(index) && catalog.scaffoldingTerms.has(token)) {
      globallyConsumed.add(index);
      ignoredTerms.push(token);
    }
  });
  const unknownTerms = uniqueInOrder(
    tokens.filter((_, index) => !globallyConsumed.has(index)),
  );
  const policy = EXPECTED_DECISION_POLICY.weighted_matcher;
  const unknownPenalty = Math.min(
    policy.unknown_content_penalty_cap,
    unknownTerms.length * policy.unknown_content_penalty,
  );

  const evaluations: WeightedEvaluation[] = weightedIntents.map((intent) => {
    const matchedGroups = matchesByIntent.get(intent.id) ?? [];
    const foreignFamilies = weightedIntents.filter(
      (other) =>
        other.id !== intent.id &&
        (matchesByIntent.get(other.id)?.length ?? 0) >= policy.minimum_signal_groups,
    );
    const rawScore = matchedGroups.reduce(
      (total, match) => total + match.group.weight,
      0,
    );
    const foreignPenalty = foreignFamilies.length > 0
      ? policy.foreign_intent_penalty
      : 0;
    const finalScore = Math.max(
      policy.score_min,
      Math.min(policy.score_max, rawScore) - unknownPenalty - foreignPenalty,
    );
    const merged = mergedWeightedEvidence(intent, matchedGroups);
    const evidence = merged === null
      ? null
      : effectiveParameters(
          intent,
          {
            score: finalScore,
            parameters: merged.parameters,
            temporalRule: merged.temporalRule,
            responseVariant: null,
          },
          input,
        );
    const blocked =
      (intent.requiresProfile && !input.context.profile_selected) ||
      intent.exclusions.some((phrase) => containsDelimitedPhrase(content, phrase)) ||
      (intent.id === "course_catalog" &&
        ignoredTerms.length === 0 &&
        matchedGroups.some(
          (match) =>
            match.group.id === "course_object" &&
            match.signals.some((signal) => signal.form === "curso"),
        ) &&
        matchedGroups.some((match) => match.group.id === "catalog_status") &&
        !matchedGroups.some((match) => match.group.id === "catalog_operation"));
    const eligible =
      !blocked &&
      merged !== null &&
      evidence !== null &&
      matchedGroups.length >= policy.minimum_signal_groups &&
      finalScore >= EXPECTED_DECISION_POLICY.threshold;
    const foreignSignals = Object.fromEntries(
      foreignFamilies.map((family) => [
        family.id,
        uniqueInOrder(
          (matchesByIntent.get(family.id) ?? []).flatMap((match) =>
            match.signals.map((signal) => signal.form),
          ),
        ),
      ]),
    );
    return {
      eligible,
      decision: evidence === null
        ? null
        : { route: intent.id, parameters: evidence, response_variant: null },
      diagnostic: {
        candidate_intent: intent.id,
        raw_score: rawScore,
        final_score: finalScore,
        matched_signal_groups: matchedGroups.map((match) => match.group.id),
        matched_signals: uniqueInOrder(
          matchedGroups.flatMap((match) =>
            match.signals.map((signal) => signal.form),
          ),
        ),
        ignored_terms: uniqueInOrder(ignoredTerms),
        unknown_content_terms: unknownTerms,
        foreign_intent_families: foreignFamilies.map((family) => family.id),
        foreign_signals: foreignSignals,
        penalties: [
          ...(unknownPenalty > 0
            ? [{ type: "unknown_content" as const, value: unknownPenalty, terms: unknownTerms }]
            : []),
          ...(foreignPenalty > 0
            ? [{
                type: "foreign_intent" as const,
                value: foreignPenalty,
                families: foreignFamilies.map((family) => family.id),
              }]
            : []),
        ],
      },
    };
  });

  const ranked = [...evaluations].sort(
    (left, right) => right.diagnostic.final_score - left.diagnostic.final_score,
  );
  const winner = ranked[0];
  const runnerUpScore = ranked[1]?.diagnostic.final_score ?? 0;
  const winnerScore = winner?.diagnostic.final_score ?? 0;
  const margin = winnerScore - runnerUpScore;
  let decision = fallbackDecision();
  let decisionReason = "below_threshold_or_minimum_signal_groups";
  if (winner !== undefined) {
    const winnerHasMinimumSignals =
      winner.diagnostic.matched_signal_groups.length >=
      policy.minimum_signal_groups;
    if (
      winnerHasMinimumSignals &&
      evaluations.filter(
        (entry) => entry.diagnostic.final_score === winnerScore,
      ).length > 1
    ) {
      decisionReason = "tie";
    } else if (
      winnerHasMinimumSignals &&
      margin < EXPECTED_DECISION_POLICY.min_margin
    ) {
      decisionReason = "insufficient_margin";
    } else if (
      !winnerHasMinimumSignals ||
      winnerScore < EXPECTED_DECISION_POLICY.threshold
    ) {
      decisionReason = "below_threshold_or_minimum_signal_groups";
    } else if (winner.decision === null) {
      decisionReason = "conflicting_or_unresolvable_parameters";
    } else if (!winner.eligible) {
      decisionReason = "candidate_blocked_by_guard";
    } else {
      decision = winner.decision;
      decisionReason = "weighted_match";
    }
  }
  return {
    decision,
    candidates: evaluations.map((entry) => entry.diagnostic),
    winner_score: winnerScore,
    runner_up_score: runnerUpScore,
    margin,
    decision_reason: decisionReason,
  };
}

function routeWithCatalogDiagnostics(
  catalog: CompiledCatalog,
  input: IntentRoutingInput,
): IntentRoutingDiagnostics {
  const fallback = (reason: string): IntentRoutingDiagnostics => ({
    decision: fallbackDecision(),
    candidates: [],
    winner_score: 0,
    runner_up_score: 0,
    margin: 0,
    decision_reason: reason,
  });
  if (
    typeof input?.content !== "string" ||
    typeof input.context?.profile_selected !== "boolean" ||
    typeof input.context?.now !== "string"
  ) {
    return fallback("invalid_input");
  }
  const content = normalizeInput(input.content);
  if (content === null) return fallback("clause_guard");
  if (content.length === 0) return fallback("empty_input");
  if (
    catalog.globalExclusions.some((phrase) => containsDelimitedPhrase(content, phrase))
  ) {
    return fallback("global_exclusion");
  }
  if (
    catalog.compoundMarkers.some((phrase) => containsDelimitedPhrase(content, phrase))
  ) {
    return fallback("compound_guard");
  }
  const tokens = tokenizeNormalized(content);
  const legacy = legacyDecision(catalog, input, content, tokens);
  if (legacy.hasEvidence) {
    return {
      decision: legacy.decision,
      candidates: [],
      winner_score: legacy.decision.route === "agent_fallback" ? 0 : 100,
      runner_up_score: 0,
      margin: legacy.decision.route === "agent_fallback" ? 0 : 100,
      decision_reason: legacy.reason,
    };
  }
  if (
    tokens.length > 1 &&
    EXPECTED_DECISION_POLICY.standalone_social_allowlist.some((term) =>
      tokens.includes(term),
    )
  ) {
    return fallback("mixed_social_request");
  }
  if (
    [...new Set(tokens)].some(
      (token) =>
        catalog.scaffoldingTerms.has(token) &&
        tokens.filter((entry) => entry === token).length >
          EXPECTED_DECISION_POLICY.lexical_max_filler_tokens,
    )
  ) {
    return fallback("repeated_scaffolding_limit");
  }
  const withoutContextModifiers = tokens
    .filter((token) =>
      !["actual", "actualmente", "ahora", "este", "momento"].includes(token),
    )
    .join(" ");
  if (
    withoutContextModifiers !== content &&
    catalog.intents.some((intent) =>
      intent.rules.some((rule) => rule.text === withoutContextModifiers),
    )
  ) {
    return fallback("legacy_extension_guard");
  }
  return weightedDiagnostics(catalog, input, content, tokens);
}

function invalidRouter(): DiagnosticIntentRouter {
  const diagnostics = (): IntentRoutingDiagnostics => ({
    decision: fallbackDecision(),
    candidates: [],
    winner_score: 0,
    runner_up_score: 0,
    margin: 0,
    decision_reason: "invalid_catalog",
  });
  return {
    catalog_valid: false,
    catalog_version: null,
    route: fallbackDecision,
    routeWithDiagnostics: diagnostics,
  };
}

export function createIntentRouter(catalog: unknown): DiagnosticIntentRouter {
  try {
    const compiled = compileCatalog(catalog);
    if (compiled === null) return invalidRouter();
    return {
      catalog_valid: true,
      catalog_version: compiled.version,
      route: (input) => routeWithCatalogDiagnostics(compiled, input).decision,
      routeWithDiagnostics: (input) =>
        routeWithCatalogDiagnostics(compiled, input),
    };
  } catch {
    return invalidRouter();
  }
}

let defaultRouterPromise: Promise<DiagnosticIntentRouter> | undefined;

export function loadDefaultIntentRouter(): Promise<DiagnosticIntentRouter> {
  defaultRouterPromise ??= readFile(
    new URL("../../intent-routing.catalog.json", import.meta.url),
    "utf8",
  )
    .then((content) => createIntentRouter(JSON.parse(content) as unknown))
    .catch(() => invalidRouter());
  return defaultRouterPromise;
}
