import type { SqlQueryClient } from "../data/sql-client.js";
import { CalendarEventsError } from "./calendar-events-errors.js";
import { resolveCurrentRelease } from "./current-release.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_RANGE_DAYS = 366;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;

const CALENDAR_QUERY_BASE = `
SELECT
  ce.event_key,
  ce.title,
  ce.description,
  ce.event_type,
  ce.starts_at,
  ce.ends_at,
  ce.course_key,
  ce.announcement_key,
  ce.source_path,
  ce.source_locator,
  ce.source_sha256
FROM banuchat.calendar_events ce
WHERE ce.dataset_release_id = $1
  AND ce.starts_at >= (
    $2::date::timestamp AT TIME ZONE 'America/Bogota'
  )
  AND ce.starts_at < (
    (($3::date + 1)::timestamp AT TIME ZONE 'America/Bogota')
  )
`;

export type CalendarEventType =
  | "course_session"
  | "announcement_deadline"
  | "general";

export interface CalendarEventsInput {
  date_from: string;
  date_to: string;
  event_types?: readonly CalendarEventType[];
  limit?: number;
}

export interface CalendarEventSource {
  source_kind: "calendar_event";
  source_path: string;
  source_locator: string;
  source_sha256: string;
}

export interface CalendarEventResult {
  event_key: string;
  title: string;
  description: string;
  event_type: CalendarEventType;
  starts_at: string;
  ends_at: string | null;
  course_key: string | null;
  announcement_key: string | null;
  source: CalendarEventSource;
}

export interface CalendarEventsResult {
  release_id: string;
  events: CalendarEventResult[];
}

function reject(reason: "invalid_argument" | "invalid_database_result"): never {
  throw new CalendarEventsError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isEventType(value: unknown): value is CalendarEventType {
  return (
    value === "course_session" ||
    value === "announcement_deadline" ||
    value === "general"
  );
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseCivilDate(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return undefined;
  }

  const previousYear = year - 1;
  const daysBeforeYear =
    previousYear * 365 +
    Math.floor(previousYear / 4) -
    Math.floor(previousYear / 100) +
    Math.floor(previousYear / 400);
  const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const monthOffset = monthOffsets[month - 1];
  if (monthOffset === undefined) {
    return undefined;
  }
  const leapAdjustment = month > 2 && isLeapYear(year) ? 1 : 0;
  return daysBeforeYear + monthOffset + leapAdjustment + day;
}

function validateInput(input: CalendarEventsInput): {
  eventTypes: readonly CalendarEventType[] | undefined;
  limit: number;
} {
  if (!isRecord(input)) {
    return reject("invalid_argument");
  }

  const fromOrdinal = parseCivilDate(input.date_from);
  const toOrdinal = parseCivilDate(input.date_to);
  if (
    fromOrdinal === undefined ||
    toOrdinal === undefined ||
    toOrdinal < fromOrdinal ||
    toOrdinal - fromOrdinal + 1 > MAX_RANGE_DAYS
  ) {
    return reject("invalid_argument");
  }

  if (input.event_types !== undefined) {
    if (!Array.isArray(input.event_types) || input.event_types.length > 3) {
      return reject("invalid_argument");
    }
    const seen = new Set<CalendarEventType>();
    for (const eventType of input.event_types) {
      if (!isEventType(eventType) || seen.has(eventType)) {
        return reject("invalid_argument");
      }
      seen.add(eventType);
    }
  }

  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return reject("invalid_argument");
  }

  return { eventTypes: input.event_types, limit };
}

function parseRfc3339(value: string): number | undefined {
  const match = RFC3339_PATTERN.exec(value);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === "Z" ? 0 : Number(match[9]);
  const offsetMinute = match[7] === "Z" ? 0 : Number(match[10]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return undefined;
  }

  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : undefined;
}

function normalizeTimestamp(value: unknown): { text: string; instant: number } {
  if (value instanceof Date) {
    const instant = value.getTime();
    if (!Number.isFinite(instant)) {
      return reject("invalid_database_result");
    }
    return { text: value.toISOString(), instant };
  }
  if (typeof value === "string") {
    const instant = parseRfc3339(value);
    if (instant === undefined) {
      return reject("invalid_database_result");
    }
    return { text: value, instant };
  }
  return reject("invalid_database_result");
}

function normalizeNullableTimestamp(
  value: unknown,
): { text: string | null; instant: number | null } {
  if (value === null) {
    return { text: null, instant: null };
  }
  return normalizeTimestamp(value);
}

function normalizeNullableStableKey(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  return isStableKey(value) ? value : reject("invalid_database_result");
}

function normalizeRow(row: unknown): CalendarEventResult {
  if (
    !isRecord(row) ||
    !isStableKey(row.event_key) ||
    !isNonblank(row.title) ||
    !isNonblank(row.description) ||
    !isEventType(row.event_type) ||
    !isNonblank(row.source_path) ||
    !isNonblank(row.source_locator) ||
    !isSha256(row.source_sha256)
  ) {
    return reject("invalid_database_result");
  }

  const startsAt = normalizeTimestamp(row.starts_at);
  const endsAt = normalizeNullableTimestamp(row.ends_at);
  const courseKey = normalizeNullableStableKey(row.course_key);
  const announcementKey = normalizeNullableStableKey(row.announcement_key);
  const foreignKeysAreValid =
    (row.event_type === "course_session" &&
      courseKey !== null &&
      announcementKey === null) ||
    (row.event_type === "announcement_deadline" &&
      announcementKey !== null &&
      courseKey === null) ||
    (row.event_type === "general" &&
      courseKey === null &&
      announcementKey === null);
  if (
    !foreignKeysAreValid ||
    (endsAt.instant !== null && endsAt.instant < startsAt.instant)
  ) {
    return reject("invalid_database_result");
  }

  return {
    event_key: row.event_key,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    starts_at: startsAt.text,
    ends_at: endsAt.text,
    course_key: courseKey,
    announcement_key: announcementKey,
    source: {
      source_kind: "calendar_event",
      source_path: row.source_path,
      source_locator: row.source_locator,
      source_sha256: row.source_sha256,
    },
  };
}

export async function getCalendarEvents(
  client: SqlQueryClient,
  input: CalendarEventsInput,
): Promise<CalendarEventsResult> {
  const { eventTypes, limit } = validateInput(input);
  const release = await resolveCurrentRelease(client);

  const hasEventTypeFilter = eventTypes !== undefined;
  const query = hasEventTypeFilter
    ? `${CALENDAR_QUERY_BASE}  AND ce.event_type = ANY($4::text[])\nORDER BY ce.starts_at ASC, ce.event_key ASC\nLIMIT $5\n`
    : `${CALENDAR_QUERY_BASE}ORDER BY ce.starts_at ASC, ce.event_key ASC\nLIMIT $4\n`;
  const values = hasEventTypeFilter
    ? [release.release_id, input.date_from, input.date_to, eventTypes, limit]
    : [release.release_id, input.date_from, input.date_to, limit];
  const result = await client.query<unknown>(query, values);

  return {
    release_id: release.release_id,
    events: result.rows.map(normalizeRow),
  };
}
