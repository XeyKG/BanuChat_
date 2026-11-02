import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DocumentRequestError,
  getDocumentArtifact,
  isDocumentVersionId,
} from '@/api/documents';
import { AppButton } from '@/components/app-button';
import { isCcdKnowledge } from '@/config/demo-mode';
import { ScreenHeader } from '@/components/screen-header';
import {ContentColumn,ScreenState,SourceMeta,SurfaceCard,secondaryStyles} from '@/components/secondary-ui';
import { colors, radii, spacing, typography } from '@/ui/tokens';

type LoadState = 'loading' | 'error' | 'success';

function singleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function displayTitle(value: string | undefined): string {
  if (value === undefined) return 'Documento';
  const title = value.trim();
  return title.length > 0 && Array.from(title).length <= 120 ? title : 'Documento';
}

function errorMessage(kind: DocumentRequestError['kind'] | null): string {
  if (kind === 'not_found') {
    return isCcdKnowledge() ? 'El documento no está disponible en esta revisión CCD.' : 'El documento ya no está disponible en esta revisión sintética.';
  }
  if (kind === 'too_large') {
    return 'El documento supera el tamaño permitido por el visor.';
  }
  if (kind === 'empty') {
    return 'El documento recibido está vacío.';
  }
  if (kind === 'timeout') {
    return 'La descarga tardó demasiado. Comprueba la conexión e inténtalo de nuevo.';
  }
  return 'No fue posible cargar el documento. Comprueba la conexión e inténtalo de nuevo.';
}

export default function DocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ document_version_id?: string; title?: string }>();
  const documentVersionId = singleParam(params.document_version_id);
  const title = useMemo(() => displayTitle(singleParam(params.title)), [params.title]);
  const isValidId = isDocumentVersionId(documentVersionId);
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [content, setContent] = useState('');
  const [errorKind, setErrorKind] = useState<DocumentRequestError['kind'] | null>(
    null,
  );
  const [completedRequestKey, setCompletedRequestKey] = useState<string | null>(null);
  const requestKey = isValidId ? `${documentVersionId}:${retryCount}` : null;
  const visibleLoadState = completedRequestKey === requestKey ? loadState : 'loading';

  useEffect(() => {
    if (!isValidId) return;
    let isMounted = true;

    void getDocumentArtifact(documentVersionId)
      .then((documentContent) => {
        if (!isMounted) return;
        setContent(documentContent);
        setErrorKind(null);
        setLoadState('success');
        setCompletedRequestKey(`${documentVersionId}:${retryCount}`);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setErrorKind(error instanceof DocumentRequestError ? error.kind : 'network');
        setLoadState('error');
        setCompletedRequestKey(`${documentVersionId}:${retryCount}`);
      });

    return () => {
      isMounted = false;
    };
  }, [documentVersionId, isValidId, retryCount]);

  return (
    <SafeAreaView testID="secondary-screen" style={styles.safeArea}>
      <ScreenHeader
        actionLabel="Volver"
        onAction={() => router.back()}
        subtitle="Fuente documental CCD"
        title={title}
      />

      {!isValidId ? (
        <View style={secondaryStyles.scroll}><ContentColumn reading><ScreenState kind="error" title="Referencia de documento inválida" body="Vuelve al chat y selecciona una fuente documental válida."/></ContentColumn></View>
      ) : visibleLoadState === 'loading' ? (
        <View style={secondaryStyles.scroll}><ContentColumn reading><ScreenState kind="loading" title="Cargando documento..."/></ContentColumn></View>
      ) : visibleLoadState === 'error' ? (
        <View style={secondaryStyles.scroll}><ContentColumn reading><ScreenState kind="error" title="No fue posible abrir el documento" body={errorMessage(errorKind)}>
          <AppButton tone="banu"
            label="Reintentar"
            onPress={() => setRetryCount((current) => current + 1)}
          />
        </ScreenState></ContentColumn></View>
      ) : (
        <ScrollView contentContainerStyle={secondaryStyles.scroll}><ContentColumn reading>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Revisa la fecha, el periodo y el alcance indicados en la fuente.</Text>
          </View>
          <SourceMeta>Versión del documento: {documentVersionId}</SourceMeta>
          <SurfaceCard testID="document-card" style={{boxShadow:'none'}}>
            <Text selectable testID="document-text" style={styles.documentText}>
              {content}
            </Text>
          </SurfaceCard>
        </ContentColumn></ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
notice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.banuSoft,
  },
noticeText: {
    color: colors.banuMagentaStrong,
    fontSize: typography.small,
    fontWeight: '700',
    textAlign: 'center',
  },
documentText: {
    color: colors.banuInk,
    fontSize: typography.body,
    lineHeight: 25,
  }
});
