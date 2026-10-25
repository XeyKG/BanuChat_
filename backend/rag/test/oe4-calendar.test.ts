import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCalendarSheetRows,
  parseCalendarSheetFixture,
  type CalendarStoredEvent,
} from "../src/oe4/calendar-sync.js";

const HASH = "a".repeat(64);
const base: CalendarStoredEvent[] = [
  { event_key: "event-020", title: "Anterior", description: "Anterior", event_type: "general",
    starts_at: "2026-11-01T09:00:00-05:00", ends_at: null, course_key: null,
    announcement_key: null, source_path: "calendars/events.json", source_locator: "/events/19",
    source_sha256: "b".repeat(64) },
  { event_key: "event-021", title: "Cancelar", description: "Cancelar", event_type: "general",
    starts_at: "2026-11-15T16:00:00-05:00", ends_at: null, course_key: null,
    announcement_key: null, source_path: "calendars/events.json", source_locator: "/events/20",
    source_sha256: "b".repeat(64) },
  { event_key: "event-022", title: "Eliminar", description: "Eliminar", event_type: "general",
    starts_at: "2026-11-30T23:45:00-05:00", ends_at: null, course_key: null,
    announcement_key: null, source_path: "calendars/events.json", source_locator: "/events/21",
    source_sha256: "b".repeat(64) },
];

function fixtureBytes(): Buffer {
  return Buffer.from(`${JSON.stringify({ schema_version: "oe4-calendar-sheet-fixture-1", synthetic: true,
    source_id: "fixture-calendar-sheet-v1", timezone: "America/Bogota", rows: [
      { event_id: "event-020", status: "active", modified_at: "2026-10-24T14:00:00-05:00",
        title: "Actualizado", description: "Representativo", event_type: "general",
        starts_at: "2026-11-01T10:00:00-05:00", ends_at: null, course_key: null, announcement_key: null },
      { event_id: "event-021", status: "cancelled", modified_at: "2026-10-24T14:02:00-05:00" },
      { event_id: "event-022", status: "deleted", modified_at: "2026-10-24T14:03:00-05:00" },
      { event_id: "event-new", status: "active", modified_at: "2026-10-24T14:04:00-05:00",
        title: "Nuevo", description: "Representativo", event_type: "general",
        starts_at: "2026-11-20T11:00:00-05:00", ends_at: null, course_key: null, announcement_key: null },
    ] })}\n`);
}

test("adapta fixture Sheets local, detecta cambios, cancelación y eliminación", () => {
  const fixture = parseCalendarSheetFixture(fixtureBytes(), "fixture-calendar-sheet-v1");
  const result = applyCalendarSheetRows(base, fixture, HASH);
  assert.deepEqual(result.changes, { created: 1, modified: 1, cancelled: 1, deleted: 1, unchanged: 0 });
  assert.deepEqual(result.events.map(event => event.event_key), ["event-020", "event-new"]);
  assert.equal(result.events[0]?.source_path, "calendars/google-sheets-fixture.json");
  assert.equal(result.source_modified_at, "2026-10-24T14:04:00-05:00");
});

test("rechaza duplicados y conserva la entrada previa al no producir salida parcial", () => {
  const value = JSON.parse(fixtureBytes().toString("utf8")) as { rows: unknown[] };
  value.rows.push(value.rows[0]);
  assert.throws(() => parseCalendarSheetFixture(Buffer.from(`${JSON.stringify(value)}\n`), "fixture-calendar-sheet-v1"),
    /OE4_CALENDAR_DUPLICATE_OR_INVALID_ID/u);
  assert.equal(base.length, 3);
});

test("rechaza cancelar un id desconocido para no borrar silenciosamente el estado válido", () => {
  const fixture = parseCalendarSheetFixture(Buffer.from(`${JSON.stringify({
    schema_version: "oe4-calendar-sheet-fixture-1", synthetic: true,
    source_id: "fixture-calendar-sheet-v1", timezone: "America/Bogota",
    rows: [{ event_id: "event-unknown", status: "deleted", modified_at: "2026-10-24T14:00:00-05:00" }],
  })}\n`), "fixture-calendar-sheet-v1");
  assert.throws(() => applyCalendarSheetRows(base, fixture, HASH), /OE4_CALENDAR_UNKNOWN_REMOVAL/u);
});
