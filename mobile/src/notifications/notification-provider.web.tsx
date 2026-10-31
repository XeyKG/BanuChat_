import type {ReactNode} from 'react';

const unavailable = async () => { throw new Error('NATIVE_NOTIFICATIONS_UNAVAILABLE_ON_WEB'); };
const value = {
  busy: false, enabled: false, error: false, lastReceivedAt: null,
  permission: 'unavailable' as const, remoteState: 'platform_unavailable' as const,
  scheduledCount: 0, disable: unavailable, enable: unavailable,
  refresh: async () => {}, sendLocalTest: unavailable,
};

/** No Expo notifications, device permissions or native storage are loaded on web. */
export function NotificationProvider({children}: {children: ReactNode}) { return children; }
export function useNotifications() { return value; }
