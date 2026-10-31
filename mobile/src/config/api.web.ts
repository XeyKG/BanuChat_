import {LOCAL_WEB_ORIGIN, webApiBaseUrl} from './web-origin';

export function getApiBaseUrl(): string {
  // Static rendering has no session and performs no authenticated requests.
  return webApiBaseUrl(typeof window === 'undefined' ? LOCAL_WEB_ORIGIN : window.location.origin);
}
