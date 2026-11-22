import {useState} from 'react';
import {Directory} from 'expo-file-system';
import {Text,View} from 'react-native';
import {resourceFetch} from '@/auth/runtime';
import {AppButton} from '@/components/app-button';
import {getApiBaseUrl} from '@/config/api';
import {colors} from '@/ui/tokens';

export function EditorialAttachment({announcementKey}:{announcementKey:string}) {
  const id = /^editorial-(?:image-)?file-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u.exec(announcementKey)?.[1];
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState<'saved'|'error'>();
  if (!id) return null;

  async function save() {
    setBusy(true);
    setStatus(undefined);
    try {
      const directory = await Directory.pickDirectoryAsync().catch(()=>null);
      if (!directory) return;
      const response = await resourceFetch(`${getApiBaseUrl()}/editorial/attachments/${id}`);
      if (!response.ok) throw Error('Attachment unavailable');
      const encoded = response.headers.get('Content-Disposition')?.split("filename*=UTF-8''")[1];
      const name = encoded ? decodeURIComponent(encoded).split(/[\\/]/u).at(-1) : undefined;
      if (!name || !/\.(pdf|md)$/iu.test(name)) throw Error('Invalid attachment name');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.byteLength || bytes.byteLength>2*1024*1024) throw Error('Invalid attachment size');
      const file = directory.createFile(name,/\.pdf$/iu.test(name)?'application/pdf':'text/markdown');
      file.write(bytes);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  return <View>
    <AppButton label="Guardar adjunto" onPress={()=>void save()} loading={busy} variant="secondary" tone="banu"/>
    {status==='saved' && <Text accessibilityLiveRegion="polite">Adjunto guardado.</Text>}
    {status==='error' && <Text accessibilityRole="alert" style={{color:colors.error}}>No se pudo guardar el adjunto. Vuelve a intentarlo.</Text>}
  </View>;
}
