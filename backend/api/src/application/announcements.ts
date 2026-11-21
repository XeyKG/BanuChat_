import type { SqlQueryClient } from "../data/sql-client.js";
import { AnnouncementsError } from "./announcements-errors.js";
import { resolveCurrentRelease } from "./current-release.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;

export const ANNOUNCEMENTS_QUERY_BASE = `
SELECT
  a.announcement_key,
  a.title,
  a.description,
  a.valid_from,
  a.valid_until,
  a.source_path,
  a.source_locator,
  a.source_sha256
FROM banuchat.announcements a
WHERE a.dataset_release_id = $1
`;

const EDITORIAL_FEED_QUERY = `
WITH combined AS (
 SELECT a.announcement_key::text, a.title::text, a.description::text, a.valid_from, a.valid_until,
        a.source_path::text, a.source_locator::text, a.source_sha256::text
 FROM banuchat.announcements a WHERE a.dataset_release_id=$1
 UNION ALL
 SELECT (CASE WHEN n.file_name IS NULL THEN 'editorial-' ELSE 'editorial-file-' END)||n.id,
        n.title,n.body,n.published_at,NULL,'editorial/news/'||n.id,'revision:'||n.revision,
        encode(sha256(convert_to(n.title||chr(10)||n.body,'UTF8')),'hex')
 FROM banuchat_editorial.news n WHERE n.state='published' AND n.published_at<=now()
)
SELECT * FROM combined a WHERE true
`;

export type AnnouncementTemporalStatus =
  | "active"
  | "upcoming"
  | "expired"
  | "all";

export interface AnnouncementsInput {
  query?: string;
  temporal_status?: AnnouncementTemporalStatus;
  reference_time?: string;
  limit?: number;
}

export type DerivedAnnouncementStatus = "active" | "upcoming" | "expired";

export interface AnnouncementSource {
  source_kind: "announcement";
  source_path: string;
  source_locator: string;
  source_sha256: string;
}

export interface AnnouncementResult {
  announcement_key: string;
  title: string;
  description: string;
  valid_from: string;
  valid_until: string | null;
  temporal_status: DerivedAnnouncementStatus;
  source: AnnouncementSource;
}

export interface AnnouncementsResult {
  release_id: string;
  reference_time: string;
  announcements: AnnouncementResult[];
}

interface ValidatedInput {
  query: string | undefined;
  temporalStatus: AnnouncementTemporalStatus;
  referenceTime: string;
  referenceInstant: number;
  limit: number;
}

