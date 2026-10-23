import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';
import {isCcdLocal} from '@/config/demo-mode';

export type ProgressStatus = 'enrolled' | 'in_progress' | 'completed';

export interface CourseProgress {
  course_key: string;
  course_name: string;
  status: ProgressStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface ProgressProfile {
  profile_key: string;
  alias: string;
}

export interface ProfileProgressResponse {
  release_id: string;
  profile: ProgressProfile;
  courses: CourseProgress[];
}

export interface ProfileProgressInput {
  profileKey: string;
  statuses?: ProgressStatus[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || (isNonemptyString(value) && Number.isFinite(Date.parse(value)));
}

function isProgressStatus(value: unknown): value is ProgressStatus {
  return value === 'enrolled' || value === 'in_progress' || value === 'completed';
}

function parseCourseProgress(value: unknown): CourseProgress {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.course_key) ||
    !isNonemptyString(value.course_name) ||
    !isProgressStatus(value.status) ||
    typeof value.progress_percent !== 'number' ||
    !Number.isFinite(value.progress_percent) ||
    value.progress_percent < 0 ||
    value.progress_percent > 100 ||
    !isNullableDateTime(value.started_at) ||
    !isNullableDateTime(value.completed_at)
  ) {
    throw new Error('PROGRESS_RESPONSE_INVALID');
  }

  if (
    (value.status === 'enrolled' &&
      (value.progress_percent !== 0 || value.completed_at !== null)) ||
    (value.status === 'in_progress' &&
      (value.progress_percent <= 0 ||
        value.progress_percent >= 100 ||
        value.completed_at !== null)) ||
    (value.status === 'completed' &&
      (value.progress_percent !== 100 || value.completed_at === null)) ||
    (value.started_at !== null &&
      value.completed_at !== null &&
      Date.parse(value.completed_at) < Date.parse(value.started_at))
  ) {
    throw new Error('PROGRESS_RESPONSE_INVALID');
  }

  return {
    course_key: value.course_key,
    course_name: value.course_name,
    status: value.status,
    progress_percent: value.progress_percent,
    started_at: value.started_at,
    completed_at: value.completed_at,
  };
}

function parseProgressResponse(value: unknown, profileKey: string): ProfileProgressResponse {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.release_id) ||
    !isRecord(value.profile) ||
    !isNonemptyString(value.profile.profile_key) ||
    value.profile.profile_key !== profileKey ||
    !isNonemptyString(value.profile.alias) ||
    !Array.isArray(value.courses)
  ) {
    throw new Error('PROGRESS_RESPONSE_INVALID');
  }

  return {
    release_id: value.release_id,
    profile: { profile_key: value.profile.profile_key, alias: value.profile.alias },
    courses: value.courses.map(parseCourseProgress),
  };
}

export async function getProfileProgress(
  input: ProfileProgressInput,
): Promise<ProfileProgressResponse> {
  const query = new URLSearchParams();
  input.statuses?.forEach((status) => query.append('statuses', status));
  const suffix = query.toString();
  const path=isCcdLocal()?`/profiles/${encodeURIComponent(input.profileKey)}/progress`:'/me/progress';
  const url = `${getApiBaseUrl()}${path}${suffix ? `?${suffix}` : ''}`;

  const response = await fetch(url, { method: 'GET' });
  if (response.status !== 200) {
    throw new Error('PROGRESS_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('PROGRESS_RESPONSE_INVALID');
  }

  return parseProgressResponse(payload, input.profileKey);
}
