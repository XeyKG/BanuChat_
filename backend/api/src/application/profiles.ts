import type { SqlQueryClient } from "../data/sql-client.js";
import { resolveCurrentRelease } from "./current-release.js";
import { ProfilesError } from "./profiles-errors.js";

const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;

const LIST_PROFILES_QUERY = `
SELECT
  profile_key,
  alias
FROM banuchat.synthetic_profiles
WHERE dataset_release_id = $1
ORDER BY profile_key ASC
`;

export interface ProfileSummary {
  profile_key: string;
  alias: string;
}

export interface ProfilesResult {
  release_id: string;
  profiles: ProfileSummary[];
}

interface ProfileRow {
  profile_key: unknown;
  alias: unknown;
}

function isStableKey(value: unknown): value is string {
  return typeof value === "string" && STABLE_KEY_PATTERN.test(value);
}

function isNonblankString(value: unknown): value is string {
  return typeof value === "string" && /\S/u.test(value);
}

export async function listProfiles(
  client: SqlQueryClient,
): Promise<ProfilesResult> {
  const release = await resolveCurrentRelease(client);
  const result = await client.query<ProfileRow>(LIST_PROFILES_QUERY, [
    release.release_id,
  ]);

  const profiles = result.rows.map((row) => {
    if (!isStableKey(row.profile_key) || !isNonblankString(row.alias)) {
      throw new ProfilesError("invalid_database_result");
    }

    return {
      profile_key: row.profile_key,
      alias: row.alias,
    };
  });

  return {
    release_id: release.release_id,
    profiles,
  };
}
