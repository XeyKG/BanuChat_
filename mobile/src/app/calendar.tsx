import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCalendarEvents,
  type CalendarEvent,
  type CalendarEventType,
} from '@/api/calendar';
import { AppButton } from '@/components/app-button';
import {ContentColumn,DemoNotice,FilterChip,ScreenState,StatusBadge,secondaryStyles} from '@/components/secondary-ui';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated,isCcdLocal} from '@/config/demo-mode';
import { FadeIn } from '@/ui/animated';
import { colors, radii, shadows, spacing, typography, textStyles } from '@/ui/tokens';
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
  course_session: { label: 'Sesión de curso', tint: colors.banuMagenta, soft: colors.banuSoft },
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
  const [range,setRange] = useState(() => {
    const dateFrom = getBogotaCivilToday();
    return { dateFrom, dateTo: addCivilDays(dateFrom, 29) };
  });
  const [dateFrom,setDateFrom]=useState(range.dateFrom);
  const validDate=/^\d{4}-\d{2}-\d{2}$/u.test(dateFrom)&&Number.isFinite(Date.parse(dateFrom+'T12:00:00Z'))&&new Date(dateFrom+'T12:00:00Z').toISOString().slice(0,10)===dateFrom;
  function applyDate(){if(validDate){setLoadState('loading');setRange({dateFrom,dateTo:addCivilDays(dateFrom,29)});}}
  const [filter, setFilter] = useState<EventFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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
    <SafeAreaView testID="secondary-screen" style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle={Platform.OS==='web'?`${range.dateFrom} al ${range.dateTo} · hora de Bogotá`:'Próximos 30 días · hora de Bogotá'}
        title="Calendario"
      />

      {Platform.OS==='web' && <View testID="aux-controls" style={[secondaryStyles.filterBar,styles.dateRange]}>
        <View style={styles.dateField}><Text style={styles.dateLabel}>Desde (AAAA-MM-DD)</Text><TextInput accessibilityLabel="Fecha inicial del calendario" value={dateFrom} onChangeText={setDateFrom} maxLength={10} autoCorrect={false} onSubmitEditing={applyDate} style={secondaryStyles.input}/></View>
        <AppButton tone="banu" label="Ver 30 días" style={{paddingHorizontal:spacing.sm}} disabled={!validDate} onPress={applyDate}/>
        <AppButton tone="banu" label="Hoy" style={{paddingHorizontal:spacing.sm}} variant="secondary" onPress={()=>{const today=getBogotaCivilToday();setDateFrom(today);setLoadState('loading');setRange({dateFrom:today,dateTo:addCivilDays(today,29)});}}/>
        {!validDate&&<Text accessibilityRole="alert" style={styles.dateError}>Ingresa una fecha válida en formato AAAA-MM-DD.</Text>}
      </View>}
      <View testID="aux-filters" style={secondaryStyles.filterBar}>
        <View accessibilityRole="radiogroup" style={secondaryStyles.filters}>{FILTERS.map(option=><FilterChip key={option.value} label={option.label} accessibilityLabel={`Mostrar ${option.label.toLowerCase()}`} selected={filter===option.value} onPress={()=>selectFilter(option.value)}/>)}</View>
      </View>

      <ScrollView contentContainerStyle={secondaryStyles.scroll}>
        <ContentColumn testID="aux-content">
          {isCcdAuthenticated() && <DemoNotice>{CCD_AUXILIARY_NOTICE}</DemoNotice>}
          {loadState === 'loading' && <ScreenState kind="loading" title="Cargando calendario..."/>}
          {loadState === 'error' && <ScreenState kind="error" title="No fue posible cargar el calendario" body="Comprueba la conexión e intenta nuevamente."><AppButton tone="banu" label="Reintentar" onPress={retry}/></ScreenState>}
          {loadState === 'success' && events.length === 0 && <ScreenState kind="empty" title="Sin eventos" body="No hay eventos en este periodo para el filtro seleccionado."/>}

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
                                <StatusBadge tint={meta.tint} soft={meta.soft}>{meta.label}</StatusBadge>
                                <Text style={styles.eventTime}>
                                  {timeFormatter.format(new Date(event.starts_at))}
                                  {event.ends_at !== null &&
                                    ` – ${timeFormatter.format(new Date(event.ends_at))}`}
                                </Text>
                              </View>
                              <Text selectable style={styles.eventTitle}>{event.title}</Text>
                              <Text selectable style={styles.eventDescription}>{event.description}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </FadeIn>
              );
            })}
        </ContentColumn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
dateRange:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:spacing.sm},
dateField:{flexBasis:140,flexGrow:1,minWidth:140,gap:spacing.xs},
dateLabel:{fontSize:14,color:colors.banuSecondary},
dateError:{width:'100%',color:colors.error},
safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
dayGroup: { gap: spacing.sm },
dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
dayBadge: {
    minWidth: 60,
    minHeight: 60,
    padding: spacing.xs,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    ...shadows.banuInset,
  },
dayNumber: { color: colors.banuInk, fontSize: 18, fontWeight: '800', lineHeight: 21 },
dayMonth: { color: colors.banuMuted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
dayHeaderCopy: { flex: 1, gap: 1 },
dayName: { color: colors.banuInk, fontSize: typography.body, fontWeight: '800', letterSpacing: -0.2 },
dayCount: { color: colors.banuMuted, fontSize: typography.caption },
eventList: { gap: spacing.sm, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.banuBorder },
eventCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.banuBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.banuPanel,
  },
eventAccent: { width: 4 },
eventBody: { flex: 1, gap: spacing.xs, padding: spacing.md },
eventTopRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
eventTime: { color: colors.banuMuted, fontSize: typography.caption, fontWeight: '600' },
eventTitle: { ...textStyles.body, color: colors.banuInk, fontWeight: '700' },
eventDescription: { ...textStyles.small, color: colors.banuSecondary }
});
