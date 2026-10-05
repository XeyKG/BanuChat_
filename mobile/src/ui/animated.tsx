import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/ui/tokens';

/** Entrada suave hacia arriba con retardo escalonado. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(430).delay(delay).easing(Easing.out(Easing.cubic))}
      style={style}>
      {children}
    </Animated.View>
  );
}

/** Entrada descendente, pensada para mensajes nuevos del chat. */
export function BubbleIn({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}
      style={style}>
      {children}
    </Animated.View>
  );
}

interface PressableScaleProps extends PressableProps {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pressable con micro-interacción de escala premium. */
export function PressableScale({ children, scaleTo = 0.97, style, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, { duration: 110, easing: Easing.out(Easing.quad) }));
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) }));
        rest.onPressOut?.(event);
      }}>
      <Animated.View style={[styles.stretch, animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Tres puntos rebotando: "Banu está pensando...". */
export function TypingIndicator({ color = colors.muted }: { color?: string }) {
  return (
    <View style={styles.typingRow}>
      {[0, 1, 2].map((dot) => (
        <TypingDot key={dot} index={dot} color={color} />
      ))}
    </View>
  );
}

function TypingDot({ index, color }: { index: number; color: string }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * lift.value }],
    opacity: 0.35 + 0.65 * lift.value,
  }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, animatedStyle]} />;
}

/** Barra de progreso animada. */
export function AnimatedProgressBar({
  percent,
  tint = colors.accent,
  trackColor = colors.border,
  height = 8,
}: {
  percent: number;
  tint?: string;
  trackColor?: string;
  height?: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, percent)), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: tint, borderRadius: height / 2 }, animatedStyle]}
      />
    </View>
  );
}

const AVATAR_PALETTES: { bg: string; fg: string }[] = [
  { bg: '#EEF0FE', fg: '#3B4FE0' },
  { bg: '#E7F7F0', fg: '#0E9F6E' },
  { bg: '#F1ECFC', fg: '#6D4AC8' },
  { bg: '#FCF3E2', fg: '#B06E08' },
  { bg: '#E6F4FB', fg: '#1D7FA8' },
];

function hashAlias(alias: string): number {
  let hash = 0;
  for (let index = 0; index < alias.length; index += 1) {
    hash = (hash * 31 + alias.charCodeAt(index)) % 997;
  }
  return hash;
}

function initialsOf(alias: string): string {
  const words = alias.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/** Avatar con monograma y color derivado del alias. */
export function MonogramAvatar({ alias, size = 44 }: { alias: string; size?: number }) {
  const palette = AVATAR_PALETTES[hashAlias(alias) % AVATAR_PALETTES.length];
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: palette.bg,
        },
      ]}>
      <Text style={{ color: palette.fg, fontSize: size * 0.38, fontWeight: '800' }}>
        {initialsOf(alias)}
      </Text>
    </View>
  );
}

/** Marca BanuChat: chispa dentro de un cuadrado redondeado. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View
      style={[
        styles.brandMark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
        },
      ]}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.11,
          backgroundColor: colors.white,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.05,
          backgroundColor: colors.accent,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stretch: { width: '100%' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 20 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
