import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getProfileProgress,
  type CourseProgress,
  type ProgressStatus,
} from '@/api/progress';

type LoadState = 'loading' | 'error' | 'success';
type ProgressFilter = 'all' | ProgressStatus;

const PROFILE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;
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

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function formatBogotaDateTime(timestamp: string): string {
  return bogotaDateTimeFormatter.format(new Date(timestamp));
}

export default function ProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    profile_key?: string | string[];
    profile_alias?: string | string[];
  }>();
  const profileKey = singleParam(params.profile_key);
  const profileAlias = singleParam(params.profile_alias);
  const hasValidParams =
    profileKey !== null &&
    PROFILE_KEY_PATTERN.test(profileKey) &&
    profileAlias !== null &&
    profileAlias.trim().length > 0;

  const [filter, setFilter] = useState<ProgressFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [authoritativeAlias, setAuthoritativeAlias] = useState<string | null>(null);

  useEffect(() => {
    if (!hasValidParams || profileKey === null) return;

    let isMounted = true;
    setLoadState('loading');
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
  }, [filter, hasValidParams, profileKey, retryCount]);

  function selectFilter(value: ProgressFilter) {
    if (value === filter) return;
    setLoadState('loading');
    setFilter(value);
  }

  function retry() {
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  }

  if (!hasValidParams) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidContainer}>
          <Text style={styles.brand}>BanuChat</Text>
          <Text style={styles.stateText}>No fue posible abrir el progreso de este perfil.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Volver a perfiles</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BanuChat</Text>
            <Text style={styles.title}>Progreso</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>
        </View>

        <Text style={styles.profileLabel}>Perfil: {authoritativeAlias ?? profileAlias}</Text>

        <View accessibilityRole="radiogroup" style={styles.filters}>
          {FILTERS.map((option) => {
            const isSelected = filter === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => selectFilter(option.value)}
                style={[styles.filterButton, isSelected && styles.filterButtonSelected]}>
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loadState === 'loading' && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.stateText}>Cargando progreso...</Text>
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>No fue posible cargar el progreso.</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {loadState === 'success' && courses.length === 0 && (
          <Text style={styles.stateText}>No hay cursos con este estado.</Text>
        )}

        {loadState === 'success' && courses.length > 0 && (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <View key={course.course_key} style={styles.courseCard}>
                <Text style={styles.courseName}>{course.course_name}</Text>
                <Text style={styles.status}>{STATUS_LABELS[course.status]}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${course.progress_percent}%` as `${number}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.percent}>{course.progress_percent} %</Text>
                </View>
                {course.started_at !== null && (
                  <Text style={styles.dateText}>
                    Inicio: {formatBogotaDateTime(course.started_at)}
                  </Text>
                )}
                {course.completed_at !== null && (
                  <Text style={styles.dateText}>
                    Finalización: {formatBogotaDateTime(course.completed_at)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, padding: 20, gap: 16 },
  invalidContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#172554', fontSize: 24, fontWeight: '700' },
  title: { color: '#334155', fontSize: 20, fontWeight: '600', marginTop: 4 },
  backButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  backButtonText: { color: '#1d4ed8', fontSize: 16, fontWeight: '600' },
  profileLabel: { color: '#334155', fontSize: 16, fontWeight: '600', marginTop: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  filterButtonSelected: { borderColor: '#1d4ed8', backgroundColor: '#dbeafe' },
  filterText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  filterTextSelected: { color: '#1e40af' },
  stateContainer: { alignItems: 'center', gap: 16, marginTop: 36 },
  stateText: { color: '#475569', fontSize: 16, textAlign: 'center', marginTop: 24 },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  courseList: { gap: 12 },
  courseCard: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  courseName: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  status: { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTrack: { flex: 1, height: 12, overflow: 'hidden', borderRadius: 6, backgroundColor: '#e2e8f0' },
  progressFill: { height: '100%', backgroundColor: '#1d4ed8' },
  percent: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  dateText: { color: '#475569', fontSize: 14 },
});
