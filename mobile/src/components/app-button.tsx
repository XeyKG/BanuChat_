import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

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
  const indicatorColor = variant === 'primary' ? colors.white : colors.accent;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === 'primary' && !isDisabled && shadows.soft,
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
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  secondary: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  quiet: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.ink },
  quietLabel: { color: colors.textSecondary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});
