import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';
import Animated from 'react-native-reanimated';
import {usePressFeedback} from '@/ui/animated';

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
  tone?: 'default' | 'banu';
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
  tone = 'default',
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const {animatedStyle,pressIn,pressOut}=usePressFeedback(0.985,!isDisabled);
  const visibleLabel = loading ? (loadingLabel ?? label) : label;
  const indicatorColor = variant === 'primary' ? colors.white : tone==='banu'?colors.banuMagenta:colors.accent;

  return (
    <Pressable
      testID={`app-button-${variant}`}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      aria-busy={loading}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        tone==='banu'&&styles[`${variant}Banu`],
        variant === 'primary' && !isDisabled && (tone==='banu'?shadows.banuControl:shadows.soft),
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      <Animated.View style={[styles.labelRow,animatedStyle]}>
        {loading && <ActivityIndicator accessible={false} aria-hidden color={indicatorColor} size="small" />}
        <Text style={[styles.label, styles[`${variant}Label`],tone==='banu'&&variant!=='primary'&&styles.banuLabel]}>{visibleLabel}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBanu:{backgroundColor:colors.banuMagenta,borderColor:colors.banuMagenta,...shadows.banuControl},
  secondaryBanu:{backgroundColor:colors.surface,borderColor:colors.banuBorder,...shadows.banuPanel},
  quietBanu:{backgroundColor:'transparent'},
  banuLabel:{color:colors.banuMagentaStrong},
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
    backgroundColor: colors.background,
    ...shadows.raised,
  },
  quiet: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  label: {
    flexShrink:1,
    fontSize: typography.body,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  primaryLabel: { color: colors.white },
  labelRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.xs,minWidth:0,flexShrink:1},
  secondaryLabel: { color: colors.ink },
  quietLabel: { color: colors.textSecondary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});
