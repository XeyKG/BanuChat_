import { useState } from 'react';
import { Text, View } from 'react-native';
import { resourceFetch } from '@/auth/runtime';
import { AppButton } from '@/components/app-button';
import { getApiBaseUrl } from '@/config/api';
import { colors } from '@/ui/tokens';

export function EditorialAttachment({ announcementKey }: { announcementKey: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const id = /^editorial-file-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u.exec(announcementKey)?.[1];
  if (!id) return null;

  async function download() {
    setBusy(true);
    setError(false);
    try {
      const response = await resourceFetch(`${getApiBaseUrl()}/editorial/attachments/${id}`);
      if (!response.ok) throw new Error('Adjunto no disponible');
      const fileName = response.headers.get('Content-Disposition')?.split("filename*=UTF-8''")[1];
      const link = document.createElement('a');
      link.download = fileName ? decodeURIComponent(fileName) : 'archivo-ccd';
      const url = URL.createObjectURL(await response.blob());
      try {
        link.href = url;
        link.click();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <View>
    <AppButton label="Descargar adjunto" onPress={() => void download()} loading={busy} variant="secondary" tone="banu" />
    {error && <Text accessibilityRole="alert" style={{ color: colors.error }}>No se pudo descargar el adjunto. Vuelve a intentarlo.</Text>}
  </View>;
}
