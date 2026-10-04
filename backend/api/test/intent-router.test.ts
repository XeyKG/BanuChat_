import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createIntentRouter,
  loadDefaultIntentRouter,
  type IntentRoutingDecision,
} from "../src/index.js";

const NOW = "2026-09-26T15:00:00-05:00";
const CATALOG_PATH = new URL("../intent-routing.catalog.json", import.meta.url);
const CATALOG = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as unknown;
const CASES_PATH = new URL("../../../eval/intent-routing/cases.json", import.meta.url);

function route(
  content: string,
  options: { profileSelected?: boolean; now?: string } = {},
): IntentRoutingDecision {
  return createIntentRouter(CATALOG).route({
    content,
    context: {
      profile_selected: options.profileSelected ?? true,
      now: options.now ?? NOW,
    },
  });
}

function expected(
  routeName: IntentRoutingDecision["route"],
  parameters: IntentRoutingDecision["parameters"],
  responseVariant: IntentRoutingDecision["response_variant"] = null,
): IntentRoutingDecision {
  return {
    route: routeName,
    parameters,
    response_variant: responseVariant,
  };
}

function cloneCatalog(): Record<string, unknown> {
  return structuredClone(CATALOG) as Record<string, unknown>;
}

function intentsOf(catalog: Record<string, unknown>): Record<string, unknown>[] {
  return catalog.intents as Record<string, unknown>[];
}

function intentOf(
  catalog: Record<string, unknown>,
  id: string,
): Record<string, unknown> {
  const intent = intentsOf(catalog).find((entry) => entry.id === id);
  assert.ok(intent);
  return intent;
}

function lexicalPatternsOf(
  catalog: Record<string, unknown>,
  id: string,
): Record<string, unknown>[] {
  return intentOf(catalog, id).lexical_patterns as Record<string, unknown>[];
}

test("loads and compiles the repository catalog", async () => {
  const router = await loadDefaultIntentRouter();
  assert.equal(router.catalog_valid, true);
  assert.equal(router.catalog_version, "1.1.0-draft");
});

test("all design cases through M6.1.2 execute as routing regression", () => {
  const dataset = JSON.parse(readFileSync(CASES_PATH, "utf8")) as {
    catalog_version: string;
    cases: Array<{
      id: string;
      input: string;
      context: { profile_selected: boolean; now: string };
      expected_route: IntentRoutingDecision["route"];
      expected_parameters: IntentRoutingDecision["parameters"];
      expected_response_variant: IntentRoutingDecision["response_variant"];
    }>;
  };
  const router = createIntentRouter(CATALOG);
  assert.equal(router.catalog_valid, true);
  assert.equal(dataset.catalog_version, router.catalog_version);
  assert.equal(dataset.cases.length, 158);
  assert.equal(new Set(dataset.cases.map((item) => item.id)).size, dataset.cases.length);
  for (const item of dataset.cases) {
    assert.deepEqual(
      router.route({ content: item.input, context: item.context }),
      expected(item.expected_route, item.expected_parameters, item.expected_response_variant),
      item.id,
    );
  }
});

test("lexical rules require every signal and only allowlisted residual tokens", () => {
  assert.deepEqual(route("¿Cuál es mi progreso?"), expected("profile_progress", { limit: 20 }));
  assert.deepEqual(route("¿Cómo va mi avance?"), expected("profile_progress", { limit: 20 }));
  assert.deepEqual(
    route("Quiero consultar mi progreso"),
    expected("profile_progress", { limit: 20 }),
  );
  assert.deepEqual(route("¿Cuál es mi progreso exacto?"), expected("agent_fallback", {}));
  assert.deepEqual(route("¿Cuál es mi progresograma?"), expected("agent_fallback", {}));
  assert.deepEqual(route("¿Qué tengo hoy?"), expected("agent_fallback", {}));
  assert.deepEqual(route("mi progreso"), expected("profile_progress", { limit: 20 }));
});

