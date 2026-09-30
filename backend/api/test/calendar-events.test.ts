import assert from "node:assert/strict";
import test from "node:test";

import {
  CalendarEventsError,
  getCalendarEvents,
  type CalendarEventsInput,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const EMBEDDING_ID = "22222222-2222-4222-8222-222222222222";
const SHA256 = "a".repeat(64);

interface QueryCall {
  text: string;
  values: readonly unknown[] | undefined;
}

class FakeSqlQueryClient implements SqlQueryClient {
  readonly calls: QueryCall[] = [];

  constructor(
    private readonly eventRows: unknown[] = [],
    private readonly calendarFailure?: Error,
  ) {}

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    if (this.calls.length === 1) {
      return {
        rows: [
          { release_id: RELEASE_ID, embedding_config_id: EMBEDDING_ID },
        ] as T[],
      };
    }
    if (this.calendarFailure !== undefined) {
      throw this.calendarFailure;
    }
    return { rows: this.eventRows as T[] };
  }
}

const validInput: CalendarEventsInput = {
  date_from: "2026-01-01",
  date_to: "2026-01-31",
};

function eventRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event_key: "event_1",
    title: "Evento sintético",
    description: "Descripción sintética",
    event_type: "general",
    starts_at: "2026-01-10T14:00:00-05:00",
    ends_at: null,
    course_key: null,
    announcement_key: null,
    source_path: "calendars/events.json",
    source_locator: "$.events[0]",
    source_sha256: SHA256,
    ...overrides,
  };
}

function expectCalendarError(
  action: () => Promise<unknown>,
  reason: "invalid_argument" | "invalid_database_result",
): Promise<void> {
  return assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof CalendarEventsError);
    assert.equal(error.reason, reason);
    assert.deepEqual(error.toJSON(), {
      code: "CALENDAR_EVENTS_REJECTED",
      reason,
    });
    return true;
  });
}

test("returns several valid events and normalizes Date values", async () => {
  const client = new FakeSqlQueryClient([
    eventRow(),
    eventRow({
      event_key: "course_event",
      event_type: "course_session",
      course_key: "course_1",
      starts_at: new Date("2026-01-11T15:00:00.000Z"),
      ends_at: new Date("2026-01-11T16:00:00.000Z"),
    }),
    eventRow({
      event_key: "deadline_event",
      event_type: "announcement_deadline",
      announcement_key: "announcement_1",
    }),
  ]);

  const result = await getCalendarEvents(client, validInput);

  assert.equal(result.release_id, RELEASE_ID);
  assert.equal(result.events.length, 3);
  assert.equal(result.events[1]?.starts_at, "2026-01-11T15:00:00.000Z");
  assert.equal(result.events[1]?.source.source_kind, "calendar_event");
});

test("an empty event list is successful", async () => {
  const result = await getCalendarEvents(new FakeSqlQueryClient(), validInput);
  assert.deepEqual(result, { release_id: RELEASE_ID, events: [] });
});

test("uses default and custom limits", async () => {
  const defaultClient = new FakeSqlQueryClient();
  await getCalendarEvents(defaultClient, validInput);
  assert.deepEqual(defaultClient.calls[1]?.values, [
    RELEASE_ID,
    "2026-01-01",
    "2026-01-31",
    20,
  ]);

  const customClient = new FakeSqlQueryClient();
  await getCalendarEvents(customClient, { ...validInput, limit: 7 });
  assert.equal(customClient.calls[1]?.values?.at(-1), 7);
});

test("parameterizes event_types, including an empty selection", async () => {
  for (const eventTypes of [["general"], []] as const) {
    const client = new FakeSqlQueryClient();
    await getCalendarEvents(client, { ...validInput, event_types: eventTypes });
    assert.match(client.calls[1]?.text ?? "", /event_type = ANY\(\$4::text\[\]\)/);
    assert.deepEqual(client.calls[1]?.values, [
      RELEASE_ID,
      "2026-01-01",
      "2026-01-31",
      eventTypes,
      20,
    ]);
  }
});

test("rejects duplicate, unknown, and oversized event type selections", async () => {
  const invalidSelections: unknown[] = [
    ["general", "general"],
    ["unknown"],
    ["general", "course_session", "announcement_deadline", "general"],
  ];
  for (const event_types of invalidSelections) {
    const client = new FakeSqlQueryClient();
    await expectCalendarError(
      () =>
        getCalendarEvents(client, {
          ...validInput,
          event_types,
        } as CalendarEventsInput),
      "invalid_argument",
    );
    assert.equal(client.calls.length, 0);
  }
});

