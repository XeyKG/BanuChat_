import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}

export function AppButton({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  loading = false,
  loadingLabel,
  style,
  variant = 'primary',
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const visibleLabel = loading ? (loadingLabel ?? label) : label;
  const indicatorColor = variant === 'primary' ? colors.surface : colors.primary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading && <ActivityIndicator color={indicatorColor} size="small" />}
      <Text style={[styles.label, styles[`${variant}Label`]]}>{visibleLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  primary: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  secondary: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  quiet: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: { color: colors.surface },
  secondaryLabel: { color: colors.primary },
  quietLabel: { color: colors.textSecondary },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.78 },
});
