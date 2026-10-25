import { useEffect, useMemo, useState } from 'react';
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
import {isCcdLocal} from '@/config/demo-mode';
import { FadeIn } from '@/ui/animated';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';
import { addCivilDays, getBogotaCivilToday } from '@/utils/bogota-date';

type LoadState = 'loading' | 'error' | 'success';
type EventFilter = 'all' | CalendarEventType;

const FILTERS: { value: EventFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'course_session', label: 'Sesiones' },
  { value: 'announcement_deadline', label: 'Cierres' },
  { value: 'general', label: 'Generales' },
];

const EVENT_META: Record<CalendarEventType, { label: string; tint: string; soft: string }> = {
  course_session: { label: 'Sesión de curso', tint: colors.accent, soft: colors.accentSoft },
  announcement_deadline: { label: 'Cierre', tint: colors.amber, soft: colors.amberSoft },
  general: { label: 'General', tint: colors.violet, soft: colors.violetSoft },
};

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'long',
});

const monthFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
});

function dayKeyOf(timestamp: string): string {
  const date = new Date(timestamp);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`;
}

interface DayGroup {
  dayKey: string;
  events: CalendarEvent[];
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
  const [releaseId, setReleaseId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile === null) router.replace(isCcdLocal()?'/profiles':'/login');
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
        setReleaseId(result.release_id);
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

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKeyOf(event.starts_at);
      const group = groups.get(key);
      if (group) {
        group.push(event);
      } else {
        groups.set(key, [event]);
      }
    }
    return Array.from(groups.entries()).map(([dayKey, dayEvents]) => ({
      dayKey,
      events: dayEvents,
    }));
  }, [events]);

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
        subtitle="Próximos 30 días · hora de Bogotá"
        title="Calendario"
      />

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          {loadState === 'success' && releaseId !== null && (
            <Text accessibilityLabel={`Release sintética ${releaseId}`} style={styles.releaseText}>
              Release sintética: {releaseId.slice(0, 8)}
            </Text>
          )}
          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando calendario"
                size="large"
                color={colors.accent}
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
              <Text style={styles.stateText}>
                No hay eventos en este periodo para el filtro seleccionado.
              </Text>
            </View>
          )}

          {loadState === 'success' &&
            dayGroups.map((group, groupIndex) => {
              const firstEventDate = new Date(group.events[0].starts_at);
              const dayNumber = new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                day: 'numeric',
              }).format(firstEventDate);

              return (
                <FadeIn key={group.dayKey} delay={Math.min(groupIndex, 5) * 70}>
                  <View style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayNumber}>{dayNumber}</Text>
                        <Text style={styles.dayMonth}>{monthFormatter.format(firstEventDate)}</Text>
                      </View>
                      <View style={styles.dayHeaderCopy}>
                        <Text style={styles.dayName}>
                          {capitalize(dayFormatter.format(firstEventDate))}
                        </Text>
                        <Text style={styles.dayCount}>
                          {group.events.length === 1
                            ? '1 evento'
                            : `${group.events.length} eventos`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventList}>
                      {group.events.map((event) => {
                        const meta = EVENT_META[event.event_type];
                        return (
                          <View key={event.event_key} style={styles.eventCard}>
                            <View style={[styles.eventAccent, { backgroundColor: meta.tint }]} />
                            <View style={styles.eventBody}>
                              <View style={styles.eventTopRow}>
                                <View style={[styles.eventTypeBadge, { backgroundColor: meta.soft }]}>
                                  <Text style={[styles.eventType, { color: meta.tint }]}>
                                    {meta.label}
                                  </Text>
                                </View>
                                <Text style={styles.eventTime}>
                                  {timeFormatter.format(new Date(event.starts_at))}
                                  {event.ends_at !== null &&
                                    ` – ${timeFormatter.format(new Date(event.ends_at))}`}
                                </Text>
                              </View>
                              <Text style={styles.eventTitle}>{event.title}</Text>
                              <Text style={styles.eventDescription}>{event.description}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </FadeIn>
              );
            })}
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
  filterButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  filterText: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '700' },
  filterTextSelected: { color: colors.white },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
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
  releaseText: { color: colors.muted, fontSize: typography.caption, fontWeight: '700' },
  retryButton: { minWidth: 144 },
  dayGroup: { gap: spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  dayNumber: { color: colors.ink, fontSize: 18, fontWeight: '800', lineHeight: 21 },
  dayMonth: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dayHeaderCopy: { flex: 1, gap: 1 },
  dayName: { color: colors.ink, fontSize: typography.body, fontWeight: '800', letterSpacing: -0.2 },
  dayCount: { color: colors.muted, fontSize: typography.caption },
  eventList: { gap: spacing.sm, paddingLeft: spacing.xs },
  eventCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  eventAccent: { width: 4 },
  eventBody: { flex: 1, gap: spacing.xs, padding: spacing.md },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  eventTypeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  eventType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  eventTime: { color: colors.muted, fontSize: typography.caption, fontWeight: '600' },
  eventTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '800', letterSpacing: -0.2 },
  eventDescription: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  pressed: { opacity: 0.68 },
});
