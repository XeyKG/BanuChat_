import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'expo-router';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getCalendarEvents,type CalendarEvent,type CalendarEventType} from '@/api/calendar';
import {AppButton} from '@/components/app-button';
import {ContentColumn,DemoNotice,FilterChip,ScreenState,StatusBadge,secondaryStyles} from '@/components/secondary-ui';
import {ScreenHeader} from '@/components/screen-header';
import {MonthCalendar} from '@/components/month-calendar';
import {useSession} from '@/session/session-context';
import {CCD_AUXILIARY_NOTICE,isCcdAuthenticated,isCcdLocal} from '@/config/demo-mode';
import {colors,radii,spacing,textStyles} from '@/ui/tokens';
import {getBogotaCivilToday} from '@/utils/bogota-date';
import {calendarDays,eventDay,monthStart,moveMonth} from '@/utils/calendar-month';
type EventFilter='all'|CalendarEventType;
const filters:[EventFilter,string][]=[['all','Todas'],['course_session','Sesiones'],['announcement_deadline','Cierres'],['general','Otras actividades']];
const meta:Record<CalendarEventType,{label:string;tint:string;soft:string}>={course_session:{label:'Sesión de curso',tint:colors.banuMagenta,soft:colors.banuSoft},announcement_deadline:{label:'Cierre',tint:colors.amber,soft:colors.amberSoft},general:{label:'Actividad',tint:colors.violet,soft:colors.violetSoft}};
const time=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit'});
const selectedLabel=new Intl.DateTimeFormat('es-CO',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});
export default function CalendarScreen(){
 const router=useRouter(),{activeProfile}=useSession(),{width}=useWindowDimensions();
 const scroll=useRef<ScrollView>(null),agendaY=useRef(0);
 const today=getBogotaCivilToday(),[month,setMonth]=useState(()=>monthStart(today)),[selected,setSelected]=useState(today),[filter,setFilter]=useState<EventFilter>('all'),[retry,setRetry]=useState(0),[columnWidth,setColumnWidth]=useState(0);
 const cells=useMemo(()=>calendarDays(month),[month]);
 const key=JSON.stringify([activeProfile?.profile_key,month,filter,retry]);
 const [result,setResult]=useState<{key:string;events?:CalendarEvent[];error?:boolean}>();
 const state=result?.key!==key?'loading':result.error?'error':'success',events=result?.key===key?result.events??[]:[];
 useEffect(()=>{if(!activeProfile){router.replace(isCcdLocal()?'/profiles':'/login');return;}let live=true;void getCalendarEvents({dateFrom:cells[0],dateTo:cells[cells.length-1],eventTypes:filter==='all'?undefined:[filter]}).then(data=>{if(live)setResult({key,events:data.events});}).catch(()=>{if(live)setResult({key,error:true});});return()=>{live=false;};},[activeProfile,key,cells,filter,router]);
 const counts=useMemo(()=>{const map=new Map<string,number>();for(const event of events){const day=eventDay(event.starts_at);map.set(day,(map.get(day)??0)+1);}return map;},[events]);
 const daily=events.filter(event=>eventDay(event.starts_at)===selected);
 const choose=(day:string,showAgenda=false)=>{setSelected(day);if(monthStart(day)!==month)setMonth(monthStart(day));if(showAgenda&&columnWidth<850)requestAnimationFrame(()=>scroll.current?.scrollTo({y:agendaY.current,animated:false}));};
 const changeMonth=(offset:number)=>{const next=moveMonth(month,offset);setMonth(next);setSelected(next===monthStart(today)?today:next);};
 if(!activeProfile)return null;
 return <SafeAreaView testID="secondary-screen" style={styles.safe}>
  <ScreenHeader title="Calendario" subtitle="Tu agenda, día a día · hora de Bogotá" onAction={()=>router.replace('/home')}/>
  <ScrollView ref={scroll} contentContainerStyle={[secondaryStyles.scroll,{paddingHorizontal:width<360?4:16}]}>
   <ContentColumn testID="aux-content"><View onLayout={e=>setColumnWidth(e.nativeEvent.layout.width)} style={[styles.layout,columnWidth>=850&&styles.wide]}>
    <View style={[styles.month,columnWidth>=850&&styles.wideColumn]}><MonthCalendar month={month} selected={selected} today={today} counts={counts} loading={state!=='success'} onSelect={day=>choose(day,true)} onMonth={changeMonth} onToday={()=>choose(today)}/></View>
    <View testID="calendar-agenda" onLayout={e=>{agendaY.current=e.nativeEvent.layout.y;}} style={[styles.agenda,columnWidth>=850&&styles.wideColumn]}>
     <Text accessibilityRole="header" style={styles.selectedDate}>{selectedLabel.format(new Date(selected+'T12:00:00Z'))}</Text>
     {columnWidth<850&&<AppButton tone="banu" label="Volver al mes" variant="quiet" onPress={()=>scroll.current?.scrollTo({y:0,animated:false})}/>}
     <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de actividad" style={secondaryStyles.filters}>{filters.map(([value,label])=><FilterChip key={value} label={label} accessibilityLabel={'Calendario: '+label} selected={filter===value} onPress={()=>setFilter(value)}/>)}</View>
     {state==='loading'&&<ScreenState kind="loading" title="Cargando actividades…"/>}
     {state==='error'&&<ScreenState kind="error" title="No fue posible cargar las actividades" body="Puedes cambiar de mes o volver a intentarlo."><AppButton tone="banu" label="Reintentar calendario" onPress={()=>setRetry(r=>r+1)}/></ScreenState>}
     {state==='success'&&!daily.length&&<ScreenState kind="empty" title="Un día sin actividades" body="Selecciona una fecha marcada para ver lo que hay programado."/>}
     {state==='success'&&daily.map(event=><View testID="calendar-event" key={event.event_key} style={styles.event}>
      <View style={styles.eventHeading}><StatusBadge tint={meta[event.event_type].tint} soft={meta[event.event_type].soft}>{meta[event.event_type].label}</StatusBadge><Text style={styles.time}>{time.format(new Date(event.starts_at))}{event.ends_at?' – '+time.format(new Date(event.ends_at)):''}</Text></View>
      <Text selectable style={styles.eventTitle}>{event.title}</Text><Text selectable style={styles.description}>{event.description}</Text>
     </View>)}
    </View>
   </View>{isCcdAuthenticated()&&<DemoNotice>{CCD_AUXILIARY_NOTICE}</DemoNotice>}</ContentColumn>
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.banuCanvas},layout:{gap:spacing.lg,minWidth:0},wide:{flexDirection:'row',alignItems:'flex-start'},month:{minWidth:0},agenda:{minWidth:0,gap:spacing.md},wideColumn:{flex:1},selectedDate:{...textStyles.heading,color:colors.banuInk},event:{padding:spacing.md,gap:spacing.sm,borderRadius:radii.lg,borderWidth:1,borderColor:colors.banuBorder,backgroundColor:colors.surface},eventHeading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:spacing.xs},time:{...textStyles.small,color:colors.banuMuted},eventTitle:{...textStyles.body,color:colors.banuInk,fontWeight:'700'},description:{...textStyles.small,color:colors.banuSecondary}});
