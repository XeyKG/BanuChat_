import { useEffect, useState, type ReactNode } from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { resourceFetch } from '@/auth/runtime';
import { getApiBaseUrl } from '@/config/api';
import { radii } from '@/ui/tokens';

type ImageProps = {label:string;style?:StyleProp<ImageStyle>;fallback?:ReactNode;loadedUri?:string;onUri?:(uri:string)=>void};

export function EditorialImage({ itemKey, ...props }: ImageProps & {itemKey:string}) {
  const id = /^editorial-image-(?:file-)?([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u.exec(itemKey)?.[1];
  return id ? <Cover key={id} id={id} {...props} /> : props.fallback ?? null;
}

function Cover({ id, label, style, fallback, loadedUri, onUri }: ImageProps & {id:string}) {
  const [uri, setUri] = useState(loadedUri);
  useEffect(() => {
    if (loadedUri) return;
    const control = new AbortController();
    void (async () => {
      const response = await resourceFetch(`${getApiBaseUrl()}/editorial/images/${id}`, { signal: control.signal });
      if (!response.ok) return;
      const image = await response.json() as { mime: string; data: string };
      if (/^image\/(png|jpeg|webp)$/u.test(image.mime) && typeof image.data === 'string' && !control.signal.aborted) {
        const rendered = 'data:' + image.mime + ';base64,' + image.data;
        setUri(rendered);
        onUri?.(rendered);
      }
    })().catch(() => {});
    return () => control.abort();
  }, [id,loadedUri,onUri]);
  return uri ? <Image accessibilityLabel={label} source={{ uri }} style={[styles.cover,style]} resizeMode="contain" /> : fallback ?? null;
}

const styles = StyleSheet.create({ cover: { width: '100%', height: 200, borderRadius: radii.sm } });