test("rejects invalid limits", async () => {
  for (const limit of [0, 51, 1.5]) {
    await expectCalendarError(
      () =>
        getCalendarEvents(new FakeSqlQueryClient(), { ...validInput, limit }),
      "invalid_argument",
    );
  }
});

test("rejects invalid date formats and impossible dates", async () => {
  for (const date_from of ["26-01-01", "2026/01/01", "2026-13-01", "2026-02-30"]) {
    await expectCalendarError(
      () =>
        getCalendarEvents(new FakeSqlQueryClient(), { ...validInput, date_from }),
      "invalid_argument",
    );
  }
});

test("rejects reversed ranges", async () => {
  await expectCalendarError(
    () =>
      getCalendarEvents(new FakeSqlQueryClient(), {
        date_from: "2026-02-01",
        date_to: "2026-01-31",
      }),
    "invalid_argument",
  );
});

test("accepts exactly 366 inclusive days and rejects 367", async () => {
  await getCalendarEvents(new FakeSqlQueryClient(), {
    date_from: "2024-01-01",
    date_to: "2024-12-31",
  });
  await expectCalendarError(
    () =>
      getCalendarEvents(new FakeSqlQueryClient(), {
        date_from: "2024-01-01",
        date_to: "2025-01-01",
      }),
    "invalid_argument",
  );
});

test("SQL applies the fixed civil window, starts_at-only filter, ordering, and pinned release", async () => {
  const client = new FakeSqlQueryClient();
  await getCalendarEvents(client, validInput);
  const calendarCall = client.calls[1];
  assert.ok(calendarCall);
  assert.match(calendarCall.text, /AT TIME ZONE 'America\/Bogota'/);
  assert.match(calendarCall.text, /starts_at\s*>=/);
  assert.match(calendarCall.text, /starts_at\s*</);
  assert.match(calendarCall.text, /\$3::date \+ 1/);
  assert.doesNotMatch(calendarCall.text, /ends_at\s*[<>]/);
  assert.match(calendarCall.text, /ORDER BY ce\.starts_at ASC, ce\.event_key ASC/);
  assert.equal(calendarCall.values?.[0], RELEASE_ID);
  assert.equal(client.calls.length, 2);
});

test("accepts every valid physical event shape", async () => {
  const rows = [
    eventRow({ event_type: "course_session", course_key: "course_1" }),
    eventRow({
      event_key: "event_2",
      event_type: "announcement_deadline",
      announcement_key: "announcement_1",
    }),
    eventRow({ event_key: "event_3" }),
  ];
  const result = await getCalendarEvents(new FakeSqlQueryClient(rows), validInput);
  assert.deepEqual(
    result.events.map((event) => event.event_type),
    ["course_session", "announcement_deadline", "general"],
  );
});

test("rejects invalid foreign-key combinations", async () => {
  const invalidRows = [
    eventRow({ event_type: "course_session" }),
    eventRow({ event_type: "course_session", course_key: "course_1", announcement_key: "announcement_1" }),
    eventRow({ event_type: "announcement_deadline" }),
    eventRow({ event_type: "general", course_key: "course_1" }),
  ];
  for (const row of invalidRows) {
    await expectCalendarError(
      () => getCalendarEvents(new FakeSqlQueryClient([row]), validInput),
      "invalid_database_result",
    );
  }
});

test("rejects an end before its start", async () => {
  await expectCalendarError(
    () =>
      getCalendarEvents(
        new FakeSqlQueryClient([
          eventRow({ ends_at: "2026-01-10T13:59:59-05:00" }),
        ]),
        validInput,
      ),
    "invalid_database_result",
  );
});

test("rejects invalid timestamps", async () => {
  for (const overrides of [
    { starts_at: "2026-02-30T12:00:00Z" },
    { ends_at: "not-a-timestamp" },
    { starts_at: new Date(Number.NaN) },
  ]) {
    await expectCalendarError(
      () =>
        getCalendarEvents(
          new FakeSqlQueryClient([eventRow(overrides)]),
          validInput,
        ),
      "invalid_database_result",
    );
  }
});

test("rejects invalid source provenance", async () => {
  for (const overrides of [
    { source_path: " " },
    { source_locator: "" },
    { source_sha256: "A".repeat(64) },
  ]) {
    await expectCalendarError(
      () =>
        getCalendarEvents(
          new FakeSqlQueryClient([eventRow(overrides)]),
          validInput,
        ),
      "invalid_database_result",
    );
  }
});

test("propagates SQL client errors without wrapping", async () => {
  const failure = new Error("synthetic SQL failure");
  await assert.rejects(
    () => getCalendarEvents(new FakeSqlQueryClient([], failure), validInput),
    (error: unknown) => error === failure,
  );
});
