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
    maxWidth: Platform.OS==='web'?960:layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  heading: { flex: 1, gap: 2 },
  title: {
    ...textStyles.heading,
    color: colors.ink,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  action: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  actionText: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.7 },
});