function reject(reason: "invalid_argument" | "invalid_database_result"): never {
  throw new AnnouncementsError(reason);
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

function isTemporalStatus(value: unknown): value is AnnouncementTemporalStatus {
  return (
    value === "active" ||
    value === "upcoming" ||
    value === "expired" ||
    value === "all"
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

export function validateAnnouncementsInput(input: AnnouncementsInput): ValidatedInput {
  if (!isRecord(input)) {
    return reject("invalid_argument");
  }

  if (
    input.query !== undefined &&
    (typeof input.query !== "string" ||
      input.query.length < 2 ||
      input.query.length > 500 ||
      input.query.trim().length === 0)
  ) {
    return reject("invalid_argument");
  }

  const temporalStatus = input.temporal_status ?? "active";
  if (!isTemporalStatus(temporalStatus)) {
    return reject("invalid_argument");
  }

  let referenceTime: string;
  let referenceInstant: number;
  if (input.reference_time === undefined) {
    const capturedReferenceTime = new Date();
    referenceInstant = capturedReferenceTime.getTime();
    if (!Number.isFinite(referenceInstant)) {
      return reject("invalid_argument");
    }
    referenceTime = capturedReferenceTime.toISOString();
  } else {
    if (typeof input.reference_time !== "string") {
      return reject("invalid_argument");
    }
    const parsedReferenceTime = parseRfc3339(input.reference_time);
    if (parsedReferenceTime === undefined) {
      return reject("invalid_argument");
    }
    referenceTime = input.reference_time;
    referenceInstant = parsedReferenceTime;
  }

  const limit = input.limit ?? DEFAULT_LIMIT;
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    return reject("invalid_argument");
  }

  return {
    query: input.query,
    temporalStatus,
    referenceTime,
    referenceInstant,
    limit,
  };
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

function deriveStatus(
  referenceInstant: number,
  validFromInstant: number,
  validUntilInstant: number | null,
): DerivedAnnouncementStatus {
  if (referenceInstant < validFromInstant) {
    return "upcoming";
  }
  if (validUntilInstant === null || referenceInstant <= validUntilInstant) {
    return "active";
  }
  return "expired";
}

export function normalizeAnnouncementRow(
  row: unknown,
  referenceInstant: number,
): AnnouncementResult {
  if (
    !isRecord(row) ||
    !isStableKey(row.announcement_key) ||
    !isNonblank(row.title) ||
    !isNonblank(row.description) ||
    !isNonblank(row.source_path) ||
    !isNonblank(row.source_locator) ||
    !isSha256(row.source_sha256)
  ) {
    return reject("invalid_database_result");
  }

  const validFrom = normalizeTimestamp(row.valid_from);
  const validUntil = normalizeNullableTimestamp(row.valid_until);
  if (
    validUntil.instant !== null &&
    validUntil.instant < validFrom.instant
  ) {
    return reject("invalid_database_result");
  }

  return {
    announcement_key: row.announcement_key,
    title: row.title,
    description: row.description,
    valid_from: validFrom.text,
    valid_until: validUntil.text,
    temporal_status: deriveStatus(
      referenceInstant,
      validFrom.instant,
      validUntil.instant,
    ),
    source: {
      source_kind: "announcement",
      source_path: row.source_path,
      source_locator: row.source_locator,
      source_sha256: row.source_sha256,
    },
  };
}

export async function getAnnouncements(
  client: SqlQueryClient,
  input: AnnouncementsInput,
  includeEditorial = false,
): Promise<AnnouncementsResult> {
  const validated = validateAnnouncementsInput(input);
  const release = await resolveCurrentRelease(client);
  const values: unknown[] = [release.release_id];
  let query = includeEditorial ? EDITORIAL_FEED_QUERY : ANNOUNCEMENTS_QUERY_BASE;

  if (validated.temporalStatus !== "all") {
    values.push(validated.referenceTime);
    const referenceTimeParameter = `$${values.length}::timestamptz`;
    if (validated.temporalStatus === "active") {
      query +=
        `  AND ${referenceTimeParameter} >= a.valid_from\n` +
        `  AND (a.valid_until IS NULL OR ${referenceTimeParameter} <= a.valid_until)\n`;
    } else if (validated.temporalStatus === "upcoming") {
      query += `  AND ${referenceTimeParameter} < a.valid_from\n`;
    } else {
      query +=
        "  AND a.valid_until IS NOT NULL\n" +
        `  AND ${referenceTimeParameter} > a.valid_until\n`;
    }
  }

  if (validated.query !== undefined) {
    values.push(validated.query);
    const queryParameter = `$${values.length}`;
    query += `  AND (\n    strpos(lower(a.title), lower(${queryParameter})) > 0\n    OR strpos(lower(a.description), lower(${queryParameter})) > 0\n  )\n`;
  }

  values.push(validated.limit);
  query += `ORDER BY a.valid_from ${includeEditorial && validated.temporalStatus !== 'upcoming' ? 'DESC' : 'ASC'}, a.announcement_key ASC\nLIMIT $${values.length}\n`;
  const result = await client.query<unknown>(query, values);

  return {
    release_id: release.release_id,
    reference_time: validated.referenceTime,
    announcements: result.rows.map((row) =>
      normalizeAnnouncementRow(row, validated.referenceInstant),
    ),
  };
}
