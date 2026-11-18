import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Citation, CitationSourceKind } from '@/api/messages';
import { isCcdLocal } from '@/config/demo-mode';
import { DocGlyph } from '@/ui/icons';
import { FadeIn } from '@/ui/animated';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

const LABEL_PREFIXES: Record<CitationSourceKind, RegExp> = {
  document: /^Documento:\s*/iu,
  course: /^Curso:\s*/iu,
  profile: /^Perfil:\s*/iu,
  profile_course: /^(?:Progreso|Curso):\s*/iu,
  calendar_event: /^Evento:\s*/iu,
  announcement: /^Anuncio:\s*/iu,
};

const KIND_LABELS: Record<CitationSourceKind, string> = {
  document: 'Documento',
  course: 'Curso',
  profile: 'Perfil',
  profile_course: 'Progreso',
  calendar_event: 'Evento',
  announcement: 'Anuncio',
};

function readableLabel(citation: Citation): string {
  const label = citation.label.replace(LABEL_PREFIXES[citation.source_kind], '').trim();
  return label.length > 0 ? label : citation.label;
}

function readableDocumentLocator(locator: string): string | null {
  const numberedSection = locator.match(/^section(?::\d+)+[.:]\s*(.+)$/iu);
  if (numberedSection?.[1]) return numberedSection[1].trim();

  const titledSection = locator.match(/^section:[^:]+:\s*(.+)$/iu);
  if (titledSection?.[1]) return titledSection[1].trim();

  return null;
}

function sourceDetail(citation: Citation): string | null {
  return citation.source_kind === 'document'
    ? readableDocumentLocator(citation.locator) ?? citation.locator
    : null;
}

function hasOpenableDocument(citation: Citation): citation is Citation & {
  source_kind: 'document';
  document_version_id: string;
  artifact_url: string;
} {
  return (
    citation.source_kind === 'document' &&
    citation.document_version_id !== null &&
    citation.artifact_url ===
      `/api/${isCcdLocal()?'v1':'v2'}/documents/${citation.document_version_id}/artifact`
  );
}

export function ChatSources({ citations }: { citations: Citation[] }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const sourceCount = citations.length;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`${isExpanded ? 'Ocultar' : 'Mostrar'} ${sourceCount} fuentes`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        aria-expanded={isExpanded}
        onPress={() => setIsExpanded((current) => !current)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <View style={styles.toggleLeft}>
          <DocGlyph color={colors.banuMagenta} size={15} />
          <Text style={styles.toggleText}>
            {sourceCount === 1 ? '1 fuente' : `${sourceCount} fuentes`}
          </Text>
        </View>
        <Text aria-hidden style={styles.toggleSymbol}>
          {isExpanded ? '−' : '+'}
        </Text>
      </Pressable>

      {isExpanded && (
        <FadeIn><View accessibilityLabel={`${sourceCount} fuentes de la respuesta`} testID="chat-sources" style={styles.list}>
          {citations.map((citation) => {
            const detail = sourceDetail(citation);
            const canOpenDocument = hasOpenableDocument(citation);
            return (
              <View key={citation.index} style={styles.source}>
                <View style={styles.sourceIndexBadge}>
                  <Text style={styles.sourceIndex}>{citation.index + 1}</Text>
                </View>
                <View style={styles.sourceText}>
                  <Text testID="source-kind" style={styles.sourceKind}>{KIND_LABELS[citation.source_kind]}</Text>
                  <Text selectable style={styles.sourceLabel}>{readableLabel(citation)}</Text>
                  {detail !== null && <Text selectable style={styles.sourceDetail}>{detail}</Text>}
                  {canOpenDocument && (
                    <Pressable
                      accessibilityLabel={`Abrir documento ${readableLabel(citation)}`}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/document',
                          params: {
                            document_version_id: citation.document_version_id,
                            title: readableLabel(citation),
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.openDocument,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.openDocumentText}>Abrir documento</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          <Pressable
            accessibilityLabel={`Ocultar ${sourceCount} fuentes`}
            accessibilityRole="button"
            accessibilityState={{expanded:true}}
            aria-expanded
            onPress={() => setIsExpanded(false)}
            style={({pressed}) => [styles.toggle, pressed && styles.pressed]}>
            <Text style={styles.toggleText}>Contraer fuentes</Text>
          </Pressable>
        </View></FadeIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  toggle: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    backgroundColor: colors.banuSoft,
    alignSelf: 'flex-start',
    paddingRight: spacing.md,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleText: { color: colors.banuMagentaStrong, fontSize: 13, fontWeight: '700' },
  toggleSymbol: { color: colors.banuMagentaStrong, fontSize: 16, fontWeight: '700', marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  list: { gap: spacing.xs, marginTop: spacing.xs },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    backgroundColor: colors.banuCanvas,
  },
  sourceIndexBadge: {
    minWidth: 22,
    minHeight: 22,
    padding: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.banuSoft,
  },
  sourceIndex: {
    color: colors.banuMagentaStrong,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  sourceText: { flex: 1, minWidth:0, gap: 2 },
  sourceKind: {
    color: colors.banuMuted,
    fontSize: typography.caption,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sourceLabel: { color: colors.banuInk, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  sourceDetail: { color: colors.banuSecondary, fontSize: 13, lineHeight: 19 },
  openDocument: {
    minHeight: layout.minTouchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.banuMagenta,
    backgroundColor: colors.surface,
  },
  openDocumentText: {
    color: colors.banuMagentaStrong,
    fontSize: typography.small,
    fontWeight: '800',
  },
});
