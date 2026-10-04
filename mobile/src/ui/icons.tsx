import { StyleSheet, View } from 'react-native';

import { colors } from '@/ui/tokens';

interface GlyphProps {
  color?: string;
  size?: number;
}

/** Burbuja de chat. */
export function ChatGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  const bubbleWidth = size;
  const bubbleHeight = size * 0.82;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: bubbleWidth,
          height: bubbleHeight,
          borderRadius: size * 0.32,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          bottom: size * 0.02,
          width: size * 0.26,
          height: size * 0.26,
          backgroundColor: colors.surface,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** Calendario. */
export function CalendarGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          flex: 1,
          borderRadius: size * 0.22,
          borderWidth: 2,
          borderColor: color,
          overflow: 'hidden',
        }}>
        <View style={{ height: size * 0.26, backgroundColor: color }} />
        <View style={{ flexDirection: 'row', gap: size * 0.14, padding: size * 0.12 }}>
          <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: 2, backgroundColor: color, opacity: 0.45 }} />
        </View>
      </View>
    </View>
  );
}

/** Barras de progreso. */
export function ChartGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  const barWidth = size * 0.2;
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
      <View style={{ width: barWidth, height: size * 0.42, borderRadius: barWidth / 2, backgroundColor: color, opacity: 0.45 }} />
      <View style={{ width: barWidth, height: size * 0.68, borderRadius: barWidth / 2, backgroundColor: color, opacity: 0.7 }} />
      <View style={{ width: barWidth, height: size, borderRadius: barWidth / 2, backgroundColor: color }} />
    </View>
  );
}

/** Reloj / historial. */
export function ClockGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          width: 2.4,
          height: size * 0.3,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.5,
          top: size * 0.5,
          width: size * 0.24,
          height: 2.4,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Destello / IA. */
export function SparkGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.16,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.08,
          backgroundColor: colors.surface,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.04,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** Documento. */
export function DocGlyph({ color = colors.accent, size = 22 }: GlyphProps) {
  return (
    <View
      style={{
        width: size * 0.8,
        height: size,
        borderRadius: size * 0.16,
        borderWidth: 2,
        borderColor: color,
        paddingHorizontal: size * 0.14,
        justifyContent: 'center',
        gap: size * 0.14,
      }}>
      <View style={{ height: 2.2, borderRadius: 2, backgroundColor: color }} />
      <View style={{ height: 2.2, borderRadius: 2, backgroundColor: color, opacity: 0.6 }} />
      <View style={{ height: 2.2, width: '55%', borderRadius: 2, backgroundColor: color, opacity: 0.35 }} />
    </View>
  );
}

/** Chevron derecho. */
export function ChevronGlyph({ color = colors.muted, size = 16 }: GlyphProps) {
  const bar = size * 0.62;
  return (
    <View style={{ width: size * 0.6, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          glyphStyles.chevronBar,
          { width: bar, backgroundColor: color, transform: [{ rotate: '-45deg' }, { translateY: -size * 0.16 }] },
        ]}
      />
      <View
        style={[
          glyphStyles.chevronBar,
          { width: bar, backgroundColor: color, transform: [{ rotate: '45deg' }, { translateY: size * 0.16 }] },
        ]}
      />
    </View>
  );
}

/** Check. */
export function CheckGlyph({ color = colors.white, size = 14 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: size * 0.45,
          height: 2.4,
          borderRadius: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }, { translateX: size * 0.05 }, { translateY: size * 0.14 }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          width: size * 0.8,
          height: 2.4,
          borderRadius: 2,
          backgroundColor: color,
          transform: [{ rotate: '-52deg' }, { translateX: -size * 0.06 }, { translateY: -size * 0.02 }],
        }}
      />
    </View>
  );
}

/** Papelera. */
export function TrashGlyph({ color = colors.error, size = 18 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.86,
          height: 2.2,
          borderRadius: 2,
          backgroundColor: color,
          marginBottom: size * 0.08,
        }}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.68,
          borderRadius: size * 0.12,
          borderWidth: 2,
          borderColor: color,
        }}
      />
    </View>
  );
}

const glyphStyles = StyleSheet.create({
  chevronBar: {
    position: 'absolute',
    height: 2.2,
    borderRadius: 2,
  },
});
