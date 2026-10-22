import { isCcdLocal } from './demo-mode';

export function getApiBaseUrl(): string {
  const configuredValue = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configuredValue === undefined || configuredValue.trim().length === 0) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL');
  }
  if (configuredValue !== configuredValue.trim()) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL');
  }

  const normalizedValue = configuredValue.replace(/\/+$/, '');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL');
  }
  if (isCcdLocal() && (parsedUrl.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '10.0.2.2'].includes(parsedUrl.hostname) ||
    !['3001', '8083'].includes(parsedUrl.port) || parsedUrl.pathname !== '/api/v1' ||
    parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash)) {
    throw new Error('CCD_REQUIRES_LOCAL_API');
  }
  return normalizedValue;
}
