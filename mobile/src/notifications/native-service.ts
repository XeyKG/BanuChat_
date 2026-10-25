import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getAnnouncements, type Announcement } from '@/api/announcements';
import { getCalendarEvents, type CalendarEvent } from '@/api/calendar';
import { addCivilDays, getBogotaCivilToday } from '@/utils/bogota-date';
import {
  buildReminderCandidates,
  type BanuNotificationData,
  type ReminderCandidate,
} from './model';

export type NotificationPermissionState =
  | 'checking'
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'unavailable';

export type RemotePushState =
  | 'expo_go'
  | 'simulator'
  | 'project_unconfigured'
  | 'backend_unavailable'
  | 'platform_unavailable';

export interface NotificationPreference {
  enabled: boolean;
  scheduled: ScheduledNotification[];
}

interface ScheduledNotification {
  dedupeKey: string;
  identifier: string;
  kind: 'reminder' | 'test';
}

const CHANNEL_ID = 'banuchat-reminders';
const KEYCHAIN_SERVICE = 'banuchat.notifications.v1';
const EMPTY_PREFERENCE: NotificationPreference = { enabled: false, scheduled: [] };

function preferenceKey(principalId: string): string {
  return `banuchat.notifications.v1.${principalId}`;
}

function isScheduledNotification(value: unknown): value is ScheduledNotification {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ScheduledNotification>;
  return (
    typeof candidate.dedupeKey === 'string' &&
    typeof candidate.identifier === 'string' &&
    (candidate.kind === 'reminder' || candidate.kind === 'test')
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios BanuChat',
    description: 'Eventos y anuncios completamente sintéticos de la demostración.',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: null,
    vibrationPattern: [0, 180],
  });
}

export function configureForegroundNotifications(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) return 'granted';
    return permission.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    await ensureAndroidChannel();
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (permission.granted) return 'granted';
    return permission.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export function getRemotePushState(): RemotePushState {
  if (Platform.OS === 'web') return 'platform_unavailable';
  if (!Device.isDevice) return 'simulator';
  if (Constants.expoVersion !== null) return 'expo_go';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string' || projectId.length === 0) return 'project_unconfigured';
  return 'backend_unavailable';
}

export async function loadNotificationPreference(
  principalId: string,
): Promise<NotificationPreference> {
  if (Platform.OS === 'web') return EMPTY_PREFERENCE;
  try {
    const raw = await SecureStore.getItemAsync(preferenceKey(principalId), {
      keychainService: KEYCHAIN_SERVICE,
    });
    if (raw === null) return EMPTY_PREFERENCE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_PREFERENCE;
    const candidate = parsed as Partial<NotificationPreference>;
    if (typeof candidate.enabled !== 'boolean' || !Array.isArray(candidate.scheduled)) {
      return EMPTY_PREFERENCE;
    }
    return {
      enabled: candidate.enabled,
      scheduled: candidate.scheduled.filter(isScheduledNotification),
    };
  } catch {
    return EMPTY_PREFERENCE;
  }
}

async function saveNotificationPreference(
  principalId: string,
  preference: NotificationPreference,
): Promise<void> {
  await SecureStore.setItemAsync(preferenceKey(principalId), JSON.stringify(preference), {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function cancelRecords(records: readonly ScheduledNotification[]): Promise<void> {
  await Promise.allSettled(
    records.map((record) => Notifications.cancelScheduledNotificationAsync(record.identifier)),
  );
}

function triggerFor(candidate: ReminderCandidate): Notifications.DateTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: candidate.fireAt,
    channelId: CHANNEL_ID,
  };
}

async function scheduleCandidate(
  candidate: ReminderCandidate,
  kind: ScheduledNotification['kind'],
): Promise<ScheduledNotification> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: candidate.title,
      body: candidate.body,
      data: candidate.data,
      sound: false,
    },
    trigger: triggerFor(candidate),
  });
  return { dedupeKey: candidate.data.dedupe_key, identifier, kind };
}

