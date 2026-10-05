import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandMark, FadeIn } from '@/ui/animated';
import { CalendarGlyph, ChartGlyph, SparkGlyph } from '@/ui/icons';
import { colors, layout, shadows, spacing, typography } from '@/ui/tokens';

interface OnboardingSlide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  accentSoft: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    key: 'assistant',
    eyebrow: 'Asistente académico',
    title: 'Pregunta. Banu responde con evidencia.',
    body: 'BanuChat consulta el material disponible y muestra las fuentes asociadas cuando corresponde.',
    accent: colors.accent,
    accentSoft: colors.accentSoft,
  },
  {
    key: 'progress',
    eyebrow: 'Tu avance',
    title: 'Tu progreso, siempre a la mano.',
    body: 'Consulta el estado de tus cursos, porcentajes de avance y fechas clave sin salir de la conversación.',
    accent: colors.success,
    accentSoft: colors.successSoft,
  },
  {
    key: 'calendar',
    eyebrow: 'Tu agenda',
    title: 'Eventos y cierres, sin sorpresas.',
    body: 'Sesiones, fechas de cierre y anuncios del periodo, organizados y disponibles al instante.',
    accent: colors.violet,
    accentSoft: colors.violetSoft,
  },
];

function SlideGlyph({ slide }: { slide: OnboardingSlide }) {
  const glyphProps = { color: slide.accent, size: 44 };
  return (
    <View style={[styles.glyphHalo, { backgroundColor: slide.accentSoft }]}>
      <View style={[styles.glyphHaloInner, { backgroundColor: colors.surface }, shadows.soft]}>
        {slide.key === 'assistant' && <SparkGlyph {...glyphProps} />}
        {slide.key === 'progress' && <ChartGlyph {...glyphProps} />}
        {slide.key === 'calendar' && <CalendarGlyph {...glyphProps} />}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  function goToProfiles() {
    router.replace('/profiles');
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (viewportWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  }

  function advance() {
    if (isLastSlide) {
      goToProfiles();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * viewportWidth, animated: true });
    setActiveIndex(nextIndex);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={styles.container}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <BrandMark size={34} />
            <Text style={styles.brandName}>BanuChat</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Omitir introducción"
            onPress={goToProfiles}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
            <Text style={styles.skipText}>Omitir</Text>
          </Pressable>
        </View>

        {viewportWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={styles.pager}>
            {SLIDES.map((slide) => (
              <View key={slide.key} style={[styles.slide, { width: viewportWidth }]}>
                <View style={styles.slideContent}>
                  <FadeIn delay={80}>
                    <SlideGlyph slide={slide} />
                  </FadeIn>
                  <FadeIn delay={170}>
                    <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
                    <Text style={styles.title}>{slide.title}</Text>
                  </FadeIn>
                  <FadeIn delay={260}>
                    <Text style={styles.body}>{slide.body}</Text>
                  </FadeIn>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <View accessibilityLabel={`Paso ${activeIndex + 1} de ${SLIDES.length}`} style={styles.dots}>
            {SLIDES.map((slide, index) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  index === activeIndex
                    ? [styles.dotActive, { backgroundColor: slide.accent }]
                    : styles.dotIdle,
                ]}
              />
            ))}
          </View>

          <AppButton
            label={isLastSlide ? 'Comenzar' : 'Continuar'}
            onPress={advance}
            style={styles.nextButton}
          />
          <Text style={styles.demoNote}>Demostración académica · datos completamente sintéticos</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  skipButton: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 19,
  },
  skipText: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  pager: { flexGrow: 0 },
  slide: { paddingHorizontal: spacing.lg },
  slideContent: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxl,
  },
  glyphHalo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphHaloInner: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: typography.display,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 25,
    maxWidth: 460,
  },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: 8, borderRadius: 4 },
  dotIdle: { width: 8, backgroundColor: colors.borderStrong },
  dotActive: { width: 26 },
  nextButton: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  demoNote: {
    color: colors.muted,
    fontSize: typography.caption,
    textAlign: 'center',
  },
});
