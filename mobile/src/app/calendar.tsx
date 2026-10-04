import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCalendarEvents,
  type CalendarEvent,
  type CalendarEventType,
} from '@/api/calendar';
import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';
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
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Próximos 30 días"
        title="Calendario"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Agenda del periodo</Text>
            <Text style={styles.contextText}>Las fechas y horas se muestran en hora de Bogotá.</Text>
          </View>

          <View>
            <Text style={styles.sectionLabel}>Filtrar por tipo</Text>
            <View accessibilityRole="radiogroup" style={styles.filters}>
              {FILTERS.map((option) => {
                const isSelected = filter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityLabel={`Mostrar ${option.label.toLowerCase()}`}
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
                accessibilityLabel="Cargando calendario"
                size="large"
                color={colors.primary}
              />
              <Text style={styles.stateText}>Cargando calendario...</Text>
            </View>
          )}

          {loadState === 'error' && (
            <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>No fue posible cargar el calendario</Text>
              <Text style={styles.stateText}>Comprueba la conexión e intenta nuevamente.</Text>
              <AppButton label="Reintentar" onPress={retry} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && events.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Sin eventos</Text>
              <Text style={styles.stateText}>No hay eventos en este periodo para el filtro seleccionado.</Text>
            </View>
          )}

          {loadState === 'success' && events.length > 0 && (
            <View style={styles.eventList}>
              {events.map((event) => (
                <View key={event.event_key} style={styles.eventCard}>
                  <View style={styles.eventTypeBadge}>
                    <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Inicio</Text>
                    <Text style={styles.eventTime}>{formatBogotaDateTime(event.starts_at)}</Text>
                    {event.ends_at !== null && (
                      <>
                        <Text style={styles.timeLabel}>Fin</Text>
                        <Text style={styles.eventTime}>{formatBogotaDateTime(event.ends_at)}</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.eventDescription}>{event.description}</Text>
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
  contextCard: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
  },
  contextTitle: { color: colors.brand, fontSize: typography.body, fontWeight: '700' },
  contextText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
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
  eventList: { gap: spacing.sm },
  eventCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  eventType: { color: colors.primaryStrong, fontSize: typography.caption, fontWeight: '800' },
  eventTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  timeBlock: { gap: 2, paddingVertical: spacing.xxs },
  timeLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  eventTime: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20, marginBottom: spacing.xxs },
  eventDescription: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 23 },
  pressed: { opacity: 0.68 },
});
