import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCalendarEvents,
  type CalendarEvent,
  type CalendarEventType,
} from '@/api/calendar';
import { useSession } from '@/session/session-context';
import { addCivilDays, getBogotaCivilToday } from '@/utils/bogota-date';

type LoadState = 'loading' | 'error' | 'success';
type EventFilter = 'all' | CalendarEventType;

const FILTERS: { value: EventFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'course_session', label: 'Sesiones' },
  { value: 'announcement_deadline', label: 'Cierres' },
  { value: 'general', label: 'Generales' },
];

const EVENT_LABELS: Record<CalendarEventType, string> = {
  course_session: 'Sesión de curso',
  announcement_deadline: 'Cierre',
  general: 'General',
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

export default function CalendarScreen() {
  const router = useRouter();
  const { activeProfile } = useSession();
  const [range] = useState(() => {
    const dateFrom = getBogotaCivilToday();
    return { dateFrom, dateTo: addCivilDays(dateFrom, 29) };
  });
  const [filter, setFilter] = useState<EventFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (activeProfile === null) router.replace('/');
  }, [activeProfile, router]);

  useEffect(() => {
    if (activeProfile === null) return;

    let isMounted = true;

    void getCalendarEvents({
      ...range,
      eventTypes: filter === 'all' ? undefined : [filter],
    })
      .then((result) => {
        if (!isMounted) return;
        setEvents(result.events);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setEvents([]);
        setLoadState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [activeProfile, filter, range, retryCount]);

  function selectFilter(value: EventFilter) {
    if (value === filter) return;
    setLoadState('loading');
    setFilter(value);
  }

  function retry() {
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  }

  if (activeProfile === null) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BanuChat</Text>
            <Text style={styles.title}>Calendario</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/home')}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>
        </View>

        <Text style={styles.period}>Próximos 30 días</Text>
        <Text style={styles.timeZone}>Horario: America/Bogota</Text>

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
            <Text style={styles.stateText}>Cargando calendario...</Text>
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>No fue posible cargar el calendario.</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {loadState === 'success' && events.length === 0 && (
          <Text style={styles.stateText}>No hay eventos en este periodo.</Text>
        )}

        {loadState === 'success' && events.length > 0 && (
          <View style={styles.eventList}>
            {events.map((event) => (
              <View key={event.event_key} style={styles.eventCard}>
                <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  Inicio: {formatBogotaDateTime(event.starts_at)}
                </Text>
                {event.ends_at !== null && (
                  <Text style={styles.eventTime}>Fin: {formatBogotaDateTime(event.ends_at)}</Text>
                )}
                <Text style={styles.eventDescription}>{event.description}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#172554', fontSize: 24, fontWeight: '700' },
  title: { color: '#334155', fontSize: 20, fontWeight: '600', marginTop: 4 },
  backButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  backButtonText: { color: '#1d4ed8', fontSize: 16, fontWeight: '600' },
  period: { color: '#0f172a', fontSize: 18, fontWeight: '600', marginTop: 8 },
  timeZone: { color: '#64748b', fontSize: 14 },
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
  eventList: { gap: 12 },
  eventCard: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  eventType: { color: '#1d4ed8', fontSize: 13, fontWeight: '700' },
  eventTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  eventTime: { color: '#334155', fontSize: 14 },
  eventDescription: { color: '#475569', fontSize: 15, lineHeight: 22 },
});
