import {useEffect,useState} from 'react';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {Platform,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getOe2Demo,formatOe2CivilDate,OE2_ERROR_TEXT,OE2_STATUS_TEXT,Oe2Error,type Oe2Category,type Oe2Response,type Oe2ErrorKind,type Programming,type Publication} from '@/api/oe2-demo';
import {ScreenHeader} from '@/components/screen-header';
import {AppButton} from '@/components/app-button';
import {CardGrid,ContentColumn,DemoNotice,FilterChip,ScreenState,SourceMeta,StatusBadge,SurfaceCard,secondaryStyles} from '@/components/secondary-ui';
import {colors,spacing,textStyles} from '@/ui/tokens';

const categories:[Oe2Category,string][]=[['programming','Programación'],['calls','Convocatorias'],['news','Novedades']];
const time=(value:string)=>new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export default function Oe2Screen(){
 const router=useRouter(),params=useLocalSearchParams<{category?:string;query?:string}>();
 const initialCategory:Oe2Category=params.category==='calls'||params.category==='news'?params.category:'programming';
 const initialQuery=typeof params.query==='string'&&[...params.query].length>=2&&[...params.query].length<=100?params.query:'';
 const [category,setCategory]=useState<Oe2Category>(initialCategory),[status,setStatus]=useState('all'),[search,setSearch]=useState(initialQuery),[query,setQuery]=useState(initialQuery),[revision,setRevision]=useState(0);
 const requestKey=JSON.stringify([category,query,status,revision]);
 const [result,setResult]=useState<{key:string;data?:Oe2Response;error?:Oe2ErrorKind}|null>(null);
 const data=result?.key===requestKey?result.data??null:null;
 const state=result?.key!==requestKey?'loading':data?'success':'error';
 const error=result?.error??'connection';
 useEffect(()=>{let active=true;void getOe2Demo(category,query,status).then(data=>{if(active)setResult({key:requestKey,data});}).catch(e=>{if(active)setResult({key:requestKey,error:e instanceof Oe2Error?e.kind:'connection'});});return()=>{active=false;};},[category,query,status,revision,requestKey]);
 const select=(value:Oe2Category)=>{if(value===category)return;setCategory(value);setStatus('all');setSearch('');setQuery('');};
 const rows:(Programming|Publication)[]=data?.programming??data?.announcements??[];
 const filters=category==='calls'?['all','upcoming','active','expired']:category==='news'?['all','upcoming','published']:[];
 const canSearch=[...search.trim()].length!==1;
 return <SafeAreaView style={styles.safe}>
  <ScreenHeader title="Publicaciones OE2" subtitle="Demostración ficticia independiente" onAction={()=>router.replace('/home')}/>
  <ScrollView testID="oe2-scroll" contentContainerStyle={secondaryStyles.scroll} keyboardShouldPersistTaps="handled"><ContentColumn>
   <DemoNotice>Datos ficticios publicados por el pipeline OE2. Esta sección no contiene documentos CCD ni sustituye el calendario, catálogo o noticias habituales.</DemoNotice>
   <AppButton label="Banu al día" variant="secondary" onPress={()=>router.push('/oe2-changes')}/>
   <View style={secondaryStyles.filters} accessibilityRole="radiogroup">{categories.map(([value,label])=><FilterChip key={value} label={label} accessibilityLabel={`OE2 ${label}`} selected={category===value} onPress={()=>select(value)}/>)}</View>
   <View style={styles.search}><View style={styles.searchField}><Text style={styles.fieldLabel}>Título o código</Text><TextInput accessibilityLabel="Buscar publicaciones OE2" placeholder="Buscar (mínimo 2 letras)" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={secondaryStyles.input} maxLength={100} onSubmitEditing={()=>{if(canSearch)setQuery(search.trim());}}/></View><AppButton label="Buscar" disabled={!canSearch} onPress={()=>setQuery(search.trim())}/></View>
   {filters.length>0&&<View style={secondaryStyles.filters} accessibilityRole="radiogroup">{filters.map(value=><FilterChip key={value} selected={status===value} label={value==='all'?'Todos':OE2_STATUS_TEXT[value]} accessibilityLabel={`OE2 filtro ${value==='all'?'Todos':OE2_STATUS_TEXT[value]}`} onPress={()=>{if(value!==status)setStatus(value);}}/>)}</View>}
   {state==='loading'&&<ScreenState kind="loading" title="Cargando publicaciones OE2..."/>}
   {state==='error'&&<ScreenState kind="error" title={error==='unavailable'?'Fuente de demostración no disponible':error==='session'?'Sesión expirada':'Error al consultar'} body={OE2_ERROR_TEXT[error]}><AppButton label={error==='session'?'Iniciar sesión':'Reintentar'} onPress={()=>error==='session'?router.replace('/login'):setRevision(r=>r+1)}/></ScreenState>}
   {state==='success'&&data&&<>
    <SourceMeta>Última release publicada: {data.release_id}{'\n'}Publicación: {time(data.published_at)}</SourceMeta>
    {!rows.length&&<ScreenState kind="empty" title="Sin registros" body="No hay publicaciones ficticias con estos filtros."><AppButton label="Limpiar filtros" onPress={()=>{setSearch('');setQuery('');setStatus('all');}}/></ScreenState>}
    <CardGrid testID="publication-list">{rows.map(row=><SurfaceCard key={row.id} testID="publication-card">
     <Text style={styles.tag}>FICTICIO · {category==='programming'?'Programación de grupo':category==='calls'?'Convocatoria':'Novedad'}</Text>
     <Text style={secondaryStyles.title}>{row.title}</Text><StatusBadge>{OE2_STATUS_TEXT[row.temporal_status]}</StatusBadge>
     {'course_code'in row?<><Text style={secondaryStyles.body}>Código: {row.course_code} · Periodo: {row.period}</Text><Text style={secondaryStyles.body}>Modalidad: {row.mode}</Text><Text style={secondaryStyles.body}>Inicio: {formatOe2CivilDate(row.start_date)} · Fin: {formatOe2CivilDate(row.end_date)}</Text></>:<><Text style={secondaryStyles.body}>{row.description}</Text><Text style={secondaryStyles.body}>{row.type==='calls'?'Apertura':'Publicada'}: {time(row.valid_from)}</Text>{row.valid_until!==null&&<Text style={secondaryStyles.body}>Cierre: {time(row.valid_until)}</Text>}{row.type==='calls'&&<Text style={secondaryStyles.body}>No determina elegibilidad individual.</Text>}</>}
     <View style={styles.provenance}><SourceMeta>Origen: {row.source.source_id} · {row.source.record_id}{'\n'}Versión: {row.source.source_version}{'\n'}Publicación de origen: {time(row.source.published_at)}</SourceMeta></View>
    </SurfaceCard>)}</CardGrid>
   </>}
   <AppButton label="Volver a Home" onPress={()=>router.replace('/home')}/>
  </ContentColumn></ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},search:{gap:spacing.sm,...(Platform.OS==='web'?{flexDirection:'row' as const,flexWrap:'wrap' as const,alignItems:'flex-end' as const}:{})},searchField:{flexGrow:1,minWidth:0,gap:spacing.xs},fieldLabel:{...textStyles.small,color:colors.textSecondary,fontWeight:'600'},tag:{...textStyles.eyebrow,color:colors.muted},provenance:{borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.sm}});
