import { isCcdLocal, mobileMode } from './demo-mode';

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
  if (!isCcdLocal()) {
    const local = ['127.0.0.1','localhost','10.0.2.2'].includes(parsedUrl.hostname);
    const cloud = mobileMode()==='synthetic' && parsedUrl.protocol==='https:' &&
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/u.test(parsedUrl.hostname) &&
      !parsedUrl.hostname.endsWith('.localhost');
    if(parsedUrl.pathname!=='/api/v2'||parsedUrl.username||parsedUrl.password||parsedUrl.search||parsedUrl.hash||!(local||cloud))throw new Error('AUTH_REQUIRES_PROTECTED_V2');
    if(parsedUrl.protocol==='http:'){
      const channel=process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL;
      if(!((channel==='adb_reverse'&&['127.0.0.1','localhost'].includes(parsedUrl.hostname))||(channel==='android_emulator'&&parsedUrl.hostname==='10.0.2.2')))throw new Error('AUTH_LOCAL_CHANNEL_REQUIRED');
    }
  }
  return normalizedValue;
}
