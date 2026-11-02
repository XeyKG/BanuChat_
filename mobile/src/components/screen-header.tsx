import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography, radii, textStyles } from '@/ui/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  actionLabel = 'Inicio',
  actionDisabled = false,
  onAction,
}: ScreenHeaderProps) {
  return (
    <View testID="screen-header" style={styles.header}>
      <View style={styles.heading}>
        {Platform.OS==='web'&&<Text style={styles.eyebrow}>TU ESPACIO ACADÉMICO</Text>}
        <Text accessibilityRole="header" testID="screen-title" style={styles.title}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: actionDisabled }}
        disabled={actionDisabled}
        onPress={onAction}
        style={({ pressed }) => [
          styles.action,
          actionDisabled && styles.actionDisabled,
          pressed && !actionDisabled && styles.actionPressed,
        ]}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: Platform.OS==='web'?1220:layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.banuCanvas,
  },
  heading: { flex: 1, minWidth:0, gap: spacing.xs },
  eyebrow:{...textStyles.eyebrow,fontSize:11,color:colors.banuMagenta},
  title: {
    ...textStyles.heading,
    color: colors.banuInk,
  },
  subtitle: {
    color: colors.banuSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  action: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    backgroundColor: colors.surface,
  },
  actionText: { color: colors.banuInk, fontSize: typography.small, fontWeight: '700' },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.7 },
});
