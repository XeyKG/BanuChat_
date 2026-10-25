import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { destinationForAccount, parseNotificationData } from './model';
import {
  configureForegroundNotifications,
  disableNotificationsForAccount,
  getNotificationPermission,
  getRemotePushState,
  loadNotificationPreference,
  reminderCount,
  requestNotificationPermission,
  scheduleSyntheticTest,
  syncSyntheticReminders,
  type NotificationPermissionState,
  type RemotePushState,
} from './native-service';

interface NotificationContextValue {
  busy: boolean;
  enabled: boolean;
  error: boolean;
  lastReceivedAt: number | null;
  permission: NotificationPermissionState;
  remoteState: RemotePushState;
  scheduledCount: number;
  disable: () => Promise<void>;
  enable: () => Promise<void>;
  refresh: () => Promise<void>;
  sendLocalTest: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
configureForegroundNotifications();

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { snapshot } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('checking');
  const [enabled, setEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const previousPrincipalRef = useRef<string | null>(null);
  const currentPrincipalRef = useRef<string | null>(null);
  const handledResponsesRef = useRef(new Set<string>());
  const handledDedupeKeysRef = useRef(new Set<string>());
  const me = snapshot.phase === 'authenticated' ? snapshot.me : null;
  const principalId = me?.principal_id ?? null;
  const eligible =
    principalId !== null &&
    me?.capabilities.includes('calendar') === true &&
    me.capabilities.includes('announcements');

  useEffect(() => {
    currentPrincipalRef.current = principalId;
  }, [principalId]);

  const readCurrentState = useCallback(async () => {
    const currentPermission = await getNotificationPermission();
    if (!eligible || principalId === null) {
      return { currentPermission, currentEnabled: false, currentScheduledCount: 0 };
    }
    const preference = await loadNotificationPreference(principalId);
    return {
      currentPermission,
      currentEnabled: preference.enabled && currentPermission === 'granted',
      currentScheduledCount: reminderCount(preference),
    };
  }, [eligible, principalId]);

  const applyCurrentState = useCallback(
    (state: Awaited<ReturnType<typeof readCurrentState>>) => {
      setPermission(state.currentPermission);
      setEnabled(state.currentEnabled);
      setScheduledCount(state.currentScheduledCount);
    },
    [],
  );

  const refresh = useCallback(async () => {
    applyCurrentState(await readCurrentState());
  }, [applyCurrentState, readCurrentState]);

  useEffect(() => {
    let active = true;
    void readCurrentState().then((state) => {
      if (active) applyCurrentState(state);
    });
    return () => {
      active = false;
    };
  }, [applyCurrentState, readCurrentState]);

  useEffect(() => {
    const previousPrincipal = previousPrincipalRef.current;
    if (previousPrincipal !== null && previousPrincipal !== principalId) {
      void disableNotificationsForAccount(previousPrincipal);
    }
    previousPrincipalRef.current = principalId;
  }, [principalId]);

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (!eligible || me === null || principalId === null) return;
      const identifier = response.notification.request.identifier;
      const data = parseNotificationData(response.notification.request.content.data);
      if (
        handledResponsesRef.current.has(identifier) ||
        (data !== null && handledDedupeKeysRef.current.has(data.dedupe_key))
      ) {
        return;
      }
      const destination = destinationForAccount(
        response.notification.request.content.data,
        principalId,
        me.capabilities,
      );
      if (destination === null) return;
      handledResponsesRef.current.add(identifier);
      if (data !== null) handledDedupeKeysRef.current.add(data.dedupe_key);
      if (handledResponsesRef.current.size > 64) handledResponsesRef.current.clear();
      if (handledDedupeKeysRef.current.size > 64) handledDedupeKeysRef.current.clear();
      Notifications.clearLastNotificationResponse();
      router.push(destination === 'calendar' ? '/calendar' : '/announcements');
    },
    [eligible, me, principalId, router],
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const received = Notifications.addNotificationReceivedListener(() => {
      setLastReceivedAt(Date.now());
    });
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const token =
      getRemotePushState() === 'backend_unavailable'
        ? Notifications.addPushTokenListener(() => {
            // No backend registration contract exists yet. A rotated token must be registered
            // there before remote delivery can be considered active; never persist/display it.
            setError(true);
          })
        : null;
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse !== null) handleResponse(initialResponse);
    return () => {
      received.remove();
      response.remove();
      token?.remove();
    };
  }, [handleResponse]);

  const enable = useCallback(async () => {
    if (!eligible || principalId === null || me === null || busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== 'granted') {
        setEnabled(false);
        return;
      }
      const preference = await syncSyntheticReminders({
        principalId,
        releaseId: me.release_id,
      });
      if (currentPrincipalRef.current !== principalId) {
        await disableNotificationsForAccount(principalId);
        return;
      }
      setEnabled(true);
      setScheduledCount(reminderCount(preference));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [busy, eligible, me, principalId]);

  const disable = useCallback(async () => {
    if (principalId === null || busy) return;
    setBusy(true);
    setError(false);
    try {
      await disableNotificationsForAccount(principalId);
      setEnabled(false);
      setScheduledCount(0);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [busy, principalId]);

  const sendLocalTest = useCallback(async () => {
    if (!eligible || principalId === null || busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== 'granted') return;
      const preference = await scheduleSyntheticTest(principalId);
      if (currentPrincipalRef.current !== principalId) {
        await disableNotificationsForAccount(principalId);
        return;
      }
      setEnabled(true);
      setScheduledCount(reminderCount(preference));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [busy, eligible, principalId]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      busy,
      enabled,
      error,
      lastReceivedAt,
      permission,
      remoteState: getRemotePushState(),
      scheduledCount,
      disable,
      enable,
      refresh,
      sendLocalTest,
    }),
    [busy, disable, enable, enabled, error, lastReceivedAt, permission, refresh, scheduledCount, sendLocalTest],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (value === null) throw new Error('NOTIFICATION_PROVIDER_REQUIRED');
  return value;
}
