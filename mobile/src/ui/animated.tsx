import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn as EnterFade,
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion } from '@/ui/tokens';
import { BanuAvatar } from '@/components/banu-avatar';

/** Subscribe as well as read: a preference change takes effect without reload. */
export function useMotionReduced() {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** Brief opacity entrance; caps legacy delays to keep actions available. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useMotionReduced();
  return (
    <Animated.View
      entering={reduced ? undefined : EnterFade.duration(motion.enter).delay(Math.min(delay, 60)).reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}

/** Message appearance without moving the reading position. */
export function BubbleIn({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useMotionReduced();
  return (
    <Animated.View
      entering={reduced ? undefined : EnterFade.duration(motion.enter).reduceMotion(ReduceMotion.System)}
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

/** Shared UI-thread feedback; no work when disabled by the motion preference. */
export function usePressFeedback(scaleTo=0.99,enabled=true) {
  const reduced = useMotionReduced();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced||!enabled) { cancelAnimation(scale); scale.set(1); }
    return () => cancelAnimation(scale);
  }, [reduced, enabled, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  const pressIn=()=>scale.set(withTiming(reduced||!enabled ? 1 : scaleTo, { duration: motion.press, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: ReduceMotion.System }));
  const pressOut=()=>scale.set(withTiming(1, { duration: motion.press, reduceMotion: ReduceMotion.System }));
  return {animatedStyle,pressIn,pressOut};
}

/** Accessible Pressable; subtle, interruptible press feedback. */
export function PressableScale({ children, scaleTo = 0.99, style, ...rest }: PressableScaleProps) {
  const {animatedStyle,pressIn,pressOut}=usePressFeedback(scaleTo,!rest.disabled);

  return (
    <Pressable
      {...rest}
      style={styles.stretch}
      onPressIn={(event) => {
        pressIn();
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressOut();
        rest.onPressOut?.(event);
      }}>
      <Animated.View style={[styles.stretch, animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Status dots fade only while a request is pending and the app is active. */
export function TypingIndicator({ color = colors.muted }: { color?: string }) {
  const reduced = useMotionReduced();
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return (
    <View aria-hidden style={styles.typingRow}>
      {[0, 1, 2].map((dot) => (
        <TypingDot key={dot} index={dot} color={color} animate={!reduced && active} />
      ))}
    </View>
  );
}

function TypingDot({ index, color, animate }: { index: number; color: string; animate: boolean }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!animate) { lift.set(0); return; }
    lift.set(withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 450, reduceMotion: ReduceMotion.System }),
          withTiming(0, { duration: 450, reduceMotion: ReduceMotion.System }),
        ),
        -1,
        false,
      ),
    ));
    return () => cancelAnimation(lift);
  }, [animate, index, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * lift.get(),
    transform: [{scale: 0.85 + 0.15 * lift.get()}],
  }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, animatedStyle]} />;
}

/** Barra de progreso animada. */
export function AnimatedProgressBar({
  percent,
  tint = colors.accent,
  trackColor = colors.border,
  height = 8,
  accessibilityLabel,
}: {
  percent: number;
  tint?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const reduced = useMotionReduced();
  const progress = useSharedValue(Math.max(0, Math.min(100, percent)) / 100);

  useEffect(() => {
    progress.set(withTiming(Math.max(0, Math.min(100, percent)) / 100, {
      duration: reduced ? 0 : motion.progress,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }));
    return () => cancelAnimation(progress);
  }, [percent, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(100, percent)) }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, percent))} style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: tint, borderRadius: height / 2 }, animatedStyle]}
      />
    </View>
  );
}

const AVATAR_PALETTES: { bg: string; fg: string }[] = [
  { bg: colors.accentSoft, fg: colors.accent },
  { bg: colors.successSoft, fg: colors.success },
  { bg: colors.violetSoft, fg: colors.violet },
  { bg: colors.amberSoft, fg: colors.amber },
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

/** Existing brand entry point, now backed by the exact supplied Banu artwork. */
export function BrandMark({ size = 40, variant='color', framed=true }: { size?: number;variant?:'color'|'light'|'dark';framed?:boolean }) {
  return <BanuAvatar size={size} variant={variant} framed={framed}/>;
}

const styles = StyleSheet.create({
  stretch: { width: '100%' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', width: '100%', transformOrigin: 'left center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
