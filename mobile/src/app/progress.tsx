import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getProfileProgress,
  type CourseProgress,
  type ProgressStatus,
} from '@/api/progress';
import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import {isCcdLocal} from '@/config/demo-mode';
import { AnimatedProgressBar, FadeIn } from '@/ui/animated';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

type LoadState = 'loading' | 'error' | 'success';
type ProgressFilter = 'all' | ProgressStatus;

const FILTERS: { value: ProgressFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'enrolled', label: 'Inscritos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completados' },
];

const STATUS_META: Record<ProgressStatus, { label: string; tint: string; soft: string }> = {
  enrolled: { label: 'Inscrito', tint: colors.muted, soft: colors.border },
  in_progress: { label: 'En progreso', tint: colors.accent, soft: colors.accentSoft },
  completed: { label: 'Completado', tint: colors.success, soft: colors.successSoft },
};

const bogotaDateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatBogotaDate(timestamp: string): string {
  return bogotaDateTimeFormatter.format(new Date(timestamp));
}

export default function ProgressScreen() {
  const router = useRouter();
  const { activeProfile } = useSession();
  const profileKey = activeProfile?.profile_key ?? null;
  const profileAlias = activeProfile?.alias ?? null;

  const [filter, setFilter] = useState<ProgressFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [authoritativeAlias, setAuthoritativeAlias] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile === null) router.replace(isCcdLocal()?'/profiles':'/login');
  }, [activeProfile, router]);

  useEffect(() => {
    if (profileKey === null) return;

    let isMounted = true;
    void getProfileProgress({
      profileKey,
      statuses: filter === 'all' ? undefined : [filter],
    })
      .then((result) => {
        if (!isMounted) return;
        setCourses(result.courses);
        setAuthoritativeAlias(result.profile.alias);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setCourses([]);
        setLoadState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [filter, profileKey, retryCount]);

  const summary = useMemo(() => {
    return {
      total: courses.length,
      completed: courses.filter((course) => course.status === 'completed').length,
      inProgress: courses.filter((course) => course.status === 'in_progress').length,
      enrolled: courses.filter((course) => course.status === 'enrolled').length,
    };
  }, [courses]);

  function selectFilter(value: ProgressFilter) {
    if (value === filter) return;
    setLoadState('loading');
    setFilter(value);
  }

  function retry() {
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  }

  if (activeProfile === null || profileAlias === null) return null;

  const visibleAlias = authoritativeAlias ?? profileAlias;
  const showSummary = loadState === 'success' && filter === 'all' && courses.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle={`Perfil activo: ${visibleAlias}`}
        title="Progreso"
      />

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View accessibilityRole="radiogroup" style={styles.filters}>
            {FILTERS.map((option) => {
              const isSelected = filter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityLabel={`Mostrar cursos ${option.label.toLowerCase()}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => selectFilter(option.value)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    isSelected && styles.filterButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          {showSummary && (
            <FadeIn>
              <View style={styles.summaryCard}>
                <View aria-hidden style={styles.summaryGlow} />
                <View style={styles.summaryMain}>
                  <Text style={styles.summaryLabel}>Resumen del perfil</Text>
                  <Text style={styles.summaryValue}>{summary.total} cursos</Text>
                </View>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>{summary.inProgress}</Text>
                    <Text style={styles.summaryStatLabel}>En progreso</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>{summary.completed}</Text>
                    <Text style={styles.summaryStatLabel}>Completados</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>{summary.enrolled}</Text>
                    <Text style={styles.summaryStatLabel}>Inscritos</Text>
                  </View>
                </View>
              </View>
            </FadeIn>
          )}

          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando progreso"
                size="large"
                color={colors.accent}
              />
              <Text style={styles.stateText}>Cargando progreso...</Text>
            </View>
          )}

          {loadState === 'error' && (
            <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>No fue posible cargar el progreso</Text>
              <Text style={styles.stateText}>Comprueba la conexión e intenta nuevamente.</Text>
              <AppButton label="Reintentar" onPress={retry} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && courses.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Sin cursos</Text>
              <Text style={styles.stateText}>No hay cursos con el estado seleccionado.</Text>
            </View>
          )}

          {loadState === 'success' && courses.length > 0 && (
            <View style={styles.courseList}>
              {courses.map((course, index) => {
                const meta = STATUS_META[course.status];
                return (
                  <FadeIn key={course.course_key} delay={Math.min(index, 6) * 70}>
                    <View style={styles.courseCard}>
                      <View style={styles.courseHeading}>
                        <Text style={styles.courseName}>{course.course_name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: meta.soft }]}>
                          <Text style={[styles.status, { color: meta.tint }]}>{meta.label}</Text>
                        </View>
                      </View>

                      <View
                        accessibilityLabel={`${course.progress_percent} por ciento completado`}
                        accessibilityRole="progressbar"
                        accessibilityValue={{ min: 0, max: 100, now: course.progress_percent }}
                        style={styles.progressBlock}>
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>Avance</Text>
                          <Text style={styles.percent}>{course.progress_percent}%</Text>
                        </View>
                        <AnimatedProgressBar
                          percent={course.progress_percent}
                          tint={
                            course.status === 'completed'
                              ? colors.success
                              : course.status === 'in_progress'
                                ? colors.accent
                                : colors.borderStrong
                          }
                        />
                      </View>

                      {(course.started_at !== null || course.completed_at !== null) && (
                        <View style={styles.dateBlock}>
                          {course.started_at !== null && (
                            <Text style={styles.dateText}>
                              <Text style={styles.dateLabel}>Inicio: </Text>
                              {formatBogotaDate(course.started_at)}
                            </Text>
                          )}
                          {course.completed_at !== null && (
                            <Text style={styles.dateText}>
                              <Text style={styles.dateLabel}>Finalización: </Text>
                              {formatBogotaDate(course.completed_at)}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </FadeIn>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  filterBar: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg },
  filterButton: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  filterButtonSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  filterText: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '700' },
  filterTextSelected: { color: colors.white },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  summaryCard: {
    overflow: 'hidden',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  summaryGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryMain: { gap: spacing.xxs },
  summaryLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.small,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.white,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: spacing.md,
  },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryStatValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  summaryStatLabel: { color: 'rgba(255,255,255,0.72)', fontSize: typography.caption, fontWeight: '600' },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.18)' },
  stateCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  errorCard: { borderColor: '#F3C2BE', backgroundColor: colors.errorSoft },
  stateTitle: { color: colors.ink, fontSize: typography.body, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 21, textAlign: 'center' },
  retryButton: { minWidth: 144 },
  courseList: { gap: spacing.sm },
  courseCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  courseHeading: { gap: spacing.xs, alignItems: 'flex-start' },
  courseName: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  progressBlock: { gap: spacing.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressLabel: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
  percent: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  dateBlock: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  dateText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  dateLabel: { color: colors.ink, fontWeight: '700' },
  pressed: { opacity: 0.68 },
});
