import type { SqlQueryClient } from "../data/sql-client.js";
import { CurrentReleaseError } from "./current-release-errors.js";

const DATASET_ID = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CURRENT_RELEASE_QUERY = `
SELECT
  dr.id AS release_id,
  dr.embedding_config_id
FROM banuchat.datasets d
JOIN banuchat.dataset_releases dr
  ON dr.id = d.current_release_id
 AND dr.dataset_id = d.id
WHERE d.id = $1
  AND dr.status = 'ready'
`;

export interface CurrentReleaseContext {
  release_id: string;
  embedding_config_id: string;
}

interface CurrentReleaseRow {
  release_id: unknown;
  embedding_config_id: unknown;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function resolveCurrentRelease(
  client: SqlQueryClient,
): Promise<CurrentReleaseContext> {
  const result = await client.query<CurrentReleaseRow>(CURRENT_RELEASE_QUERY, [
    DATASET_ID,
  ]);

  if (result.rows.length === 0) {
    throw new CurrentReleaseError("no_current_release");
  }

  if (result.rows.length !== 1) {
    throw new CurrentReleaseError("invalid_database_result");
  }

  const row = result.rows[0];
  if (
    row === undefined ||
    !isUuid(row.release_id) ||
    !isUuid(row.embedding_config_id)
  ) {
    throw new CurrentReleaseError("invalid_database_result");
  }

  return {
    release_id: row.release_id,
    embedding_config_id: row.embedding_config_id,
  };
}
