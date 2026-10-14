import assert from "node:assert/strict";
import test from "node:test";

import {
  dispatchChatQuery,
  type ChatDispatchInput,
  type CurrentReleaseContext,
  type IntentRouter,
  type IntentRoutingDecision,
  type IntentRoutingInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const HASH = "a".repeat(64);
const DEFAULT_INPUT: ChatDispatchInput = {
  content: "consulta",
  profile_key: "perfil_demo",
  release_id: RELEASE_ID,
  now: "2026-10-01T09:00:00-05:00",
};

function fakeRouter(decision: IntentRoutingDecision): {
  router: IntentRouter;
  inputs: IntentRoutingInput[];
} {
  const inputs: IntentRoutingInput[] = [];
  return {
    inputs,
    router: {
      catalog_valid: true,
      catalog_version: "test",
      route(input) {
        inputs.push(input);
        return decision;
      },
    },
  };
}

function fakeSql(responses: readonly (readonly unknown[])[]): {
  sql: SqlQueryClient;
  calls: { text: string; values: readonly unknown[] | undefined }[];
} {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  let index = 0;
  const sql = {
    async query<Row>(text: string, values?: readonly unknown[]) {
      calls.push({ text, values });
      const rows = responses[index++];
      if (rows === undefined) throw new Error("unexpected SQL query");
      return { rows: rows as Row[] };
    },
  } as SqlQueryClient;
  return { sql, calls };
}

const RELEASE_ROW: CurrentReleaseContext = {
  release_id: RELEASE_ID,
  embedding_config_id: "22222222-2222-4222-8222-222222222222",
};

function releaseRows(): readonly unknown[] {
  return [RELEASE_ROW];
}

function profileRows(alias = "Ada"): readonly unknown[] {
  return [
    {
      profile_key: "perfil_demo",
      alias,
      source_path: "internal/profile.json",
      source_locator: "profile:perfil_demo",
      source_sha256: HASH,
    },
  ];
}

function courseRows(): readonly unknown[] {
  return [
    {
      course_key: "curso_a",
      course_name: "Curso A",
      status: "completed",
      progress_percent: 100,
      started_at: "2026-01-01T09:00:00-05:00",
      completed_at: "2026-02-01T09:00:00-05:00",
      source_path: "internal/progress-a.json",
      source_locator: "profile_course:perfil_demo:curso_a",
      source_sha256: HASH,
    },
    {
      course_key: "curso_b",
      course_name: "Curso B",
      status: "in_progress",
      progress_percent: 45,
      started_at: "2026-03-01T09:00:00-05:00",
      completed_at: null,
      source_path: "internal/progress-b.json",
      source_locator: "profile_course:perfil_demo:curso_b",
      source_sha256: HASH,
    },
  ];
}

function eventRows(): readonly unknown[] {
  return [
    {
      event_key: "evento_a",
      title: "Sesión A",
      description: "Descripción",
      event_type: "general",
      starts_at: "2026-10-01T14:00:00-05:00",
      ends_at: null,
      course_key: null,
      announcement_key: null,
      source_path: "internal/event.json",
      source_locator: "calendar_event:evento_a",
      source_sha256: HASH,
    },
  ];
}

function announcementRows(): readonly unknown[] {
  return [
    {
      announcement_key: "anuncio_a",
      title: "Anuncio A",
      description: "Descripción",
      valid_from: "2026-09-01T00:00:00-05:00",
      valid_until: "2026-10-31T23:59:59-05:00",
      source_path: "internal/announcement.json",
      source_locator: "announcement:anuncio_a",
      source_sha256: HASH,
    },
  ];
}

test("profile_progress usa el perfil confiable, ejecuta C3 y renderiza citas continuas", async () => {
  const { router, inputs } = fakeRouter({
    route: "profile_progress",
    parameters: { statuses: ["completed", "in_progress"], limit: 7 },
    response_variant: null,
  });
  const { sql, calls } = fakeSql([releaseRows(), profileRows(), courseRows()]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") return;
  assert.equal(result.route, "profile_progress");
  assert.equal(
    result.content,
    "Progreso registrado para Ada:\n- Curso A: 100 % (completado).\n- Curso B: 45 % (en progreso).",
  );
  assert.deepEqual(result.citations.map(({ index }) => index), [0, 1, 2]);
  assert.deepEqual(result.citations.map(({ source_kind }) => source_kind), [
    "profile",
    "profile_course",
    "profile_course",
  ]);
  assert.deepEqual(
    result.citation_records.map(
      ({ citation_index, source_kind, source_path, source_sha256 }) => ({
        citation_index,
        source_kind,
        source_path,
        source_sha256,
      }),
    ),
    [
      {
        citation_index: 0,
        source_kind: "profile",
        source_path: "internal/profile.json",
        source_sha256: HASH,
      },
      {
        citation_index: 1,
        source_kind: "profile_course",
        source_path: "internal/progress-a.json",
        source_sha256: HASH,
      },
      {
        citation_index: 2,
        source_kind: "profile_course",
        source_path: "internal/progress-b.json",
        source_sha256: HASH,
      },
    ],
  );
  assert.equal(result.citation_records[0]?.profile_key, "perfil_demo");
  assert.equal(result.citation_records[1]?.course_key, "curso_a");
  assert.equal(result.insufficient_evidence, false);
  assert.deepEqual(inputs, [
    {
      content: DEFAULT_INPUT.content,
      context: { profile_selected: true, now: DEFAULT_INPUT.now },
    },
  ]);
  assert.deepEqual(calls[1]?.values, [RELEASE_ID, "perfil_demo"]);
  assert.deepEqual(calls[2]?.values, [
    RELEASE_ID,
    "perfil_demo",
    ["completed", "in_progress"],
    7,
  ]);
  assert.doesNotMatch(JSON.stringify(result.citations), /source_path|source_sha256/);
});

test("profile_progress sin perfil deriva a fallback sin consultar SQL", async () => {
  const { router, inputs } = fakeRouter({
    route: "profile_progress",
    parameters: {},
    response_variant: null,
  });
  const { sql, calls } = fakeSql([]);

  const result = await dispatchChatQuery(
    { router, sql },
    { ...DEFAULT_INPUT, profile_key: null },
  );

  assert.deepEqual(result, { kind: "agent_fallback" });
  assert.equal(inputs[0]?.context.profile_selected, false);
  assert.equal(calls.length, 0);
});

test("progreso vacío es respuesta determinista sin citas", async () => {
  const { router } = fakeRouter({
    route: "profile_progress",
    parameters: {},
    response_variant: null,
  });
  const { sql } = fakeSql([releaseRows(), profileRows(), []]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.deepEqual(result, {
    kind: "answered",
    route: "profile_progress",
    release_id: RELEASE_ID,
    content:
      "No encontré cursos que coincidan con ese filtro para el perfil seleccionado.",
    insufficient_evidence: false,
    citations: [],
    citation_records: [],
  });
});

test("calendar_events ejecuta C4 con los parámetros del router", async () => {
  const { router } = fakeRouter({
    route: "calendar_events",
    parameters: {
      date_from: "2026-10-01",
      date_to: "2026-10-02",
      event_types: ["general"],
      limit: 4,
    },
    response_variant: null,
  });
  const { sql, calls } = fakeSql([releaseRows(), eventRows()]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") return;
  assert.equal(
    result.content,
    "Encontré estos eventos:\n- 2026-10-01T14:00:00-05:00 — Sesión A",
  );
  assert.deepEqual(calls[1]?.values, [
    RELEASE_ID,
    "2026-10-01",
    "2026-10-02",
    ["general"],
    4,
  ]);
  assert.deepEqual(result.citations.map(({ source_kind }) => source_kind), [
    "calendar_event",
  ]);
  assert.equal(result.citation_records[0]?.event_key, "evento_a");
  assert.equal(result.citation_records[0]?.source_path, "internal/event.json");
});

test("calendar_events sin rango deriva a fallback sin consultar SQL", async () => {
  for (const parameters of [
    { date_to: "2026-10-02" },
    { date_from: "2026-10-01" },
  ]) {
    const { router } = fakeRouter({
      route: "calendar_events",
      parameters,
      response_variant: null,
    });
    const { sql, calls } = fakeSql([]);
    assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
      kind: "agent_fallback",
    });
    assert.equal(calls.length, 0);
  }
});

test("calendario vacío responde sin citas", async () => {
  const { router } = fakeRouter({
    route: "calendar_events",
    parameters: { date_from: "2026-10-01", date_to: "2026-10-01" },
    response_variant: null,
  });
  const { sql } = fakeSql([releaseRows(), []]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") return;
  assert.equal(
    result.content,
    "No encontré eventos que comiencen dentro del rango consultado.",
  );
  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.citation_records, []);
});

test("announcements ejecuta C5 con reference_time y query del router", async () => {
  const referenceTime = "2026-10-01T09:00:00-05:00";
  const { router } = fakeRouter({
    route: "announcements",
    parameters: {
      temporal_status: "active",
      reference_time: referenceTime,
      query: "Anuncio",
      limit: 3,
    },
    response_variant: null,
  });
  const { sql, calls } = fakeSql([releaseRows(), announcementRows()]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") return;
  assert.equal(result.content, "Encontré estos anuncios:\n- Anuncio A — activo");
  assert.deepEqual(calls[1]?.values, [RELEASE_ID, referenceTime, "Anuncio", 3]);
  assert.deepEqual(result.citations.map(({ source_kind }) => source_kind), [
    "announcement",
  ]);
  assert.equal(result.citation_records[0]?.announcement_key, "anuncio_a");
  assert.equal(
    result.citation_records[0]?.source_path,
    "internal/announcement.json",
  );
});

test("announcements sin reference_time deriva a fallback sin consultar SQL", async () => {
  const { router } = fakeRouter({
    route: "announcements",
    parameters: { temporal_status: "active" },
    response_variant: null,
  });
  const { sql, calls } = fakeSql([]);

  assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
    kind: "agent_fallback",
  });
  assert.equal(calls.length, 0);
});

test("anuncios vacíos responden sin citas", async () => {
  const { router } = fakeRouter({
    route: "announcements",
    parameters: { reference_time: DEFAULT_INPUT.now },
    response_variant: null,
  });
  const { sql } = fakeSql([releaseRows(), []]);

  const result = await dispatchChatQuery({ router, sql }, DEFAULT_INPUT);

  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") return;
  assert.equal(result.content, "No encontré anuncios que coincidan con la consulta.");
  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.citation_records, []);
});