test("M6.1.2 progress phrasing preserves conservative guards", () => {
  for (const content of [
    "No quiero consultar mi progreso",
    "Quiero consultar mi progreso y anuncios vigentes",
    "Quiero consultar mi progreso detallado",
  ]) {
    assert.deepEqual(route(content), expected("agent_fallback", {}));
  }
});

test("lexical fillers are limited to five residual tokens", () => {
  assert.deepEqual(
    route("cual cual cual cual cual mi progreso"),
    expected("profile_progress", { limit: 20 }),
  );
  assert.deepEqual(
    route("cual cual cual cual cual cual mi progreso"),
    expected("agent_fallback", {}),
  );
});

test("multiword lexical signals require separate token spans", () => {
  const catalog = cloneCatalog();
  const pattern = lexicalPatternsOf(catalog, "profile_progress")[0];
  assert.ok(pattern);
  pattern.required_groups = [["mira progreso"], ["progreso"]];
  pattern.allowed_fillers = [];
  const router = createIntentRouter(catalog);
  assert.equal(router.catalog_valid, true);
  const context = { profile_selected: true, now: NOW };
  assert.deepEqual(
    router.route({ content: "mira progreso", context }),
    expected("agent_fallback", {}),
  );
  assert.deepEqual(
    router.route({ content: "mira progreso progreso", context }),
    expected("profile_progress", { limit: 20 }),
  );
});

test("lexical evidence from two families falls back regardless of score", () => {
  const catalog = cloneCatalog();
  lexicalPatternsOf(catalog, "course_catalog").push({
    ...structuredClone(lexicalPatternsOf(catalog, "profile_progress")[0]),
    id: "course_catalog_l_test",
  });
  const router = createIntentRouter(catalog);
  assert.equal(router.catalog_valid, true);
  assert.deepEqual(
    router.route({ content: "¿Cuál es mi progreso?", context: { profile_selected: true, now: NOW } }),
    expected("agent_fallback", {}),
  );
});

test("conflicting lexical parameters in one family fall back", () => {
  const catalog = cloneCatalog();
  const conflicting = lexicalPatternsOf(catalog, "profile_progress")[2];
  assert.ok(conflicting);
  conflicting.required_groups = [["mi"], ["progreso"]];
  conflicting.allowed_fillers = [];
  const router = createIntentRouter(catalog);
  assert.equal(router.catalog_valid, true);
  assert.deepEqual(
    router.route({ content: "mi progreso", context: { profile_selected: true, now: NOW } }),
    expected("agent_fallback", {}),
  );
});

test("normalizes case, acute accents, punctuation, whitespace, and one courtesy suffix", () => {
  for (const content of [
    "MI PROGRESO",
    "MÍ PROGRESO",
    "  mi\t  progreso  ",
    "¿mi progreso?",
    "mi progreso, por favor",
  ]) {
    assert.deepEqual(route(content), expected("profile_progress", { limit: 20 }));
  }
});

test("preserves the tilde in ñ during accent-tolerant comparison", () => {
  assert.deepEqual(
    route("que eventos hay mañana"),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-09-27",
      date_to: "2026-09-27",
    }),
  );
  assert.deepEqual(route("que eventos hay manana"), expected("agent_fallback", {}));
});

test("clause guard rejects multiple nonempty segments but permits surrounding signs", () => {
  assert.deepEqual(
    route("¿qué cursos hay?"),
    expected("course_catalog", { limit: 20 }),
  );
  for (const content of [
    "¿qué cursos hay? ¿qué anuncios hay?",
    "qué cursos hay\nmi progreso",
    "qué cursos hay; mi progreso",
  ]) {
    assert.deepEqual(route(content), expected("agent_fallback", {}));
  }
});

test("global exclusions and compound markers use delimited phrases", () => {
  assert.deepEqual(
    route("no quiero ver cursos disponibles"),
    expected("agent_fallback", {}),
  );
  assert.deepEqual(route("hola y gracias"), expected("agent_fallback", {}));
  assert.deepEqual(
    route("en que me puedes ayudar"),
    expected("capabilities_help", {}, "capabilities"),
  );
});

