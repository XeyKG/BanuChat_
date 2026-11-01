import {useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {getCalendarEvents,type CalendarEvent} from '@/api/calendar';
import {addCivilDays,getBogotaCivilToday} from '@/utils/bogota-date';
import {colors,layout,radii,shadows,spacing} from '@/ui/tokens';
import {ChevronGlyph} from '@/ui/icons';

const day=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'2-digit'});
const month=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',month:'short'});
const time=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit'});

/** Preview of the existing calendar service, never the illustrative HTML dates. */
export function HomeAgenda({profileKey}: {profileKey:string}) {
  const router=useRouter();
  const [result,setResult]=useState<{key:string;state:'ready'|'error';events:CalendarEvent[]}|null>(null);
  useEffect(()=>{let active=true;const dateFrom=getBogotaCivilToday();void getCalendarEvents({dateFrom,dateTo:addCivilDays(dateFrom,29)}).then(response=>{if(active)setResult({key:profileKey,state:'ready',events:response.events.slice().sort((a,b)=>a.starts_at.localeCompare(b.starts_at)).slice(0,2)});}).catch(()=>{if(active)setResult({key:profileKey,state:'error',events:[]});});return()=>{active=false;};},[profileKey]);
  const current=result?.key===profileKey?result:null;
  return <View testID="home-agenda" style={styles.panel}><Text accessibilityRole="header" style={styles.title}>En tu agenda</Text>
    {!current?<View accessibilityLiveRegion="polite" style={styles.state}><ActivityIndicator accessibilityLabel="Cargando agenda" color={colors.banuMagenta}/><Text style={styles.copy}>Consultando tus actividades…</Text></View>:current.state==='error'?<Text accessibilityRole="alert" style={styles.copy}>No pudimos consultar la agenda. Puedes revisarla en Calendario.</Text>:current.events.length===0?<Text style={styles.copy}>No hay actividades en los próximos 30 días.</Text>:current.events.map(event=><View key={event.event_key} style={styles.event}><View style={styles.date}><Text style={styles.day}>{day.format(new Date(event.starts_at))}</Text><Text style={styles.month}>{month.format(new Date(event.starts_at)).replace('.','')}</Text></View><View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.copy}>{time.format(new Date(event.starts_at))}</Text></View></View>)}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/calendar')} style={styles.link}><Text style={styles.linkText}>Ver mi calendario</Text><ChevronGlyph size={14} color={colors.banuInk}/></Pressable><Text style={styles.foot}>Actividades auxiliares ficticias · no es una agenda institucional.</Text>
  </View>;
}
const styles=StyleSheet.create({panel:{padding:spacing.xl,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface,gap:spacing.lg,...shadows.banuPanel},title:{fontSize:16,fontWeight:'600',color:colors.banuInk},copy:{fontSize:13,lineHeight:21,color:colors.banuMuted},state:{gap:spacing.sm},event:{flexDirection:'row',gap:spacing.sm},date:{width:44,alignItems:'center',borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.sm,paddingVertical:6,backgroundColor:colors.banuCanvas,...shadows.banuInset},day:{fontSize:20,fontWeight:'600',color:colors.banuInk},month:{fontSize:10,textTransform:'uppercase',color:colors.banuMuted},eventCopy:{flex:1,minWidth:0,gap:spacing.xxs},eventTitle:{fontSize:13,lineHeight:20,fontWeight:'600',color:colors.banuInk},link:{minHeight:layout.minTouchTarget,marginTop:'auto',flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.xs},linkText:{fontSize:13,fontWeight:'600',color:colors.banuInk},foot:{fontSize:11,lineHeight:17,color:colors.banuMuted}});