test("basic_social greeting responde de forma determinista sin SQL", async () => {
  const { router } = fakeRouter({
    route: "basic_social",
    parameters: {},
    response_variant: "greeting",
  });
  const { sql, calls } = fakeSql([]);

  assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
    kind: "answered",
    route: "basic_social",
    release_id: RELEASE_ID,
    content:
      "Hola, soy Banu. Puedo ayudarte a consultar tu progreso, revisar eventos y anuncios, y responder preguntas basadas en el material disponible. ¿Qué quieres consultar?",
    insufficient_evidence: false,
    citations: [],
    citation_records: [],
  });
  assert.equal(calls.length, 0);
});

test("basic_social responde thanks y farewell sin SQL", async () => {
  const cases = [
    ["thanks", "Con gusto. Si necesitas otra consulta, aquí estoy."],
    [
      "farewell",
      "Hasta luego. Puedes volver cuando quieras para consultar la información disponible.",
    ],
  ] as const;

  for (const [responseVariant, content] of cases) {
    const { router } = fakeRouter({
      route: "basic_social",
      parameters: {},
      response_variant: responseVariant,
    });
    const { sql, calls } = fakeSql([]);

    assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
      kind: "answered",
      route: "basic_social",
      release_id: RELEASE_ID,
      content,
      insufficient_evidence: false,
      citations: [],
      citation_records: [],
    });
    assert.equal(calls.length, 0);
  }
});

