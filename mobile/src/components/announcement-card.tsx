import {StyleSheet,Text,View} from 'react-native';
import type {Announcement,AnnouncementStatus} from '@/api/announcements';
import {StatusBadge} from '@/components/secondary-ui';
import {EditorialAttachment} from '@/components/editorial-attachment';
import {EditorialImage} from '@/components/editorial-image';
import {colors,radii,spacing,textStyles} from '@/ui/tokens';
const status:Record<AnnouncementStatus,{label:string;tint:string;soft:string}>={active:{label:'Vigente',tint:colors.success,soft:colors.successSoft},upcoming:{label:'Por venir',tint:colors.warning,soft:colors.warningSoft},expired:{label:'En el archivo',tint:colors.banuMuted,soft:colors.banuBorder}};
const date=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short',year:'numeric'});
export function AnnouncementCard({announcement}:{announcement:Announcement}){
 const meta=status[announcement.temporal_status];
 return <View testID="announcement-card" style={styles.card}>
  <View style={styles.top}><Text style={styles.date}>{date.format(new Date(announcement.valid_from))}</Text><StatusBadge tint={meta.tint} soft={meta.soft}>{meta.label}</StatusBadge></View>
  <Text selectable accessibilityRole="header" style={styles.title}>{announcement.title}</Text>
  {announcement.temporal_status==='active'&&<EditorialImage itemKey={announcement.announcement_key} label={'Imagen de '+announcement.title}/>}
  <Text selectable testID="announcement-body" style={styles.body}>{announcement.description}</Text>
  {announcement.temporal_status==='active'&&<EditorialAttachment announcementKey={announcement.announcement_key}/>}
  {announcement.valid_until!==null&&<Text style={styles.deadline}>Hasta el {date.format(new Date(announcement.valid_until))}</Text>}
 </View>;
}
const styles=StyleSheet.create({card:{flexGrow:1,minWidth:0,padding:spacing.lg,gap:spacing.md,borderRadius:radii.lg,borderWidth:1,borderColor:colors.banuBorder,backgroundColor:colors.surface},top:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:spacing.xs},date:{...textStyles.small,color:colors.banuMuted},title:{fontSize:21,lineHeight:29,fontWeight:'700',letterSpacing:-0.4,color:colors.banuInk},body:{...textStyles.body,color:colors.banuSecondary},deadline:{...textStyles.small,color:colors.banuMuted}});
