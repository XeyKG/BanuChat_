import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAnnouncements,
  type Announcement,
  type AnnouncementFilter,
  type AnnouncementStatus,
} from '@/api/announcements';
import { AppButton } from '@/components/app-button';
import {CardGrid,ContentColumn,DemoNotice,FilterChip,ScreenState,StatusBadge,secondaryStyles} from '@/components/secondary-ui';
import { ScreenHeader } from '@/components/screen-header';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated} from '@/config/demo-mode';
import { FadeIn } from '@/ui/animated';
import { colors, radii, shadows, spacing, typography, textStyles } from '@/ui/tokens';

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
  expired: { label: 'Vencido', tint: colors.banuMuted, soft: colors.banuBorder },
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
    <SafeAreaView testID="secondary-screen" style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Noticias y convocatorias · hora de Bogotá"
        title="Noticias y novedades"
      />

      {Platform.OS==='web' && <View testID="aux-controls" style={[secondaryStyles.filterBar,styles.search]}><View style={styles.searchInput}><Text style={styles.searchLabel}>Buscar anuncios · mínimo 2 letras</Text><TextInput accessibilityLabel="Buscar anuncios auxiliares" placeholder="Título o descripción" placeholderTextColor={colors.banuMuted} value={search} onChangeText={setSearch} maxLength={100} onSubmitEditing={searchAnnouncements} style={secondaryStyles.input}/></View><AppButton tone="banu" label="Buscar anuncios" disabled={!canSearch} onPress={searchAnnouncements}/></View>}
      <View testID="aux-filters" style={secondaryStyles.filterBar}>
        <View accessibilityRole="radiogroup" style={secondaryStyles.filters}>{FILTERS.map(option=><FilterChip key={option.value} label={option.label} accessibilityLabel={`Mostrar anuncios ${option.label.toLowerCase()}`} selected={filter===option.value} onPress={()=>selectFilter(option.value)}/>)}</View>
      </View>

      <ScrollView contentContainerStyle={secondaryStyles.scroll}>
        <ContentColumn testID="aux-content">
          {isCcdAuthenticated() && <DemoNotice>{CCD_AUXILIARY_NOTICE}</DemoNotice>}
          {loadState === 'loading' && <ScreenState kind="loading" title="Cargando anuncios..."/>}
          {loadState === 'error' && <ScreenState kind="error" title="No fue posible cargar los anuncios" body="Comprueba la conexión e intenta nuevamente."><AppButton tone="banu" label="Reintentar" onPress={retry}/></ScreenState>}
          {loadState === 'success' && announcements.length === 0 && <ScreenState kind="empty" title="Sin anuncios" body={EMPTY_MESSAGES[filter]}/>}

          {loadState === 'success' && announcements.length > 0 && (
            <CardGrid testID="announcement-list">
              {announcements.map((announcement, index) => {
                const meta = STATUS_META[announcement.temporal_status];
                return (
                  <FadeIn key={announcement.announcement_key} delay={Math.min(index, 6) * 70}>
                    <View style={styles.announcementCard}>
                      <View style={[styles.announcementAccent, { backgroundColor: meta.tint }]} />
                      <View style={styles.announcementBody}>
                        <View style={styles.announcementHeading}>
                          <Text style={styles.announcementTitle}>{announcement.title}</Text>
                          <StatusBadge tint={meta.tint} soft={meta.soft}>{meta.label}</StatusBadge>
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
            </CardGrid>
          )}
        </ContentColumn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
searchInput:{flexGrow:1,minWidth:180,gap:spacing.xs},
searchLabel:{...textStyles.small,color:colors.banuSecondary,fontWeight:'600'},
search:{flexDirection:'row',alignItems:'flex-end',gap:spacing.sm,flexWrap:'wrap'},
safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
announcementCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.banuBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.banuPanel,
  },
announcementAccent: { width: 4 },
announcementBody: { flex: 1, gap: spacing.sm, padding: spacing.md },
announcementHeading: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
announcementTitle: {
    flex: 1,
    color: colors.banuInk,
    fontSize: typography.body,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
announcementDescription: {
    color: colors.banuSecondary,
    fontSize: typography.small,
    lineHeight: 23,
  },
validityBlock: {
    gap: spacing.xxs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.banuBorder,
  },
validityText: { color: colors.banuMuted, fontSize: typography.caption, lineHeight: 18 }
});
