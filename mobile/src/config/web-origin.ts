export const LOCAL_WEB_ORIGIN = 'http://127.0.0.1:8085';

export function webApiBaseUrl(origin: string): string {
  if (origin !== LOCAL_WEB_ORIGIN) throw new Error('WEB_REQUIRES_LOCAL_ORIGIN');
  return origin + '/api/v2';
}
