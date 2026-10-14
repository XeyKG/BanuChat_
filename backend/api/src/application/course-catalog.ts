import type { SqlQueryClient } from "../data/sql-client.js";
import { CourseCatalogError } from "./course-catalog-errors.js";
import { resolveCurrentRelease } from "./current-release.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const COURSE_CATALOG_QUERY_BASE = `
SELECT
  course_key,
  name,
  description,
  status,
  source_path,
  source_locator,
  source_sha256
FROM banuchat.courses
WHERE dataset_release_id = $1
`;

export type CourseCatalogStatus = "available" | "closed" | "archived";

export interface CourseCatalogInput {
  statuses?: readonly CourseCatalogStatus[];
  limit?: number;
}

export interface CourseCatalogCourse {
  course_key: string;
  name: string;
  description: string;
  status: CourseCatalogStatus;
  source: {
    source_kind: "course";
    source_path: string;
    source_locator: string;
    source_sha256: string;
  };
}

export interface CourseCatalogResult {
  release_id: string;
  courses: CourseCatalogCourse[];
}

function reject(reason: CourseCatalogError["reason"]): never {
  throw new CourseCatalogError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStatus(value: unknown): value is CourseCatalogStatus {
  return value === "available" || value === "closed" || value === "archived";
}

function validateInput(input: CourseCatalogInput): {
  statuses: readonly CourseCatalogStatus[] | undefined;
  limit: number;
} {
  if (!isRecord(input)) return reject("invalid_argument");

  if (input.statuses !== undefined) {
    if (!Array.isArray(input.statuses) || input.statuses.length > 3) {
      return reject("invalid_argument");
    }
    const seen = new Set<CourseCatalogStatus>();
    for (const status of input.statuses) {
      if (!isStatus(status) || seen.has(status)) {
        return reject("invalid_argument");
      }
      seen.add(status);
    }
  }

  const limit = input.limit === undefined ? DEFAULT_LIMIT : input.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return reject("invalid_argument");
  }
  return { statuses: input.statuses, limit };
}

function normalizeRow(row: unknown): CourseCatalogCourse {
  if (
    !isRecord(row) ||
    typeof row.course_key !== "string" ||
    !STABLE_KEY_PATTERN.test(row.course_key) ||
    !isNonblank(row.name) ||
    !isNonblank(row.description) ||
    !isStatus(row.status) ||
    !isNonblank(row.source_path) ||
    !isNonblank(row.source_locator) ||
    typeof row.source_sha256 !== "string" ||
    !SHA256_PATTERN.test(row.source_sha256)
  ) {
    return reject("invalid_database_result");
  }
  return {
    course_key: row.course_key,
    name: row.name,
    description: row.description,
    status: row.status,
    source: {
      source_kind: "course",
      source_path: row.source_path,
      source_locator: row.source_locator,
      source_sha256: row.source_sha256,
    },
  };
}

export async function getCourseCatalog(
  client: SqlQueryClient,
  input: CourseCatalogInput,
): Promise<CourseCatalogResult> {
  const { statuses, limit } = validateInput(input);
  const release = await resolveCurrentRelease(client);
  const hasStatusFilter = statuses !== undefined;
  const query = hasStatusFilter
    ? `${COURSE_CATALOG_QUERY_BASE}  AND status = ANY($2::text[])\nORDER BY course_key ASC\nLIMIT $3\n`
    : `${COURSE_CATALOG_QUERY_BASE}ORDER BY course_key ASC\nLIMIT $2\n`;
  const values = hasStatusFilter
    ? [release.release_id, statuses, limit]
    : [release.release_id, limit];
  const result = await client.query<unknown>(query, values);

  return { release_id: release.release_id, courses: result.rows.map(normalizeRow) };
}
