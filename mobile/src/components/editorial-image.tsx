import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { resourceFetch } from '@/auth/runtime';
import { getApiBaseUrl } from '@/config/api';
import { radii } from '@/ui/tokens';

export function EditorialImage({ itemKey, label }: { itemKey: string; label: string }) {
  const id = /^editorial-image-(?:file-)?([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u.exec(itemKey)?.[1];
  return id ? <Cover key={id} id={id} label={label} /> : null;
}

function Cover({ id, label }: { id: string; label: string }) {
  const [uri, setUri] = useState<string>();
  useEffect(() => {
    const control = new AbortController();
    void (async () => {
      const response = await resourceFetch(`${getApiBaseUrl()}/editorial/images/${id}`, { signal: control.signal });
      if (!response.ok) return;
      const image = await response.json() as { mime: string; data: string };
      if (/^image\/(png|jpeg|webp)$/u.test(image.mime) && typeof image.data === 'string' && !control.signal.aborted) {
        setUri('data:' + image.mime + ';base64,' + image.data);
      }
    })().catch(() => {});
    return () => control.abort();
  }, [id]);
  return uri ? <Image accessibilityLabel={label} source={{ uri }} style={styles.cover} resizeMode="contain" /> : null;
}

const styles = StyleSheet.create({ cover: { width: '100%', height: 200, borderRadius: radii.sm } });
