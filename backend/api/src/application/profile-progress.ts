import type { SqlQueryClient } from "../data/sql-client.js";
import { resolveCurrentRelease } from "./current-release.js";
import { ProfileProgressError } from "./profile-progress-errors.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;

const PROFILE_QUERY = `
SELECT
  profile_key,
  alias,
  source_path,
  source_locator,
  source_sha256
FROM banuchat.synthetic_profiles
WHERE dataset_release_id = $1
  AND profile_key = $2
`;

const PROGRESS_QUERY_BASE = `
SELECT
  pc.course_key,
  c.name AS course_name,
  pc.status,
  pc.progress_percent,
  pc.started_at,
  pc.completed_at,
  pc.source_path,
  pc.source_locator,
  pc.source_sha256
FROM banuchat.profile_courses pc
JOIN banuchat.courses c
  ON c.dataset_release_id = pc.dataset_release_id
 AND c.course_key = pc.course_key
WHERE pc.dataset_release_id = $1
  AND pc.profile_key = $2
`;

export type ProfileProgressStatus =
  | "enrolled"
  | "in_progress"
  | "completed";

export interface ProfileProgressInput {
  profile_key: string;
  statuses?: readonly ProfileProgressStatus[];
  limit?: number;
}

export interface StructuredSource {
  source_kind: "profile" | "profile_course";
  source_path: string;
  source_locator: string;
  source_sha256: string;
}

export interface ProfileProgressCourse {
  course_key: string;
  course_name: string;
  status: ProfileProgressStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  source: StructuredSource & { source_kind: "profile_course" };
}

export interface ProfileProgressResult {
  release_id: string;
  profile: {
    profile_key: string;
    alias: string;
    source: StructuredSource & { source_kind: "profile" };
  };
  courses: ProfileProgressCourse[];
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isStatus(value: unknown): value is ProfileProgressStatus {
  return (
    value === "enrolled" ||
    value === "in_progress" ||
    value === "completed"
  );
}

function reject(reason: "invalid_argument" | "invalid_database_result"): never {
  throw new ProfileProgressError(reason);
}

function validateInput(input: ProfileProgressInput): {
  statuses: readonly ProfileProgressStatus[] | undefined;
  limit: number;
} {
  if (!isStableKey(input.profile_key)) {
    reject("invalid_argument");
  }

  if (input.statuses !== undefined) {
    if (!Array.isArray(input.statuses) || input.statuses.length > 3) {
      reject("invalid_argument");
    }

    const seen = new Set<ProfileProgressStatus>();
    for (const status of input.statuses) {
      if (!isStatus(status) || seen.has(status)) {
        reject("invalid_argument");
      }
      seen.add(status);
    }
  }

  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    reject("invalid_argument");
  }

  return { statuses: input.statuses, limit };
}

function normalizeProgress(value: unknown): number {
  let progress: number;
  if (typeof value === "number") {
    progress = value;
  } else if (typeof value === "string" && DECIMAL_PATTERN.test(value)) {
    progress = Number(value);
  } else {
    return reject("invalid_database_result");
  }

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    reject("invalid_database_result");
  }
  return progress;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
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

function normalizeTimestamp(value: unknown): {
  text: string | null;
  instant: number | null;
} {
  if (value === null) {
    return { text: null, instant: null };
  }

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

function validateSource(row: Record<string, unknown>): {
  source_path: string;
  source_locator: string;
  source_sha256: string;
} {
  if (
    !isNonblank(row.source_path) ||
    !isNonblank(row.source_locator) ||
    !isSha256(row.source_sha256)
  ) {
    return reject("invalid_database_result");
  }
  return {
    source_path: row.source_path,
    source_locator: row.source_locator,
    source_sha256: row.source_sha256,
  };
}

export async function getProfileProgress(
  client: SqlQueryClient,
  input: ProfileProgressInput,
): Promise<ProfileProgressResult> {
  const { statuses, limit } = validateInput(input);
  const release = await resolveCurrentRelease(client);

  const profileResult = await client.query<unknown>(PROFILE_QUERY, [
    release.release_id,
    input.profile_key,
  ]);
  if (profileResult.rows.length === 0) {
    throw new ProfileProgressError("profile_not_found");
  }
  if (profileResult.rows.length !== 1) {
    reject("invalid_database_result");
  }

  const profileRow = profileResult.rows[0];
  if (
    !isRecord(profileRow) ||
    !isStableKey(profileRow.profile_key) ||
    profileRow.profile_key !== input.profile_key ||
    !isNonblank(profileRow.alias)
  ) {
    reject("invalid_database_result");
  }
  const profileSource = validateSource(profileRow);

  const hasStatusFilter = statuses !== undefined;
  const progressQuery = hasStatusFilter
    ? `${PROGRESS_QUERY_BASE}  AND pc.status = ANY($3::text[])\nORDER BY pc.course_key ASC\nLIMIT $4\n`
    : `${PROGRESS_QUERY_BASE}ORDER BY pc.course_key ASC\nLIMIT $3\n`;
  const progressValues = hasStatusFilter
    ? [release.release_id, input.profile_key, statuses, limit]
    : [release.release_id, input.profile_key, limit];
  const progressResult = await client.query<unknown>(
    progressQuery,
    progressValues,
  );

  const courses = progressResult.rows.map((row): ProfileProgressCourse => {
    if (
      !isRecord(row) ||
      !isStableKey(row.course_key) ||
      !isNonblank(row.course_name) ||
      !isStatus(row.status)
    ) {
      return reject("invalid_database_result");
    }

    const progress = normalizeProgress(row.progress_percent);
    const started = normalizeTimestamp(row.started_at);
    const completed = normalizeTimestamp(row.completed_at);
    const invariantHolds =
      (row.status === "enrolled" && progress === 0 && completed.text === null) ||
      (row.status === "in_progress" &&
        progress > 0 &&
        progress < 100 &&
        completed.text === null) ||
      (row.status === "completed" &&
        progress === 100 &&
        completed.text !== null);
    if (
      !invariantHolds ||
      (started.instant !== null &&
        completed.instant !== null &&
        completed.instant < started.instant)
    ) {
      return reject("invalid_database_result");
    }

    return {
      course_key: row.course_key,
      course_name: row.course_name,
      status: row.status,
      progress_percent: progress,
      started_at: started.text,
      completed_at: completed.text,
      source: {
        source_kind: "profile_course",
        ...validateSource(row),
      },
    };
  });

  return {
    release_id: release.release_id,
    profile: {
      profile_key: profileRow.profile_key,
      alias: profileRow.alias,
      source: {
        source_kind: "profile",
        ...profileSource,
      },
    },
    courses,
  };
}
