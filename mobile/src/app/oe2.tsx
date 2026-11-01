import {useEffect,useState} from 'react';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {ActivityIndicator,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getOe2Demo,formatOe2CivilDate,OE2_ERROR_TEXT,OE2_STATUS_TEXT,Oe2Error,type Oe2Category,type Oe2Response,type Oe2ErrorKind,type Programming,type Publication} from '@/api/oe2-demo';
import {ScreenHeader} from '@/components/screen-header';
import {AppButton} from '@/components/app-button';
import {colors,layout,radii,spacing,typography} from '@/ui/tokens';

const categories:[Oe2Category,string][]=[['programming','Programación'],['calls','Convocatorias'],['news','Novedades']];
const time=(value:string)=>new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export default function Oe2Screen(){
 const router=useRouter(),params=useLocalSearchParams<{category?:string;query?:string}>();
 const initialCategory:Oe2Category=params.category==='calls'||params.category==='news'?params.category:'programming';
 const initialQuery=typeof params.query==='string'&&[...params.query].length>=2&&[...params.query].length<=100?params.query:'';
 const [category,setCategory]=useState<Oe2Category>(initialCategory),[status,setStatus]=useState('all'),[search,setSearch]=useState(initialQuery),[query,setQuery]=useState(initialQuery),[revision,setRevision]=useState(0);
 const [state,setState]=useState<'loading'|'success'|'error'>('loading'),[error,setError]=useState<Oe2ErrorKind>('connection'),[data,setData]=useState<Oe2Response|null>(null);
 useEffect(()=>{let active=true;setState('loading');setData(null);void getOe2Demo(category,query,status).then(r=>{if(active){setData(r);setState('success');}}).catch(e=>{if(active){setError(e instanceof Oe2Error?e.kind:'connection');setState('error');}});return()=>{active=false;};},[category,query,status,revision]);
 const select=(value:Oe2Category)=>{if(value===category)return;setState('loading');setCategory(value);setStatus('all');setSearch('');setQuery('');};
 const rows:(Programming|Publication)[]=data?.programming??data?.announcements??[];
 const filters=category==='calls'?['all','upcoming','active','expired']:category==='news'?['all','upcoming','published']:[];
 const canSearch=[...search.trim()].length!==1;
 return <SafeAreaView style={styles.safe}>
  <ScreenHeader title="Publicaciones OE2" subtitle="Demostración ficticia independiente" onAction={()=>router.replace('/home')}/>
  <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
   <Text style={styles.notice}>Datos ficticios publicados por el pipeline OE2. Esta sección no contiene documentos CCD ni sustituye el calendario, catálogo o noticias habituales.</Text>
   <AppButton label="Banu al día" variant="secondary" onPress={()=>router.push('/oe2-changes')}/>
   <View style={styles.row} accessibilityRole="radiogroup">{categories.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:category===value}} accessibilityLabel={`OE2 ${label}`} onPress={()=>select(value)} style={[styles.chip,category===value&&styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>)}</View>
   <View style={styles.search}><TextInput accessibilityLabel="Buscar publicaciones OE2" placeholder="Buscar título o código (mínimo 2 letras)" value={search} onChangeText={setSearch} style={styles.input} maxLength={100} onSubmitEditing={()=>{if(canSearch)setQuery(search.trim());}}/><AppButton label="Buscar" disabled={!canSearch} onPress={()=>setQuery(search.trim())}/></View>
   {filters.length>0&&<View style={styles.row} accessibilityRole="radiogroup">{filters.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:status===value}} accessibilityLabel={`OE2 filtro ${value==='all'?'Todos':OE2_STATUS_TEXT[value]}`} style={[styles.chip,status===value&&styles.selected]} onPress={()=>{if(value!==status){setState('loading');setStatus(value);}}}><Text style={styles.label}>{value==='all'?'Todos':OE2_STATUS_TEXT[value]}</Text></Pressable>)}</View>}
   {state==='loading'&&<View style={styles.card} accessibilityLiveRegion="polite"><ActivityIndicator accessibilityLabel="Cargando publicaciones OE2"/><Text>Cargando publicaciones OE2...</Text></View>}
   {state==='error'&&<View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.title}>{error==='unavailable'?'Fuente de demostración no disponible':error==='session'?'Sesión expirada':'Error al consultar'}</Text><Text>{OE2_ERROR_TEXT[error]}</Text><AppButton label={error==='session'?'Iniciar sesión':'Reintentar'} onPress={()=>error==='session'?router.replace('/login'):setRevision(r=>r+1)}/></View>}
   {state==='success'&&data&&<>
    <Text selectable style={styles.meta}>Última release publicada: {data.release_id}{'\n'}Publicación: {time(data.published_at)}</Text>
    {!rows.length&&<View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.title}>Sin registros</Text><Text>No hay publicaciones ficticias con estos filtros.</Text><AppButton label="Limpiar filtros" onPress={()=>{setSearch('');setQuery('');setStatus('all');}}/></View>}
    {rows.map(row=><View key={row.id} style={styles.card}>
     <Text style={styles.tag}>FICTICIO · {category==='programming'?'Programación de grupo':category==='calls'?'Convocatoria':'Novedad'}</Text>
     <Text style={styles.title}>{row.title}</Text><Text style={styles.status}>{OE2_STATUS_TEXT[row.temporal_status]}</Text>
     {'course_code'in row?<><Text>Código: {row.course_code} · Periodo: {row.period}</Text><Text>Modalidad: {row.mode}</Text><Text>Inicio: {formatOe2CivilDate(row.start_date)} · Fin: {formatOe2CivilDate(row.end_date)}</Text></>:<><Text>{row.description}</Text><Text>{row.type==='calls'?'Apertura':'Publicada'}: {time(row.valid_from)}</Text>{row.valid_until!==null&&<Text>Cierre: {time(row.valid_until)}</Text>}{row.type==='calls'&&<Text>No determina elegibilidad individual.</Text>}</>}
     <Text selectable style={styles.meta}>Origen: {row.source.source_id} · {row.source.record_id}{'\n'}Versión: {row.source.source_version}{'\n'}Publicación de origen: {time(row.source.published_at)}</Text>
    </View>)}
   </>}
   <AppButton label="Volver a Home" onPress={()=>router.replace('/home')}/>
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},container:{padding:spacing.lg,gap:spacing.md,maxWidth:Platform.OS==='web'?960:layout.maxContentWidth,width:'100%',alignSelf:'center'},notice:{backgroundColor:colors.warningSoft,padding:spacing.md,borderRadius:radii.md,color:colors.ink,lineHeight:22},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},chip:{minHeight:layout.minTouchTarget,justifyContent:'center',padding:spacing.sm,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.md,backgroundColor:colors.surface},selected:{backgroundColor:colors.accentSoft,borderColor:colors.accent},label:{fontWeight:'700',color:colors.ink},search:{gap:spacing.sm,...(Platform.OS==='web'?{flexDirection:'row' as const,flexWrap:'wrap' as const}:{})},input:{...(Platform.OS==='web'?{flexGrow:1,minWidth:180}:{}),minHeight:layout.minTouchTarget,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.md,padding:spacing.sm,backgroundColor:colors.surface},card:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface},title:{fontSize:typography.body,fontWeight:'800',color:colors.ink,lineHeight:24},tag:{fontSize:typography.caption,color:colors.textSecondary,fontWeight:'700'},status:{fontWeight:'700',color:colors.ink},meta:{fontSize:typography.caption,color:colors.textSecondary,lineHeight:20}});
