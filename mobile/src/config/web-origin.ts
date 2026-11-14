export const LOCAL_WEB_ORIGIN = 'http://127.0.0.1:8085';

export function webApiBaseUrl(origin: string, publicOrigin?: string): string {
  if (publicOrigin === undefined) {
    if (origin !== LOCAL_WEB_ORIGIN) throw new Error('WEB_REQUIRES_LOCAL_ORIGIN');
  } else if (origin !== publicOrigin || !/^https:\/\/[a-z0-9.-]+$/u.test(publicOrigin) ||
      !new URL(publicOrigin).hostname.includes('.') || new URL(publicOrigin).hostname.endsWith('.localhost')) {
    throw new Error('WEB_REQUIRES_PUBLIC_ORIGIN');
  }
  return origin + '/api/v2';
}
