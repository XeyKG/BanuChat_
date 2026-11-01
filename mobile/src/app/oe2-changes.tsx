import {useEffect,useState} from 'react';
import {useRouter} from 'expo-router';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getOe2Changes,CATEGORY_LABELS,CHANGE_LABELS,formatChangeInstant,type ChangeCategory,type ChangeType,type ChangesResponse} from '@/api/oe2-changes';
import {Oe2Error,OE2_ERROR_TEXT,type Oe2ErrorKind} from '@/api/oe2-demo';
import {Oe2ChangeCard} from '@/components/oe2-change-card';
import {AppButton} from '@/components/app-button';
import {ScreenHeader} from '@/components/screen-header';
import {ContentColumn,DemoNotice,FilterChip,ScreenState,SourceMeta,SurfaceCard,secondaryStyles} from '@/components/secondary-ui';
import {colors,spacing,textStyles} from '@/ui/tokens';

export default function Oe2ChangesScreen(){
 const router=useRouter(),[category,setCategory]=useState<ChangeCategory|undefined>(),[type,setType]=useState<ChangeType|undefined>(),[retry,setRetry]=useState(0);
 const requestKey=JSON.stringify([category,type,retry]);
 const [result,setResult]=useState<{key:string;data?:ChangesResponse;error?:Oe2ErrorKind}|null>(null);
 const data=result?.key===requestKey?result.data??null:null;
 const state=result?.key!==requestKey?'loading':data?'success':'error';
 const error=result?.error??'connection';
 useEffect(()=>{let active=true;void getOe2Changes(category,type).then(data=>{if(active)setResult({key:requestKey,data});}).catch(e=>{if(active)setResult({key:requestKey,error:e instanceof Oe2Error?e.kind:'connection'});});return()=>{active=false;};},[category,type,retry,requestKey]);
 const back=()=>router.canGoBack()?router.back():router.replace('/oe2');
 const filter=(values:Record<string,string>,selected:string|undefined,onSelect:(value:string|undefined)=>void,label:string)=><View accessibilityRole="radiogroup" accessibilityLabel={label} style={secondaryStyles.filters}>{[['all','Todos'],...Object.entries(values)].map(([value,title])=><FilterChip key={value} label={title} accessibilityLabel={`${label}: ${title}`} selected={value===(selected??'all')} onPress={()=>onSelect(value==='all'?undefined:value)}/>)}</View>;
 return <SafeAreaView style={styles.safe}>
  <ScreenHeader title="Banu al día" subtitle="Cambios entre publicaciones OE2" onAction={()=>router.replace('/home')}/>
  <ScrollView testID="oe2-scroll" contentContainerStyle={secondaryStyles.scroll}><ContentColumn style={{gap:spacing.sm}}>
   <DemoNotice>Comparación de datos ficticios aprobados. No son documentos CCD ni notificaciones personales de novedades no leídas.</DemoNotice>
   <AppButton label="Volver a Publicaciones OE2" variant="secondary" style={{alignSelf:'flex-start'}} onPress={back}/>
   {filter(CATEGORY_LABELS,category,v=>setCategory(v as ChangeCategory|undefined),'Información')}
   {filter(CHANGE_LABELS,type,v=>setType(v as ChangeType|undefined),'Cambio')}
   {state==='loading'&&<ScreenState kind="loading" loadingLabel="Comparando publicaciones OE2" title="Comparando publicaciones..."/>}
   {state==='error'&&<ScreenState kind="error" title={error==='session'?'Sesión expirada':'No se pudo comparar la fuente'} body={OE2_ERROR_TEXT[error]}><AppButton label={error==='session'?'Iniciar sesión':'Reintentar'} onPress={()=>error==='session'?router.replace('/login'):setRetry(r=>r+1)}/></ScreenState>}
   {state==='success'&&data&&<>
    {data.comparison_status==='no_previous'?<ScreenState kind="empty" title="Sin versión anterior comparable" body="Esta publicación no se presenta como una lista de altas."/>:<>
     <SurfaceCard style={{padding:spacing.md}}><Text style={secondaryStyles.title}>Resumen de la comparación</Text><Text style={secondaryStyles.body}>Publicación actual: {formatChangeInstant(data.current_published_at)}</Text><View style={styles.summary}>{([['created','Añadidos'],['modified','Modificados'],['removed','Retirados'],['unchanged','Sin cambios']] as const).map(([key,label])=><View key={key} accessible accessibilityLabel={`${label}: ${data.counts[key]}`} style={styles.stat}><Text style={styles.statValue}>{data.counts[key]}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View><SourceMeta>El resumen corresponde a las tres categorías; los filtros limitan las tarjetas.</SourceMeta></SurfaceCard>
     {!data.changes.length&&<ScreenState kind="empty" title={`Sin cambios${data.counts.created+data.counts.modified+data.counts.removed>0?' con estos filtros':''}`} body="No hay registros afectados para mostrar."/>}
     {data.changes.map(c=><Oe2ChangeCard key={data.current_release_id+c.id} change={c} onCurrent={()=>router.push({pathname:'/oe2',params:{category:c.category,query:[...c.title].slice(0,100).join('')}})}/>)}
     {data.has_more&&<Text>Mostrando {data.changes.length} de {data.matched_count}. Refina los filtros para consultar otros cambios.</Text>}
    </>}
    <SurfaceCard><Text style={secondaryStyles.title}>Publicaciones comparadas</Text><SourceMeta>Publicación actual en BanuChat: {formatChangeInstant(data.current_published_at)}{'\n'}{data.current_release_id}{data.previous_published_at&&`\nPublicación anterior en BanuChat: ${formatChangeInstant(data.previous_published_at)}\n${data.previous_release_id}`}</SourceMeta></SurfaceCard>
   </>}
   <AppButton label="Volver a Home" onPress={()=>router.replace('/home')}/>
  </ContentColumn></ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},summary:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs,paddingVertical:spacing.xs},stat:{gap:spacing.xxs,minWidth:0,flexBasis:'20%',flexGrow:1},statLabel:{...textStyles.eyebrow,fontSize:12,letterSpacing:0,textTransform:'none',fontWeight:'400',color:colors.textSecondary},statValue:{...textStyles.heading,color:colors.brand,fontVariant:['tabular-nums']}});
