import {LOCAL_WEB_ORIGIN, webApiBaseUrl} from './web-origin';
import {mobileMode} from './demo-mode';

export function getApiBaseUrl(): string {
  // Static rendering has no session and performs no authenticated requests.
  const publicOrigin = mobileMode()==='synthetic' ? process.env.EXPO_PUBLIC_WEB_ORIGIN : undefined;
  return webApiBaseUrl(typeof window === 'undefined' ? publicOrigin ?? LOCAL_WEB_ORIGIN : window.location.origin, publicOrigin);
}
