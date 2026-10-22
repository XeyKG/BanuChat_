import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DocumentRequestError,
  getDocumentArtifact,
  isDocumentVersionId,
} from '@/api/documents';
import { AppButton } from '@/components/app-button';
import { isCcdLocal } from '@/config/demo-mode';
import { ScreenHeader } from '@/components/screen-header';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

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
    return isCcdLocal() ? 'El documento no está disponible en esta revisión CCD.' : 'El documento ya no está disponible en esta revisión sintética.';
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
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        actionLabel="Volver"
        onAction={() => router.back()}
        subtitle={isCcdLocal() ? 'Documento CCD seleccionado · demostración local' : 'Documento sintético de demostración'}
        title={title}
      />

      {!isValidId ? (
        <View accessibilityRole="alert" style={styles.stateCard}>
          <Text style={styles.stateTitle}>Referencia de documento inválida</Text>
          <Text style={styles.stateText}>
            Vuelve al chat y selecciona una fuente documental válida.
          </Text>
        </View>
      ) : visibleLoadState === 'loading' ? (
        <View accessibilityLiveRegion="polite" style={styles.stateCard}>
          <ActivityIndicator
            accessibilityLabel="Cargando documento"
            color={colors.accent}
            size="large"
          />
          <Text style={styles.stateText}>Cargando documento...</Text>
        </View>
      ) : visibleLoadState === 'error' ? (
        <View accessibilityRole="alert" style={[styles.stateCard, styles.errorCard]}>
          <Text style={styles.stateTitle}>No fue posible abrir el documento</Text>
          <Text style={styles.stateText}>{errorMessage(errorKind)}</Text>
          <AppButton
            label="Reintentar"
            onPress={() => setRetryCount((current) => current + 1)}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{isCcdLocal() ? 'Documento CCD seleccionado. Revisa su periodo, población y límites; sin aval institucional formal.' : 'Documento sintético de demostración'}</Text>
          </View>
          <View style={styles.documentCard}>
            <Text selectable style={styles.documentText}>
              {content}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  stateCard: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  stateTitle: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: { minWidth: 144 },
  scrollContent: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  notice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  noticeText: {
    color: colors.accentStrong,
    fontSize: typography.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  documentCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  documentText: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 25,
  },
});
