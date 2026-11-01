import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAnnouncements,
  type Announcement,
  type AnnouncementFilter,
  type AnnouncementStatus,
} from '@/api/announcements';
import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated} from '@/config/demo-mode';
import { FadeIn } from '@/ui/animated';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

type LoadState = 'loading' | 'error' | 'success';

const FILTERS: { value: AnnouncementFilter; label: string }[] = [
  { value: 'active', label: 'Vigentes' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'all', label: 'Todos' },
];

const STATUS_META: Record<AnnouncementStatus, { label: string; tint: string; soft: string }> = {
  active: { label: 'Vigente', tint: colors.success, soft: colors.successSoft },
  upcoming: { label: 'Próximo', tint: colors.warning, soft: colors.warningSoft },
  expired: { label: 'Vencido', tint: colors.muted, soft: colors.border },
};

const EMPTY_MESSAGES: Record<AnnouncementFilter, string> = {
  active: 'No hay anuncios vigentes en este momento.',
  upcoming: 'No hay anuncios próximos en este momento.',
  expired: 'No hay anuncios vencidos para mostrar.',
  all: 'No hay novedades disponibles.',
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

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<AnnouncementFilter>('active');
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search,setSearch] = useState(''), [query,setQuery] = useState('');
  const canSearch=[...search.trim()].length!==1;
  function searchAnnouncements(){if(canSearch){setLoadState('loading');setQuery(search.trim());setRetryCount(count=>count+1);}}

  useEffect(() => {
    let isMounted = true;

    void getAnnouncements({ temporalStatus: filter, query })
      .then((result) => {
        if (!isMounted) return;
        setAnnouncements(result.announcements);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setAnnouncements([]);
        setLoadState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [filter, query, retryCount]);

  function selectFilter(value: AnnouncementFilter) {
    if (value === filter) return;
    setLoadState('loading');
    setAnnouncements([]);
    setFilter(value);
  }

  function retry() {
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Noticias y convocatorias · hora de Bogotá"
        title="Noticias y novedades"
      />

      {Platform.OS==='web' && <View testID="aux-controls" style={styles.search}><TextInput accessibilityLabel="Buscar anuncios auxiliares" placeholder="Buscar anuncios (mínimo 2 letras)" value={search} onChangeText={setSearch} maxLength={100} onSubmitEditing={searchAnnouncements} style={styles.input}/><AppButton label="Buscar anuncios" disabled={!canSearch} onPress={searchAnnouncements}/></View>}
      <View testID="aux-filters" style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View accessibilityRole="radiogroup" style={styles.filters}>
            {FILTERS.map((option) => {
              const isSelected = filter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityLabel={`Mostrar anuncios ${option.label.toLowerCase()}`}
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
        <View testID="aux-content" style={styles.content}>
          {isCcdAuthenticated() && <Text testID="demo-notice" style={styles.stateText}>{CCD_AUXILIARY_NOTICE}</Text>}
          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando anuncios"
                color={colors.accent}
                size="large"
              />
              <Text style={styles.stateText}>Cargando anuncios...</Text>
            </View>
          )}

          {loadState === 'error' && (
            <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>No fue posible cargar los anuncios</Text>
              <Text style={styles.stateText}>Comprueba la conexión e intenta nuevamente.</Text>
              <AppButton label="Reintentar" onPress={retry} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && announcements.length === 0 && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <Text style={styles.stateTitle}>Sin anuncios</Text>
              <Text style={styles.stateText}>{EMPTY_MESSAGES[filter]}</Text>
            </View>
          )}

          {loadState === 'success' && announcements.length > 0 && (
            <View testID="announcement-list" style={styles.announcementList}>
              {announcements.map((announcement, index) => {
                const meta = STATUS_META[announcement.temporal_status];
                return (
                  <FadeIn key={announcement.announcement_key} delay={Math.min(index, 6) * 70}>
                    <View style={styles.announcementCard}>
                      <View style={[styles.announcementAccent, { backgroundColor: meta.tint }]} />
                      <View style={styles.announcementBody}>
                        <View style={styles.announcementHeading}>
                          <Text style={styles.announcementTitle}>{announcement.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: meta.soft }]}>
                            <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.announcementDescription}>{announcement.description}</Text>
                        <View style={styles.validityBlock}>
                          <Text style={styles.validityText}>
                            Inicio: {formatBogotaDateTime(announcement.valid_from)}
                          </Text>
                          {announcement.valid_until !== null && (
                            <Text style={styles.validityText}>
                              Fin: {formatBogotaDateTime(announcement.valid_until)}
                            </Text>
                          )}
                        </View>
                      </View>
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
  search:{width:'100%',maxWidth:960,alignSelf:'center',padding:spacing.md,flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  input:{flexGrow:1,minWidth:180,minHeight:44,padding:spacing.sm,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.sm,backgroundColor:colors.surface},
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
  content: {
    width: '100%',
    maxWidth: Platform.OS==='web'?960:layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },
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
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  stateTitle: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: { minWidth: 144 },
  announcementList: { gap: spacing.md },
  announcementCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  announcementAccent: { width: 4 },
  announcementBody: { flex: 1, gap: spacing.sm, padding: spacing.md },
  announcementHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  announcementTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  announcementDescription: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 21,
  },
  validityBlock: {
    gap: spacing.xxs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  validityText: { color: colors.muted, fontSize: typography.caption, lineHeight: 18 },
  pressed: { opacity: 0.68 },
});