test("matches a strong expression and an ordered token combination", () => {
  assert.deepEqual(
    route("cursos disponibles"),
    expected("course_catalog", { limit: 20, statuses: ["available"] }),
  );
  assert.deepEqual(
    route("revisa mi avance"),
    expected("profile_progress", { limit: 20 }),
  );
});

test("token combinations reject reordered, inserted, and residual text", () => {
  for (const content of [
    "mi avance revisa",
    "revisa ahora mi avance",
    "revisa mi avance pendiente",
    "cursos disponibles ahora",
  ]) {
    assert.deepEqual(route(content), expected("agent_fallback", {}));
  }
});

test("falls back when two families have equally strong matching rules", () => {
  const catalog = cloneCatalog();
  const courseRule = (
    intentOf(catalog, "course_catalog").strong_expressions as Record<
      string,
      unknown
    >[]
  )[0];
  assert.ok(courseRule);
  courseRule.text = "mi progreso";
  const router = createIntentRouter(catalog);
  assert.equal(router.catalog_valid, true);
  assert.deepEqual(
    router.route({
      content: "mi progreso",
      context: { profile_selected: true, now: NOW },
    }),
    expected("agent_fallback", {}),
  );
});

test("falls back when matching rules in one family disagree on parameters", () => {
  const catalog = cloneCatalog();
  const rules = intentOf(catalog, "profile_progress")
    .strong_expressions as Record<string, unknown>[];
  const conflictingRule = rules.find(
    (entry) => entry.id === "profile_progress_e06",
  );
  assert.ok(conflictingRule);
  conflictingRule.text = "mi progreso";
  const router = createIntentRouter(catalog);
  assert.equal(router.catalog_valid, true);
  assert.deepEqual(
    router.route({
      content: "mi progreso",
      context: { profile_selected: true, now: NOW },
    }),
    expected("agent_fallback", {}),
  );
});

test("requires a selected profile for profile_progress", () => {
  assert.deepEqual(
    route("mi progreso", { profileSelected: false }),
    expected("agent_fallback", {}),
  );
});

test("applies per-intent exclusions as complete delimited phrases", () => {
  assert.deepEqual(
    route("muestrame el progreso del perfil beta"),
    expected("agent_fallback", {}),
  );
});

test("derives today from the civil day in America/Bogota, not UTC", () => {
  assert.deepEqual(
    route("que eventos hay hoy", { now: "2026-09-27T02:00:00Z" }),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-09-26",
      date_to: "2026-09-26",
    }),
  );
});

test("derives tomorrow across a month boundary", () => {
  assert.deepEqual(
    route("actividades de mañana", { now: "2026-09-30T23:30:00-05:00" }),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-10-01",
      date_to: "2026-10-01",
    }),
  );
});

test("derives this week as Monday through Sunday", () => {
  assert.deepEqual(
    route("eventos de esta semana", { now: "2026-09-30T12:00:00-05:00" }),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-09-28",
      date_to: "2026-10-04",
    }),
  );
});

test("derives next week across the year boundary", () => {
  assert.deepEqual(
    route("eventos de la proxima semana", {
      now: "2026-12-31T18:00:00-05:00",
    }),
    expected("calendar_events", {
      limit: 20,
      date_from: "2027-01-04",
      date_to: "2027-01-10",
    }),
  );
});

test("matches valid absolute day and range grammar", () => {
  assert.deepEqual(
    route("eventos del 2026-10-01"),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-10-01",
      date_to: "2026-10-01",
    }),
  );
  assert.deepEqual(
    route("eventos del 2026-10-01 al 2026-11-30"),
    expected("calendar_events", {
      limit: 20,
      date_from: "2026-10-01",
      date_to: "2026-11-30",
    }),
  );
});

