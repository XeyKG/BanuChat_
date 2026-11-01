import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';

export type AnnouncementStatus = 'active' | 'upcoming' | 'expired';
export type AnnouncementFilter = AnnouncementStatus | 'all';

export interface Announcement {
  announcement_key: string;
  title: string;
  description: string;
  valid_from: string;
  valid_until: string | null;
  temporal_status: AnnouncementStatus;
}

export interface AnnouncementsResponse {
  release_id: string;
  reference_time: string;
  announcements: Announcement[];
}

export interface AnnouncementsInput {
  temporalStatus: AnnouncementFilter;
  query?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDateTime(value: unknown): value is string {
  return isNonemptyString(value) && Number.isFinite(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isAnnouncementStatus(value: unknown): value is AnnouncementStatus {
  return value === 'active' || value === 'upcoming' || value === 'expired';
}

function parseAnnouncement(value: unknown): Announcement {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.announcement_key) ||
    !isNonemptyString(value.title) ||
    !isNonemptyString(value.description) ||
    !isDateTime(value.valid_from) ||
    !isNullableDateTime(value.valid_until) ||
    !isAnnouncementStatus(value.temporal_status)
  ) {
    throw new Error('ANNOUNCEMENTS_RESPONSE_INVALID');
  }

  return {
    announcement_key: value.announcement_key,
    title: value.title,
    description: value.description,
    valid_from: value.valid_from,
    valid_until: value.valid_until,
    temporal_status: value.temporal_status,
  };
}

function parseAnnouncementsResponse(value: unknown): AnnouncementsResponse {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.release_id) ||
    !isDateTime(value.reference_time) ||
    !Array.isArray(value.announcements)
  ) {
    throw new Error('ANNOUNCEMENTS_RESPONSE_INVALID');
  }

  return {
    release_id: value.release_id,
    reference_time: value.reference_time,
    announcements: value.announcements.map(parseAnnouncement),
  };
}

export async function getAnnouncements(
  input: AnnouncementsInput,
): Promise<AnnouncementsResponse> {
  const query = new URLSearchParams({ temporal_status: input.temporalStatus });
  if (input.query?.trim()) query.set('query', input.query.trim());
  const response = await fetch(`${getApiBaseUrl()}/announcements?${query.toString()}`, {
    method: 'GET',
  });
  if (response.status !== 200) {
    throw new Error('ANNOUNCEMENTS_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('ANNOUNCEMENTS_RESPONSE_INVALID');
  }

  return parseAnnouncementsResponse(payload);
}
