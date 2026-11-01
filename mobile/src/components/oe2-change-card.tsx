import {useState} from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {AppButton} from './app-button';
import {FIELD_LABELS,CATEGORY_LABELS,CHANGE_LABELS,formatChangeValue,formatChangeInstant,type Oe2Change} from '../api/oe2-changes';
import {colors,radii,spacing} from '../ui/tokens';

export function Oe2ChangeCard({change,onCurrent}:{change:Oe2Change;onCurrent:()=>void}){
 const [expanded,setExpanded]=useState(false),origin=change.current_source??change.previous_source!;
 return <View style={styles.card}>
  <Text style={styles.label}>FICTICIO · {CATEGORY_LABELS[change.category]} · {CHANGE_LABELS[change.change_type]}</Text>
  <Text style={styles.title}>{change.title}</Text>
  {change.change_type==='removed'&&<Text style={styles.removed}>Ya no forma parte de la publicación actual. No se presenta como vigente.</Text>}
  <Text selectable>Origen: {origin.source_id} · {origin.record_id}{'\n'}Versión: {origin.source_version}</Text>
  <AppButton label={expanded?'Ocultar detalle':'Ver Antes / Ahora'} variant="secondary" onPress={()=>setExpanded(v=>!v)}/>
  {expanded&&<View style={styles.detail}>
   {change.fields.map(f=><View key={f.field} testID="change-field" style={styles.field}><Text style={styles.label}>{FIELD_LABELS[f.field]}</Text><Text selectable>Antes: {formatChangeValue(f.field,f.before)}</Text><Text selectable>Ahora: {formatChangeValue(f.field,f.after)}</Text></View>)}
   {([['Antes',change.previous_source],['Ahora',change.current_source]]as const).map(([label,s])=>s&&<Text key={label} testID="source-meta" style={styles.meta}>{label} · Publicación de origen: {formatChangeInstant(s.source_published_at)}{'\n'}Observación OE2: {formatChangeInstant(s.observed_at)}</Text>)}
   <Text testID="source-meta" style={styles.meta}>La observación corresponde al snapshot usado; no acredita el primer instante de detección ni una causa del cambio.</Text>
  </View>}
  {change.current_available&&<AppButton label="Ver publicación actual" onPress={onCurrent}/>}
 </View>;
}
const styles=StyleSheet.create({card:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface},title:{fontSize:18,lineHeight:26,fontWeight:'800',color:colors.ink},label:{fontWeight:'700',color:colors.ink},removed:{color:colors.error,lineHeight:22},detail:{gap:spacing.md},field:{gap:spacing.xs,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm},meta:{fontSize:12,lineHeight:19,color:colors.textSecondary}});