test("capabilities_help describe solo capacidades disponibles sin SQL", async () => {
  const { router } = fakeRouter({
    route: "capabilities_help",
    parameters: {},
    response_variant: "capabilities",
  });
  const { sql, calls } = fakeSql([]);

  assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
    kind: "answered",
    route: "capabilities_help",
    release_id: RELEASE_ID,
    content:
      "Puedo ayudarte a consultar el catálogo de cursos y el progreso del perfil de demostración, revisar eventos del calendario y anuncios, y responder preguntas basadas en los documentos y material disponible.",
    insufficient_evidence: false,
    citations: [],
    citation_records: [],
  });
  assert.equal(calls.length, 0);
});

test("known_out_of_scope informa el límite del prototipo sin SQL", async () => {
  const { router } = fakeRouter({
    route: "known_out_of_scope",
    parameters: {},
    response_variant: "not_available",
  });
  const { sql, calls } = fakeSql([]);

  assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
    kind: "answered",
    route: "known_out_of_scope",
    release_id: RELEASE_ID,
    content:
      "Esa información o función no está disponible en este prototipo de demostración.",
    insufficient_evidence: false,
    citations: [],
    citation_records: [],
  });
  assert.equal(calls.length, 0);
});

test("variantes estáticas incompatibles derivan a fallback sin SQL", async () => {
  const decisions: IntentRoutingDecision[] = [
    { route: "basic_social", parameters: {}, response_variant: null },
    {
      route: "capabilities_help",
      parameters: {},
      response_variant: "greeting",
    },
    {
      route: "known_out_of_scope",
      parameters: {},
      response_variant: "capabilities",
    },
  ];

  for (const decision of decisions) {
    const { router } = fakeRouter(decision);
    const { sql, calls } = fakeSql([]);
    assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
      kind: "agent_fallback",
    });
    assert.equal(calls.length, 0);
  }
});

