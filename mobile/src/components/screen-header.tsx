import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '@/ui/tokens';

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
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text style={styles.brand}>BanuChat</Text>
        <Text style={styles.title}>{title}</Text>
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
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  heading: { flex: 1 },
  brand: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.brand,
    fontSize: typography.heading,
    fontWeight: '800',
    lineHeight: 28,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: spacing.xxs,
  },
  action: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: { color: colors.primary, fontSize: typography.small, fontWeight: '700' },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.65 },
});
