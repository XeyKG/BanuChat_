import {useEffect,useState} from 'react';
import {useRouter} from 'expo-router';
import {ActivityIndicator,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getOe2Changes,CATEGORY_LABELS,CHANGE_LABELS,formatChangeInstant,type ChangeCategory,type ChangeType,type ChangesResponse} from '@/api/oe2-changes';
import {Oe2Error,OE2_ERROR_TEXT,type Oe2ErrorKind} from '@/api/oe2-demo';
import {Oe2ChangeCard} from '@/components/oe2-change-card';
import {AppButton} from '@/components/app-button';
import {ScreenHeader} from '@/components/screen-header';
import {colors,layout,radii,spacing} from '@/ui/tokens';

export default function Oe2ChangesScreen(){
 const router=useRouter(),[category,setCategory]=useState<ChangeCategory|undefined>(),[type,setType]=useState<ChangeType|undefined>(),[retry,setRetry]=useState(0);
 const [state,setState]=useState<'loading'|'success'|'error'>('loading'),[data,setData]=useState<ChangesResponse|null>(null),[error,setError]=useState<Oe2ErrorKind>('connection');
 useEffect(()=>{let active=true;setState('loading');setData(null);void getOe2Changes(category,type).then(r=>{if(active){setData(r);setState('success');}}).catch(e=>{if(active){setError(e instanceof Oe2Error?e.kind:'connection');setState('error');}});return()=>{active=false;};},[category,type,retry]);
 const back=()=>router.canGoBack()?router.back():router.replace('/oe2');
 const filter=(values:Record<string,string>,selected:string|undefined,onSelect:(value:string|undefined)=>void,label:string)=><View accessibilityRole="radiogroup" style={styles.filters}>{[['all','Todos'],...Object.entries(values)].map(([value,title])=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${label}: ${title}`} accessibilityState={{checked:value===(selected??'all')}} style={[styles.chip,value===(selected??'all')&&styles.selected]} onPress={()=>onSelect(value==='all'?undefined:value)}><Text>{title}</Text></Pressable>)}</View>;
 return <SafeAreaView style={styles.safe}>
  <ScreenHeader title="Banu al día" subtitle="Cambios entre publicaciones OE2" onAction={()=>router.replace('/home')}/>
  <ScrollView contentContainerStyle={styles.container}>
   <Text style={styles.notice}>Comparación de datos ficticios aprobados. No son documentos CCD ni notificaciones personales de novedades no leídas.</Text>
   <AppButton label="Volver a Publicaciones OE2" variant="secondary" onPress={back}/>
   {filter(CATEGORY_LABELS,category,v=>setCategory(v as ChangeCategory|undefined),'Información')}
   {filter(CHANGE_LABELS,type,v=>setType(v as ChangeType|undefined),'Cambio')}
   {state==='loading'&&<View style={styles.card} accessibilityLiveRegion="polite"><ActivityIndicator accessibilityLabel="Comparando publicaciones OE2"/><Text>Comparando publicaciones...</Text></View>}
   {state==='error'&&<View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.title}>{error==='session'?'Sesión expirada':'No se pudo comparar la fuente'}</Text><Text>{OE2_ERROR_TEXT[error]}</Text><AppButton label={error==='session'?'Iniciar sesión':'Reintentar'} onPress={()=>error==='session'?router.replace('/login'):setRetry(r=>r+1)}/></View>}
   {state==='success'&&data&&<>
    <Text selectable style={styles.meta}>Publicación actual en BanuChat: {formatChangeInstant(data.current_published_at)}{'\n'}{data.current_release_id}{data.previous_published_at&&`\nPublicación anterior en BanuChat: ${formatChangeInstant(data.previous_published_at)}\n${data.previous_release_id}`}</Text>
    {data.comparison_status==='no_previous'?<View style={styles.card}><Text style={styles.title}>Sin versión anterior comparable</Text><Text>Esta publicación no se presenta como una lista de altas.</Text></View>:<>
     <View style={styles.card}><Text style={styles.title}>Resumen de la comparación</Text><Text>Añadidos: {data.counts.created} · Modificados: {data.counts.modified} · Retirados: {data.counts.removed}</Text><Text>Sin cambios: {data.counts.unchanged}</Text><Text style={styles.meta}>El resumen corresponde a las tres categorías; los filtros limitan las tarjetas.</Text></View>
     {!data.changes.length&&<View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.title}>Sin cambios{data.counts.created+data.counts.modified+data.counts.removed>0?' con estos filtros':''}</Text><Text>No hay registros afectados para mostrar.</Text></View>}
     {data.changes.map(c=><Oe2ChangeCard key={data.current_release_id+c.id} change={c} onCurrent={()=>router.push({pathname:'/oe2',params:{category:c.category,query:[...c.title].slice(0,100).join('')}})}/>)}
     {data.has_more&&<Text>Mostrando {data.changes.length} de {data.matched_count}. Refina los filtros para consultar otros cambios.</Text>}
    </>}
   </>}
   <AppButton label="Volver a Home" onPress={()=>router.replace('/home')}/>
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},container:{padding:spacing.lg,gap:spacing.md,maxWidth:Platform.OS==='web'?960:layout.maxContentWidth,width:'100%',alignSelf:'center'},notice:{padding:spacing.md,backgroundColor:colors.warningSoft,borderRadius:radii.md,lineHeight:22},filters:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},chip:{minHeight:layout.minTouchTarget,justifyContent:'center',padding:spacing.sm,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.md,backgroundColor:colors.surface},selected:{borderColor:colors.accent,backgroundColor:colors.accentSoft},card:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface},title:{fontSize:18,fontWeight:'800',color:colors.ink},meta:{fontSize:12,lineHeight:19,color:colors.textSecondary}});