test("las rutas todavía no implementadas derivan a fallback sin SQL", async () => {
  const routes = [
    "agent_fallback",
    "document_lookup",
  ] as const;

  for (const route of routes) {
    const { router } = fakeRouter({
      route,
      parameters: {},
      response_variant: null,
    });
    const { sql, calls } = fakeSql([]);
    assert.deepEqual(await dispatchChatQuery({ router, sql }, DEFAULT_INPUT), {
      kind: "agent_fallback",
    });
    assert.equal(calls.length, 0);
  }
});

for (const status of [undefined, "available", "closed", "archived"] as const) {
  test(`course_catalog ${status ?? "general"} usa SQL estructurado sin perfil ni fallback`, async () => {
    const { router, inputs } = fakeRouter({
      route: "course_catalog",
      parameters: status === undefined ? {} : { statuses: [status], limit: 4 },
      response_variant: null,
    });
    const { sql, calls } = fakeSql([releaseRows(), [{
      course_key: "course_a", name: "Curso A", description: "Descripción sintética",
      status: status ?? "available", source_path: "courses/catalog.json",
      source_locator: "course:course_a", source_sha256: HASH,
    }]]);
    const result = await dispatchChatQuery({ router, sql }, { ...DEFAULT_INPUT, profile_key: null });
    assert.equal(result.kind, "answered");
    if (result.kind !== "answered") assert.fail("expected a fast path answer");
    assert.equal(result.route, "course_catalog");
    assert.equal(result.citations[0]?.source_kind, "course");
    assert.equal(result.citation_records[0]?.course_key, "course_a");
    assert.equal(inputs[0]?.context.profile_selected, false);
    assert.equal(calls.length, 2);
    assert.match(calls[1]!.text, /FROM banuchat\.courses/u);
    assert.doesNotMatch(calls[1]!.text, /profile_courses/u);
    assert.deepEqual(calls[1]!.values, status === undefined
      ? [RELEASE_ID, 20] : [RELEASE_ID, [status], 4]);
  });
}

test("course_catalog vacío se responde sin fallback", async () => {
  const { router } = fakeRouter({ route: "course_catalog", parameters: {}, response_variant: null });
  const { sql } = fakeSql([releaseRows(), []]);
  const result = await dispatchChatQuery({ router, sql }, { ...DEFAULT_INPUT, profile_key: null });
  assert.equal(result.kind, "answered");
  if (result.kind !== "answered") assert.fail("expected a fast path answer");
  assert.equal(result.route, "course_catalog");
  assert.deepEqual(result.citations, []);
});

test("los errores de servicio se propagan", async () => {
  const expected = new Error("database unavailable");
  const { router } = fakeRouter({
    route: "calendar_events",
    parameters: { date_from: "2026-10-01", date_to: "2026-10-01" },
    response_variant: null,
  });
  const sql = {
    async query() {
      throw expected;
    },
  } as SqlQueryClient;

  await assert.rejects(dispatchChatQuery({ router, sql }, DEFAULT_INPUT), expected);
});

test("el mismo input y resultados producen exactamente la misma salida", async () => {
  const decision: IntentRoutingDecision = {
    route: "announcements",
    parameters: { reference_time: DEFAULT_INPUT.now },
    response_variant: null,
  };
  const firstRouter = fakeRouter(decision).router;
  const secondRouter = fakeRouter(decision).router;
  const firstSql = fakeSql([releaseRows(), announcementRows()]).sql;
  const secondSql = fakeSql([releaseRows(), announcementRows()]).sql;

  const first = await dispatchChatQuery(
    { router: firstRouter, sql: firstSql },
    DEFAULT_INPUT,
  );
  const second = await dispatchChatQuery(
    { router: secondRouter, sql: secondSql },
    DEFAULT_INPUT,
  );

  assert.deepEqual(first, second);
});
