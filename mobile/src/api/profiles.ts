import { getApiBaseUrl } from '@/config/api';
import { isCcdLocal } from '@/config/demo-mode';

export interface ProfileSummary {
  profile_key: string;
  alias: string;
}

export interface ProfilesResponse {
  release_id: string;
  profiles: ProfileSummary[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseProfilesResponse(value: unknown): ProfilesResponse {
  if (
    !isRecord(value) ||
    typeof value.release_id !== 'string' ||
    !Array.isArray(value.profiles)
  ) {
    throw new Error('PROFILES_RESPONSE_INVALID');
  }

  const profiles = value.profiles.map((profile: unknown): ProfileSummary => {
    if (
      !isRecord(profile) ||
      typeof profile.profile_key !== 'string' ||
      typeof profile.alias !== 'string'
    ) {
      throw new Error('PROFILES_RESPONSE_INVALID');
    }

    return { profile_key: profile.profile_key, alias: profile.alias };
  });

  return { release_id: value.release_id, profiles };
}

export async function getProfiles(): Promise<ProfilesResponse> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/profiles`, { method: 'GET' });
  } catch {
    throw new Error('PROFILES_REQUEST_FAILED');
  }

  if (!response.ok) {
    throw new Error('PROFILES_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('PROFILES_RESPONSE_INVALID');
  }

  const result = parseProfilesResponse(payload);
  const ccd = result.profiles.filter(profile => profile.profile_key === 'ccd-local-demo');
  if (isCcdLocal() ? ccd.length !== 1 || result.profiles.length !== 1 : ccd.length > 0) {
    throw new Error('DEMO_MODE_MISMATCH');
  }
  return result;
}