test("rejects unsupported, impossible, inverted, and overlong absolute dates", () => {
  for (const content of [
    "eventos del 26/09/2026",
    "eventos del 2026-02-30",
    "eventos del 2026-11-03 al 2026-11-01",
    "eventos del 2026-01-01 al 2027-01-02",
    "eventos del proximo viernes",
    "eventos dentro de dos semanas",
  ]) {
    assert.deepEqual(route(content), expected("agent_fallback", {}));
  }
});

test("invalid now only disables matches that need temporal context", () => {
  assert.deepEqual(
    route("que eventos hay hoy", { now: "2026-02-30T12:00:00Z" }),
    expected("agent_fallback", {}),
  );
  assert.deepEqual(
    route("que anuncios hay", { now: "not-a-time" }),
    expected("agent_fallback", {}),
  );
  assert.deepEqual(
    route("cursos disponibles", { now: "not-a-time" }),
    expected("course_catalog", { limit: 20, statuses: ["available"] }),
  );
});

test("routes all frozen families and derives announcement reference_time", () => {
  const cases: Array<[string, IntentRoutingDecision]> = [
    ["mi progreso", expected("profile_progress", { limit: 20 })],
    ["que cursos hay", expected("course_catalog", { limit: 20 })],
    [
      "que eventos hay hoy",
      expected("calendar_events", {
        limit: 20,
        date_from: "2026-09-26",
        date_to: "2026-09-26",
      }),
    ],
    [
      "que anuncios hay",
      expected("announcements", {
        limit: 20,
        temporal_status: "active",
        reference_time: NOW,
      }),
    ],
    [
      "busca la guia de actividad integradora",
      expected("document_lookup", {
        limit: 10,
        query: "Guía completa de actividad integradora",
        retrieval_mode: "full_document",
      }),
    ],
    [
      "que puedes hacer",
      expected("capabilities_help", {}, "capabilities"),
    ],
    ["hola", expected("basic_social", {}, "greeting")],
    ["gracias", expected("basic_social", {}, "thanks")],
    ["adios", expected("basic_social", {}, "farewell")],
    [
      "cuales son mis calificaciones",
      expected("known_out_of_scope", {}, "not_available"),
    ],
  ];
  for (const [content, decision] of cases) {
    assert.deepEqual(route(content), decision);
  }
});

test("an invalid catalog disables every fast path without partial execution", () => {
  const mutations: Array<(catalog: Record<string, unknown>) => void> = [
    (catalog) => {
      delete catalog.catalog_version;
    },
    (catalog) => {
      catalog.catalog_version = "unsupported";
    },
    (catalog) => {
      catalog.intents = {};
    },
    (catalog) => {
      intentsOf(catalog)[1]!.id = "profile_progress";
    },
    (catalog) => {
      const rule = (
        intentOf(catalog, "calendar_events").strong_expressions as Record<
          string,
          unknown
        >[]
      )[0]!;
      rule.temporal_rule = "next_month";
    },
    (catalog) => {
      const rule = (
        intentOf(catalog, "basic_social").strong_expressions as Record<
          string,
          unknown
        >[]
      )[0]!;
      rule.response_variant = "unknown";
    },
    (catalog) => {
      const policy = catalog.decision_policy as Record<string, unknown>;
      policy.score_aggregation = "sum";
    },
    (catalog) => {
      delete intentOf(catalog, "profile_progress").lexical_patterns;
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.required_groups = [["mi"]];
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.required_groups = [["mi", "mi"], ["progreso"]];
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.allowed_fillers = ["cual", "cual"];
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.allowed_fillers = ["por favor"];
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.extra = true;
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.temporal_rule = "today";
    },
    (catalog) => {
      lexicalPatternsOf(catalog, "profile_progress")[0]!.id = "profile_progress_e01";
    },
  ];

  for (const mutate of mutations) {
    const catalog = cloneCatalog();
    mutate(catalog);
    const router = createIntentRouter(catalog);
    assert.equal(router.catalog_valid, false);
    assert.equal(router.catalog_version, null);
    assert.deepEqual(
      router.route({
        content: "mi progreso",
        context: { profile_selected: true, now: NOW },
      }),
      expected("agent_fallback", {}),
    );
  }
});
