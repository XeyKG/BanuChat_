import {useEffect,useState} from 'react';
import {useRouter} from 'expo-router';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getAnnouncements,type Announcement,type AnnouncementFilter} from '@/api/announcements';
import {AppButton} from '@/components/app-button';
import {AnnouncementCard} from '@/components/announcement-card';
import {CardGrid,ContentColumn,DemoNotice,FilterChip,ScreenState,secondaryStyles} from '@/components/secondary-ui';
import {ScreenHeader} from '@/components/screen-header';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated} from '@/config/demo-mode';
import {colors,spacing,textStyles} from '@/ui/tokens';
const filters:[AnnouncementFilter,string][]=[['active','Vigentes'],['upcoming','Por venir'],['expired','Archivo'],['all','Todas']];
export default function AnnouncementsScreen(){
 const router=useRouter(),[filter,setFilter]=useState<AnnouncementFilter>('active'),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[retry,setRetry]=useState(0);
 const key=JSON.stringify([filter,query,retry]);const [result,setResult]=useState<{key:string;rows?:Announcement[];error?:boolean}>();
 const state=result?.key!==key?'loading':result.error?'error':'success',rows=result?.key===key?result.rows??[]:[];
 useEffect(()=>{let live=true;void getAnnouncements({temporalStatus:filter,query}).then(data=>{if(live)setResult({key,rows:[...data.announcements].sort((a,b)=>Date.parse(b.valid_from)-Date.parse(a.valid_from))});}).catch(()=>{if(live)setResult({key,error:true});});return()=>{live=false;};},[key,filter,query]);
 const canSearch=[...search.trim()].length!==1;
 const applySearch=()=>{if(canSearch){setQuery(search.trim());setRetry(r=>r+1);}};
 return <SafeAreaView testID="secondary-screen" style={styles.safe}>
  <ScreenHeader title="Noticias" subtitle="Noticias y convocatorias, en un solo lugar" onAction={()=>router.replace('/home')}/>
  <ScrollView contentContainerStyle={secondaryStyles.scroll} keyboardShouldPersistTaps="handled"><ContentColumn testID="aux-content">
   <View style={styles.controls}><View style={styles.searchField}><Text style={styles.label}>¿Qué te interesa?</Text><TextInput accessibilityLabel="Buscar en Noticias" placeholder="Busca un tema o una convocatoria" value={search} onChangeText={setSearch} onSubmitEditing={applySearch} maxLength={100} style={secondaryStyles.input}/></View><AppButton tone="banu" label="Buscar novedades" disabled={!canSearch} onPress={applySearch}/></View>
   {query.length>0&&<AppButton tone="banu" label="Limpiar búsqueda" variant="quiet" onPress={()=>{setSearch('');setQuery('');}}/>}
   {!canSearch&&<Text accessibilityRole="alert" style={styles.copy}>Escribe al menos dos letras o deja el campo vacío para ver todo.</Text>}
   <View accessibilityRole="radiogroup" accessibilityLabel="Publicaciones de Noticias" style={secondaryStyles.filters}>{filters.map(([value,label])=><FilterChip key={value} label={label} accessibilityLabel={'Noticias: '+label} selected={filter===value} onPress={()=>setFilter(value)}/>)}</View>
   {isCcdAuthenticated()&&<DemoNotice>{CCD_AUXILIARY_NOTICE}</DemoNotice>}
   {state==='loading'&&<ScreenState kind="loading" title="Buscando novedades…"/>}
   {state==='error'&&<ScreenState kind="error" title="No pudimos cargar las novedades" body="Comprueba la conexión y vuelve a intentarlo."><AppButton tone="banu" label="Reintentar novedades" onPress={()=>setRetry(r=>r+1)}/></ScreenState>}
   {state==='success'&&!rows.length&&<ScreenState kind="empty" title="Sin publicaciones por ahora" body="Prueba con otra búsqueda o consulta todas las publicaciones."><AppButton tone="banu" label="Ver todas las publicaciones" variant="secondary" onPress={()=>{setSearch('');setQuery('');setFilter('all');}}/></ScreenState>}
   {state==='success'&&rows.length>0&&<CardGrid testID="announcement-list">{rows.map(row=><AnnouncementCard key={row.announcement_key} announcement={row}/>)}</CardGrid>}
  </ContentColumn></ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.banuCanvas},intro:{gap:spacing.xs,paddingVertical:spacing.xs},eyebrow:{...textStyles.eyebrow,color:colors.banuMagenta},headline:{fontSize:28,lineHeight:36,letterSpacing:-0.7,fontWeight:'700',color:colors.banuInk},copy:{...textStyles.body,color:colors.banuSecondary},controls:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:spacing.sm},searchField:{flexGrow:1,flexBasis:250,minWidth:0,gap:spacing.xs},label:{...textStyles.small,color:colors.banuSecondary,fontWeight:'600'}});