export async function syncSyntheticReminders(input: {
  principalId: string;
  releaseId: string;
}): Promise<NotificationPreference> {
  await ensureAndroidChannel();
  const previous = await loadNotificationPreference(input.principalId);
  const dateFrom = getBogotaCivilToday();
  const [calendar, announcements] = await Promise.all([
    getCalendarEvents({ dateFrom, dateTo: addCivilDays(dateFrom, 29) }),
    getAnnouncements({ temporalStatus: 'upcoming' }),
  ]);
  if (
    calendar.release_id !== input.releaseId ||
    announcements.release_id !== input.releaseId
  ) {
    throw new Error('NOTIFICATION_RELEASE_MISMATCH');
  }
  const candidates = buildReminderCandidates({
    announcements: announcements.announcements,
    calendarEvents: calendar.events,
    now: Date.now(),
    principalId: input.principalId,
    releaseId: input.releaseId,
  });

  await cancelRecords(previous.scheduled.filter((record) => record.kind === 'reminder'));
  const tests = previous.scheduled.filter((record) => record.kind === 'test');
  const reminders: ScheduledNotification[] = [];
  try {
    for (const candidate of candidates) reminders.push(await scheduleCandidate(candidate, 'reminder'));
  } catch (error) {
    await cancelRecords(reminders);
    throw error;
  }

  const preference = { enabled: true, scheduled: [...tests, ...reminders] };
  await saveNotificationPreference(input.principalId, preference);
  return preference;
}

function testData(
  principalId: string,
  calendarEvents: readonly CalendarEvent[],
  announcements: readonly Announcement[],
): { body: string; data: BanuNotificationData; destination: 'calendar' | 'announcements' } {
  const event = calendarEvents[0];
  if (event !== undefined) {
    const dedupeKey = `test:calendar:${event.event_key}`;
    return {
      body: event.title,
      destination: 'calendar',
      data: {
        schema: 'banuchat-notification-1',
        destination: 'calendar',
        recipient_scope: principalId,
        dedupe_key: dedupeKey,
        resource_key: event.event_key,
      },
    };
  }
  const announcement = announcements[0];
  const resourceKey = announcement?.announcement_key ?? 'synthetic-demo';
  const dedupeKey = `test:announcement:${resourceKey}`;
  return {
    body: announcement?.title ?? 'BanuChat puede abrir los anuncios desde este recordatorio local.',
    destination: 'announcements',
    data: {
      schema: 'banuchat-notification-1',
      destination: 'announcements',
      recipient_scope: principalId,
      dedupe_key: dedupeKey,
      resource_key: resourceKey,
    },
  };
}

export async function scheduleSyntheticTest(principalId: string): Promise<NotificationPreference> {
  await ensureAndroidChannel();
  const dateFrom = getBogotaCivilToday();
  const [calendar, announcements] = await Promise.all([
    getCalendarEvents({ dateFrom, dateTo: addCivilDays(dateFrom, 29) }),
    getAnnouncements({ temporalStatus: 'all' }),
  ]);
  const sample = testData(principalId, calendar.events, announcements.announcements);
  const previous = await loadNotificationPreference(principalId);
  const oldTests = previous.scheduled.filter((record) => record.kind === 'test');
  await cancelRecords(oldTests);
  const candidate: ReminderCandidate = {
    title: sample.destination === 'calendar' ? 'Prueba local de calendario' : 'Prueba local de anuncios',
    body: sample.body,
    data: sample.data,
    fireAt: new Date(Date.now() + 5_000),
  };
  const test = await scheduleCandidate(candidate, 'test');
  const preference = {
    enabled: true,
    scheduled: [...previous.scheduled.filter((record) => record.kind !== 'test'), test],
  };
  await saveNotificationPreference(principalId, preference);
  return preference;
}

export async function disableNotificationsForAccount(principalId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const preference = await loadNotificationPreference(principalId);
  await cancelRecords(preference.scheduled);
  await SecureStore.deleteItemAsync(preferenceKey(principalId), {
    keychainService: KEYCHAIN_SERVICE,
  });
}

export function reminderCount(preference: NotificationPreference): number {
  return preference.scheduled.filter((record) => record.kind === 'reminder').length;
}
