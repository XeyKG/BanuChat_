import {useEffect,useMemo,useState} from 'react';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getAnnouncements} from '@/api/announcements';
import {getOe2Demo} from '@/api/oe2-demo';
import {AppButton} from '@/components/app-button';
import {AnnouncementCard} from '@/components/announcement-card';
import {NewsArticle} from '@/components/news-article';
import {CardGrid,ContentColumn,FilterChip,ScreenState,secondaryStyles} from '@/components/secondary-ui';
import {ScreenHeader} from '@/components/screen-header';
import {isCcdAuthenticated} from '@/config/demo-mode';
import {colors,radii,spacing,textStyles} from '@/ui/tokens';
import {announcementsToNews,filterNews,mergeNews,newsCategories,newsStatuses,oe2ToNews,
  type NewsCategory,type NewsItem,type NewsSource,type NewsStatus} from '@/utils/news-feed';

const loaders:Record<NewsSource,()=>Promise<NewsItem[]>> = {
  announcements:async()=>announcementsToNews(await getAnnouncements({temporalStatus:'all',limit:50})),
  news:async()=>oe2ToNews(await getOe2Demo('news','','all',50),'news'),
  calls:async()=>oe2ToNews(await getOe2Demo('calls','','all',50),'calls'),
  programming:async()=>oe2ToNews(await getOe2Demo('programming','','all',50),'programming'),
};
const sourceNames:Record<NewsSource,string> = {
  announcements:'catálogo y panel editorial',news:'noticias versionadas',
  calls:'convocatorias versionadas',programming:'programación',
};
const sourceKeys = Object.keys(loaders) as NewsSource[];
type SourceState = {items:NewsItem[];error?:false}|{items?:undefined;error:true};

export default function AnnouncementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{category?:string;query?:string}>();
  const initialCategory = params.category==='academic_offer'?'programming':params.category;
  const [category,setCategory] = useState<NewsCategory>(initialCategory && Object.hasOwn(newsCategories,initialCategory)?initialCategory as NewsCategory:'all');
  const [status,setStatus] = useState<NewsStatus>('all');
  const [search,setSearch] = useState(typeof params.query==='string' ? params.query.slice(0,100) : '');
  const [selected,setSelected] = useState<{item:NewsItem;cover?:string}|null>(null);
  const [sources,setSources] = useState<Partial<Record<NewsSource,SourceState>>>({});
  const [requested,setRequested] = useState(sourceKeys);
  useEffect(()=>{
    let active = true;
    for (const key of requested) {
      void loaders[key]().then(items=>{
        if (active) setSources(previous=>({...previous,[key]:{items}}));
      }).catch(()=>{
        if (active) setSources(previous=>({...previous,[key]:{error:true}}));
      });
    }
    return ()=>{active=false;};
  },[requested]);
  const items = useMemo(()=>mergeNews(sourceKeys.map(key=>sources[key]?.items??[])),[sources]);
  const rows = useMemo(()=>filterNews(items,category,status,search),[items,category,status,search]);
  const pending = sourceKeys.some(key=>sources[key]===undefined);
  const failed = sourceKeys.filter(key=>sources[key]?.error===true);
  function retry() {
    setSources(previous=>{
      const next = {...previous};
      for (const key of failed) delete next[key];
      return next;
    });
    setRequested(failed);
  }
  function clear() {
    setCategory('all');
    setStatus('all');
    setSearch('');
  }

  return <SafeAreaView testID="secondary-screen" style={styles.safe}>
    <ScreenHeader title="Noticias"
      subtitle="Entérate de las novedades, convocatorias y actividades del Centro de Competencias Digitales."
      onAction={()=>router.replace('/home')}/>
    <ScrollView contentContainerStyle={secondaryStyles.scroll} keyboardShouldPersistTaps="handled">
      <ContentColumn testID="aux-content">
        <View style={styles.filters}>
          <View style={styles.search}>
            <Text style={styles.label} nativeID="news-search-label">Buscar publicaciones</Text>
            <TextInput accessibilityLabel="Buscar en Noticias" aria-labelledby="news-search-label"
              placeholder="Título, contenido o código de curso" placeholderTextColor={colors.banuMuted}
              value={search} onChangeText={setSearch} style={[secondaryStyles.input,styles.input]}
              maxLength={100} returnKeyType="search"/>
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Categorías de Noticias" style={secondaryStyles.filters}>
            {(Object.keys(newsCategories) as NewsCategory[]).map(value=><FilterChip key={value} label={newsCategories[value]}
              selected={category===value} onPress={()=>setCategory(value)}/>)}
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Estado de publicación" style={secondaryStyles.filters}>
            {(Object.keys(newsStatuses) as NewsStatus[]).map(value=><FilterChip key={value} label={newsStatuses[value]}
              selected={status===value} onPress={()=>setStatus(value)}/>)}
          </View>
        </View>
        {!pending && failed.length===sourceKeys.length ? <ScreenState kind="error"
          title="No pudimos cargar Noticias" body="Comprueba la conexión y vuelve a intentarlo.">
          <AppButton label="Reintentar" tone="banu" onPress={retry}/>
        </ScreenState> : <>
          {failed.length>0 && <View style={styles.warning}>
            <Text accessibilityLiveRegion="polite" style={styles.label}>Faltan publicaciones de {failed.map(key=>sourceNames[key]).join(', ')}.</Text>
            {!pending&&<AppButton label="Reintentar fuentes" tone="banu" variant="secondary" onPress={retry}/>}
          </View>}
          {pending && <ScreenState kind="loading" title="Cargando publicaciones…"/>}
          {items.length>0 && <View style={styles.summary}>
            <Text accessibilityLiveRegion="polite" style={styles.label}>{rows.length} {rows.length===1?'publicación':'publicaciones'}</Text>
            <Text style={styles.note}>Los registros del catálogo y las fuentes versionadas son de demostración.</Text>
          </View>}
          {!pending && rows.length===0 && <ScreenState kind="empty" title="No hay publicaciones con estos filtros"
            body="Prueba con otra búsqueda o consulta todos los estados y categorías.">
            <AppButton label="Limpiar filtros" tone="banu" variant="secondary" onPress={clear}/>
          </ScreenState>}
          {rows.length>0 && <CardGrid testID="announcement-list" minItemWidth={335}>
            {rows.map(item=><AnnouncementCard key={item.key} item={item} onOpen={cover=>setSelected({item,cover})}/>)}
          </CardGrid>}
        </>}
        {isCcdAuthenticated() && <AppButton label="Comparación técnica OE2" variant="quiet" tone="banu"
          style={styles.technical} onPress={()=>router.push('/oe2-changes')}/>}
      </ContentColumn>
    </ScrollView>
    {selected && <NewsArticle {...selected} onClose={()=>setSelected(null)}/>}
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.banuCanvas},
  filters:{gap:spacing.md,padding:spacing.md,borderWidth:1,borderColor:colors.banuBorder,
    borderTopWidth:3,borderTopColor:colors.banuMagenta,borderRadius:radii.lg,backgroundColor:colors.surface},
  search:{gap:spacing.xs},
  input:{width:'100%'},
  label:{...textStyles.small,fontWeight:'700',color:colors.banuNavy},
  summary:{gap:spacing.xxs},
  note:{...textStyles.small,color:colors.banuMuted},
  warning:{gap:spacing.sm,padding:spacing.md,alignItems:'flex-start',backgroundColor:colors.warningSoft,borderRadius:radii.sm},
  technical:{alignSelf:'flex-start'},
});
