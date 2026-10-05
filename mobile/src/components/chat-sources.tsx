import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Citation, CitationSourceKind } from '@/api/messages';
import { DocGlyph } from '@/ui/icons';
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
        <View style={styles.toggleLeft}>
          <DocGlyph color={colors.accent} size={15} />
          <Text style={styles.toggleText}>
            {sourceCount === 1 ? '1 fuente verificada' : `${sourceCount} fuentes verificadas`}
          </Text>
        </View>
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
                <View style={styles.sourceIndexBadge}>
                  <Text style={styles.sourceIndex}>{citation.index + 1}</Text>
                </View>
                <View style={styles.sourceText}>
                  <Text style={styles.sourceKind}>{KIND_LABELS[citation.source_kind]}</Text>
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
  },
  toggle: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentSoftStrong,
    backgroundColor: colors.accentSoft,
    alignSelf: 'flex-start',
    paddingRight: spacing.md,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleText: { color: colors.accentStrong, fontSize: 13, fontWeight: '700' },
  toggleSymbol: { color: colors.accentStrong, fontSize: 16, fontWeight: '700', marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  list: { gap: spacing.xs, marginTop: spacing.xs },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  sourceIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  sourceIndex: {
    color: colors.accentStrong,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  sourceText: { flex: 1, gap: 2 },
  sourceKind: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sourceLabel: { color: colors.ink, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  sourceDetail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
});
