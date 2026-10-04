import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Citation, CitationSourceKind } from '@/api/messages';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

const LABEL_PREFIXES: Record<CitationSourceKind, RegExp> = {
  document: /^Documento:\s*/iu,
  course: /^Curso:\s*/iu,
  profile: /^Perfil:\s*/iu,
  profile_course: /^(?:Progreso|Curso):\s*/iu,
  calendar_event: /^Evento:\s*/iu,
  announcement: /^Anuncio:\s*/iu,
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
    ? readableDocumentLocator(citation.locator)
    : null;
}

export function ChatSources({ citations }: { citations: Citation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sourceCount = citations.length;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`${isExpanded ? 'Ocultar' : 'Mostrar'} ${sourceCount} fuentes`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <Text style={styles.toggleText}>
          {isExpanded ? 'Ocultar fuentes' : 'Ver fuentes'} ({sourceCount})
        </Text>
        <Text aria-hidden style={styles.toggleSymbol}>
          {isExpanded ? '−' : '+'}
        </Text>
      </Pressable>

      {isExpanded && (
        <View accessibilityLabel={`${sourceCount} fuentes de la respuesta`} style={styles.list}>
          {citations.map((citation) => {
            const detail = sourceDetail(citation);
            return (
              <View key={citation.index} style={styles.source}>
                <Text style={styles.sourceIndex}>{citation.index + 1}</Text>
                <View style={styles.sourceText}>
                  <Text style={styles.sourceLabel}>{readableLabel(citation)}</Text>
                  {detail !== null && <Text style={styles.sourceDetail}>{detail}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggle: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleText: { color: colors.primary, fontSize: typography.small, fontWeight: '700' },
  toggleSymbol: { color: colors.primary, fontSize: 20, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  list: { gap: spacing.sm, paddingBottom: spacing.xs },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  sourceIndex: {
    width: 24,
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '800',
  },
  sourceText: { flex: 1, gap: spacing.xxs },
  sourceLabel: { color: colors.text, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  sourceDetail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
});
