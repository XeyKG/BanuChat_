import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';

export type CalendarEventType = 'course_session' | 'announcement_deadline' | 'general';

export interface CalendarEvent {
  event_key: string;
  title: string;
  description: string;
  event_type: CalendarEventType;
  starts_at: string;
  ends_at: string | null;
  course_key: string | null;
  announcement_key: string | null;
}

export interface CalendarResponse {
  release_id: string;
  events: CalendarEvent[];
}

export interface CalendarEventsInput {
  dateFrom: string;
  dateTo: string;
  eventTypes?: CalendarEventType[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonemptyString(value);
}

function isDateTime(value: unknown): value is string {
  return isNonemptyString(value) && Number.isFinite(Date.parse(value));
}

function isEventType(value: unknown): value is CalendarEventType {
  return value === 'course_session' || value === 'announcement_deadline' || value === 'general';
}

function parseCalendarEvent(value: unknown): CalendarEvent {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.event_key) ||
    !isNonemptyString(value.title) ||
    !isNonemptyString(value.description) ||
    !isEventType(value.event_type) ||
    !isDateTime(value.starts_at) ||
    (value.ends_at !== null && !isDateTime(value.ends_at)) ||
    !isNullableString(value.course_key) ||
    !isNullableString(value.announcement_key)
  ) {
    throw new Error('CALENDAR_RESPONSE_INVALID');
  }

  if (
    (value.event_type === 'course_session' &&
      (value.course_key === null || value.announcement_key !== null)) ||
    (value.event_type === 'announcement_deadline' &&
      (value.announcement_key === null || value.course_key !== null)) ||
    (value.event_type === 'general' &&
      (value.course_key !== null || value.announcement_key !== null))
  ) {
    throw new Error('CALENDAR_RESPONSE_INVALID');
  }

  return {
    event_key: value.event_key,
    title: value.title,
    description: value.description,
    event_type: value.event_type,
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    course_key: value.course_key,
    announcement_key: value.announcement_key,
  };
}

function parseCalendarResponse(value: unknown): CalendarResponse {
  if (!isRecord(value) || !isNonemptyString(value.release_id) || !Array.isArray(value.events)) {
    throw new Error('CALENDAR_RESPONSE_INVALID');
  }

  return {
    release_id: value.release_id,
    events: value.events.map(parseCalendarEvent),
  };
}

export async function getCalendarEvents(input: CalendarEventsInput): Promise<CalendarResponse> {
  const query = new URLSearchParams({ date_from: input.dateFrom, date_to: input.dateTo });
  input.eventTypes?.forEach((eventType) => query.append('event_types', eventType));

  const response = await fetch(`${getApiBaseUrl()}/calendar/events?${query.toString()}`, {
    method: 'GET',
  });
  if (response.status !== 200) {
    throw new Error('CALENDAR_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('CALENDAR_RESPONSE_INVALID');
  }

  return parseCalendarResponse(payload);
}
