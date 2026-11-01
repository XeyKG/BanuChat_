import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getProfileProgress,
  type CourseProgress,
  type ProgressStatus,
} from '@/api/progress';
import { AppButton } from '@/components/app-button';
import {CardGrid,ContentColumn,DemoNotice,FilterChip,ScreenState,StatusBadge,SurfaceCard,secondaryStyles} from '@/components/secondary-ui';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated,isCcdLocal} from '@/config/demo-mode';
import { AnimatedProgressBar, FadeIn } from '@/ui/animated';
import { colors, radii, spacing, typography, textStyles } from '@/ui/tokens';

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

      <View testID="aux-filters" style={secondaryStyles.filterBar}>
        <View accessibilityRole="radiogroup" style={secondaryStyles.filters}>{FILTERS.map(option=><FilterChip key={option.value} label={option.label} accessibilityLabel={`Mostrar cursos ${option.label.toLowerCase()}`} selected={filter===option.value} onPress={()=>selectFilter(option.value)}/>)}</View>
      </View>

      <ScrollView contentContainerStyle={secondaryStyles.scroll}>
        <ContentColumn testID="aux-content">
          {isCcdAuthenticated() && <DemoNotice>{CCD_AUXILIARY_NOTICE}</DemoNotice>}
          {showSummary && (
            <FadeIn>
              <View style={styles.summaryCard}>

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

          {loadState === 'loading' && <ScreenState kind="loading" title="Cargando progreso..."/>}
          {loadState === 'error' && <ScreenState kind="error" title="No fue posible cargar el progreso" body="Comprueba la conexión e intenta nuevamente."><AppButton label="Reintentar" onPress={retry}/></ScreenState>}
          {loadState === 'success' && courses.length === 0 && <ScreenState kind="empty" title="Sin cursos" body="No hay cursos con el estado seleccionado."/>}

          {loadState === 'success' && courses.length > 0 && (
            <CardGrid testID="course-list">
              {courses.map((course, index) => {
                const meta = STATUS_META[course.status];
                return (
                  <FadeIn key={course.course_key} delay={Math.min(index, 6) * 70}>
                    <SurfaceCard>
                      <View style={styles.courseHeading}>
                        <Text style={styles.courseName}>{course.course_name}</Text>
                        <StatusBadge tint={meta.tint} soft={meta.soft}>{meta.label}</StatusBadge>
                      </View>

                      <View style={styles.progressBlock}>
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>Avance</Text>
                          <Text style={styles.percent}>{course.progress_percent}%</Text>
                        </View>
                        <AnimatedProgressBar
                          accessibilityLabel={`${course.course_name}: ${course.progress_percent} por ciento completado`}
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
                    </SurfaceCard>
                  </FadeIn>
                );
              })}
            </CardGrid>
          )}
        </ContentColumn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safeArea: { flex: 1, backgroundColor: colors.background },
summaryCard: {
    overflow: 'hidden',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth:1,
    borderColor:colors.border,
  },
summaryMain: { gap: spacing.xxs },
summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '600',
  },
summaryValue: {
    color: colors.brand,
    fontSize: typography.heading,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
summaryStatValue: { color: colors.brand, fontSize: typography.body, fontWeight: '700' },
summaryStatLabel: { color: colors.textSecondary, fontSize: typography.meta, fontWeight: '600',textAlign:'center' },
summaryDivider: { width: 1, height: 30, backgroundColor: colors.border },
courseHeading: { gap: spacing.xs, alignItems: 'flex-start' },
courseName: { ...textStyles.heading, color: colors.ink },
progressBlock: { gap: spacing.xs },
progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
progressLabel: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
percent: { color: colors.brand, fontSize: typography.heading, fontWeight: '700', fontVariant: ['tabular-nums'] },
dateBlock: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
dateText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
dateLabel: { color: colors.ink, fontWeight: '700' }
});
