import {useState} from 'react';
import {View,Text,StyleSheet,Platform,useWindowDimensions} from 'react-native';
import {AppButton} from './app-button';
import {FIELD_LABELS,CATEGORY_LABELS,CHANGE_LABELS,formatChangeValue,formatChangeInstant,type Oe2Change} from '../api/oe2-changes';
import {SourceMeta,StatusBadge,SurfaceCard,secondaryStyles} from './secondary-ui';
import {colors,radii,spacing,textStyles} from '../ui/tokens';

export function Oe2ChangeCard({change,onCurrent}:{change:Oe2Change;onCurrent:()=>void}){
 const [expanded,setExpanded]=useState(false),origin=change.current_source??change.previous_source!;
 const width=useWindowDimensions().width;
 const sideBySide=Platform.OS==='web'&&width>=760;
 const tint=change.change_type==='removed'?colors.error:change.change_type==='created'?colors.success:colors.accent;
 const soft=change.change_type==='removed'?colors.errorSoft:change.change_type==='created'?colors.successSoft:colors.accentSoft;
 return <SurfaceCard>
  <View style={styles.header}><Text style={styles.label}>FICTICIO · {CATEGORY_LABELS[change.category]}</Text><StatusBadge tint={tint} soft={soft}>{CHANGE_LABELS[change.change_type]}</StatusBadge></View>
  <Text style={styles.title}>{change.title}</Text>
  {change.change_type==='removed'&&<Text style={styles.removed}>Ya no forma parte de la publicación actual. No se presenta como vigente.</Text>}
  <SourceMeta>Origen: {origin.source_id} · {origin.record_id}{'\n'}Versión: {origin.source_version}</SourceMeta>
  <AppButton label={expanded?'Ocultar detalle':'Ver Antes / Ahora'} variant="secondary" onPress={()=>setExpanded(v=>!v)}/>
  {expanded&&<View style={styles.detail}>
   {change.fields.map(f=><View key={f.field} testID="change-field" style={styles.field}><Text style={styles.label}>{FIELD_LABELS[f.field]}</Text><View style={[styles.values,sideBySide&&styles.valuesWide]}><View style={styles.before}><Text style={styles.valueLabel}>Antes</Text><Text selectable style={secondaryStyles.body}>Antes: {formatChangeValue(f.field,f.before)}</Text></View><View style={styles.after}><Text style={styles.valueLabel}>Ahora</Text><Text selectable style={secondaryStyles.body}>Ahora: {formatChangeValue(f.field,f.after)}</Text></View></View></View>)}
   {([['Antes',change.previous_source],['Ahora',change.current_source]]as const).map(([label,s])=>s&&<Text key={label} testID="source-meta" style={styles.meta}>{label} · Publicación de origen: {formatChangeInstant(s.source_published_at)}{'\n'}Observación OE2: {formatChangeInstant(s.observed_at)}</Text>)}
   <Text testID="source-meta" style={styles.meta}>La observación corresponde al snapshot usado; no acredita el primer instante de detección ni una causa del cambio.</Text>
  </View>}
  {change.current_available&&<AppButton label="Ver publicación actual" onPress={onCurrent}/>}
 </SurfaceCard>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},title:{...textStyles.heading,color:colors.ink},label:{...textStyles.small,fontWeight:'600',color:colors.textSecondary},removed:{...textStyles.small,color:colors.error},detail:{gap:spacing.md},field:{gap:spacing.xs,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm},meta:{...textStyles.small,color:colors.textSecondary},values:{gap:spacing.sm},valuesWide:{flexDirection:'row'},before:{flex:1,minWidth:0,padding:spacing.md,borderRadius:radii.sm,backgroundColor:colors.surfaceSoft},after:{flex:1,minWidth:0,padding:spacing.md,borderRadius:radii.sm,backgroundColor:colors.accentSoft},valueLabel:{...textStyles.eyebrow,color:colors.muted,marginBottom:spacing.xs}});
