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
  return normalizedValue;
}
