import { useEffect, useState } from 'react';
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
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

type LoadState = 'loading' | 'error' | 'success';
type ProgressFilter = 'all' | ProgressStatus;

const FILTERS: { value: ProgressFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'enrolled', label: 'Inscritos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completados' },
];
const STATUS_LABELS: Record<ProgressStatus, string> = {
  enrolled: 'Inscrito',
  in_progress: 'En progreso',
  completed: 'Completado',
};
const bogotaDateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatBogotaDateTime(timestamp: string): string {
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
    if (activeProfile === null) router.replace('/');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle={`Perfil activo: ${visibleAlias}`}
        title="Progreso"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View>
            <Text style={styles.sectionLabel}>Filtrar por estado</Text>
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
                      {isSelected ? `✓ ${option.label}` : option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando progreso"
                size="large"
                color={colors.primary}
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
              {courses.map((course) => (
                <View key={course.course_key} style={styles.courseCard}>
                  <View style={styles.courseHeading}>
                    <Text style={styles.courseName}>{course.course_name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.status}>{STATUS_LABELS[course.status]}</Text>
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
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${course.progress_percent}%` as `${number}%` },
                        ]}
                      />
                    </View>
                  </View>
                  {(course.started_at !== null || course.completed_at !== null) && (
                    <View style={styles.dateBlock}>
                      {course.started_at !== null && (
                        <Text style={styles.dateText}>
                          <Text style={styles.dateLabel}>Inicio: </Text>
                          {formatBogotaDateTime(course.started_at)}
                        </Text>
                      )}
                      {course.completed_at !== null && (
                        <Text style={styles.dateText}>
                          <Text style={styles.dateLabel}>Finalización: </Text>
                          {formatBogotaDateTime(course.completed_at)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  sectionLabel: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: '800', textTransform: 'uppercase', marginBottom: spacing.xs },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterButton: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  filterButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterText: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '700' },
  filterTextSelected: { color: colors.primaryStrong },
  stateCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  errorCard: { borderColor: '#FECACA', backgroundColor: colors.errorSoft },
  stateTitle: { color: colors.text, fontSize: typography.body, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
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
  },
  courseHeading: { gap: spacing.xs, alignItems: 'flex-start' },
  courseName: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  status: { color: colors.primaryStrong, fontSize: typography.caption, fontWeight: '800' },
  progressBlock: { gap: spacing.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressLabel: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
  percent: { color: colors.text, fontSize: typography.small, fontWeight: '800' },
  progressTrack: { height: 10, overflow: 'hidden', borderRadius: radii.pill, backgroundColor: colors.border },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  dateBlock: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  dateText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  dateLabel: { color: colors.text, fontWeight: '700' },
  pressed: { opacity: 0.68 },
});
