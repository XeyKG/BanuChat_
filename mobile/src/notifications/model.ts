import type { Announcement } from '@/api/announcements';
import type { CalendarEvent } from '@/api/calendar';

export type NotificationDestination = 'calendar' | 'announcements';

export interface BanuNotificationData {
  [key: string]: unknown;
  schema: 'banuchat-notification-1';
  destination: NotificationDestination;
  recipient_scope: string;
  dedupe_key: string;
  resource_key: string;
}

export interface ReminderCandidate {
  body: string;
  data: BanuNotificationData;
  fireAt: Date;
  title: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_MS = 60 * 1000;
const MAX_REMINDERS = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeKey(value: unknown): value is string {
  return typeof value === 'string' && SAFE_KEY_PATTERN.test(value);
}

export function parseNotificationData(value: unknown): BanuNotificationData | null {
  if (
    !isRecord(value) ||
    value.schema !== 'banuchat-notification-1' ||
    (value.destination !== 'calendar' && value.destination !== 'announcements') ||
    typeof value.recipient_scope !== 'string' ||
    !UUID_PATTERN.test(value.recipient_scope) ||
    !isSafeKey(value.dedupe_key) ||
    !isSafeKey(value.resource_key)
  ) {
    return null;
  }

  return {
    schema: value.schema,
    destination: value.destination,
    recipient_scope: value.recipient_scope,
    dedupe_key: value.dedupe_key,
    resource_key: value.resource_key,
  };
}

export function destinationForAccount(
  value: unknown,
  principalId: string,
  capabilities: readonly string[],
): NotificationDestination | null {
  const data = parseNotificationData(value);
  if (data === null || data.recipient_scope !== principalId) return null;
  if (data.destination === 'calendar' && !capabilities.includes('calendar')) return null;
  if (data.destination === 'announcements' && !capabilities.includes('announcements')) return null;
  return data.destination;
}

function candidateTime(timestamp: string, now: number): Date | null {
  const target = Date.parse(timestamp) - DAY_MS;
  return Number.isFinite(target) && target > now + MINIMUM_LEAD_MS ? new Date(target) : null;
}

export function buildReminderCandidates(input: {
  announcements: readonly Announcement[];
  calendarEvents: readonly CalendarEvent[];
  now: number;
  principalId: string;
  releaseId: string;
}): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];

  for (const event of input.calendarEvents) {
    const fireAt = candidateTime(event.starts_at, input.now);
    if (fireAt === null) continue;
    const dedupeKey = `calendar:${input.releaseId}:${event.event_key}:24h`;
    candidates.push({
      title: 'Recordatorio de calendario',
      body: event.title,
      fireAt,
      data: {
        schema: 'banuchat-notification-1',
        destination: 'calendar',
        recipient_scope: input.principalId,
        dedupe_key: dedupeKey,
        resource_key: event.event_key,
      },
    });
  }

  for (const announcement of input.announcements) {
    const fireAt = candidateTime(announcement.valid_from, input.now);
    if (fireAt === null) continue;
    const dedupeKey = `announcement:${input.releaseId}:${announcement.announcement_key}:24h`;
    candidates.push({
      title: 'Nuevo anuncio de demostración',
      body: announcement.title,
      fireAt,
      data: {
        schema: 'banuchat-notification-1',
        destination: 'announcements',
        recipient_scope: input.principalId,
        dedupe_key: dedupeKey,
        resource_key: announcement.announcement_key,
      },
    });
  }

  const unique = new Map<string, ReminderCandidate>();
  for (const candidate of candidates.sort((left, right) => left.fireAt.getTime() - right.fireAt.getTime())) {
    if (!unique.has(candidate.data.dedupe_key)) unique.set(candidate.data.dedupe_key, candidate);
  }
  return Array.from(unique.values()).slice(0, MAX_REMINDERS);
}
