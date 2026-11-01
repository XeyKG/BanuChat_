import {Children, useState, type ReactNode} from 'react';
import {ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {colors, layout, radii, spacing, textStyles, typography} from '@/ui/tokens';

/** Shared secondary-screen surfaces. Layout stays in RN, including on web. */
export function ContentColumn({children, testID, reading=false, style}: {children:ReactNode;testID?:string;reading?:boolean;style?:StyleProp<ViewStyle>}) {
  return <View testID={testID} style={[styles.column,reading&&styles.reading,style]}>{children}</View>;
}

export function SurfaceCard({children, style, testID}: {children:ReactNode;style?:StyleProp<ViewStyle>;testID?:string}) {
  return <View testID={testID} style={[styles.card,style]}>{children}</View>;
}

export function DemoNotice({children}: {children:ReactNode}) {
  return <Text testID="demo-notice" style={styles.notice}>{children}</Text>;
}

export function SourceMeta({children}: {children:ReactNode}) {
  return <Text selectable testID="source-meta" style={styles.meta}>{children}</Text>;
}

export function FilterChip({label, accessibilityLabel, selected, onPress}: {label:string;accessibilityLabel?:string;selected:boolean;onPress:()=>void}) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={accessibilityLabel??label} accessibilityState={{checked:selected}} onPress={onPress} style={({pressed})=>[styles.chip,selected&&styles.selected,pressed&&styles.pressed]}>
    <Text style={[styles.chipLabel,selected&&styles.selectedLabel]}>{label}</Text>
  </Pressable>;
}

export function StatusBadge({children,tint=colors.accent,soft=colors.accentSoft}: {children:ReactNode;tint?:string;soft?:string}) {
  return <View style={[styles.badge,{backgroundColor:soft}]}><Text style={[styles.badgeLabel,{color:tint}]}>{children}</Text></View>;
}

export function ScreenState({kind,title,body,children,loadingLabel}: {kind:'loading'|'error'|'empty';title:string;body?:string;children?:ReactNode;loadingLabel?:string}) {
  return <View testID={`screen-state-${kind}`} accessibilityRole={kind==='error'?'alert':undefined} accessibilityLiveRegion="polite" style={[styles.state,kind==='error'&&styles.error]}>
    {kind==='loading'&&<ActivityIndicator color={colors.accent} accessibilityLabel={loadingLabel??title.replace(/\.\.\.$/,'')}/>}
    <Text style={styles.stateTitle}>{title}</Text>
    {body!==undefined&&<Text selectable style={styles.stateBody}>{body}</Text>}
    {children}
  </View>;
}

/** Measures the actual available column, so the sidebar never distorts widths. */
export function CardGrid({children,testID,minItemWidth=400}: {children:ReactNode;testID?:string;minItemWidth?:number}) {
  const [width,setWidth]=useState(0);
  const two=Platform.OS==='web'&&width>=minItemWidth*2+spacing.md;
  return <View testID={testID} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={styles.grid}>
    {Children.map(children,child=>child==null?null:<View style={{width:two?(width-spacing.md)/2:'100%',minWidth:0}}>{child}</View>)}
  </View>;
}

export const secondaryStyles=StyleSheet.create({
  scroll:{flexGrow:1,paddingHorizontal:spacing.lg,paddingVertical:spacing.xl},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},
  filterBar:{width:'100%',maxWidth:1000,alignSelf:'center',paddingHorizontal:spacing.lg,paddingVertical:spacing.sm},
  heading:{...textStyles.heading,color:colors.ink},
  title:{fontSize:typography.body,lineHeight:24,fontWeight:'700',color:colors.ink},
  body:{...textStyles.small,color:colors.textSecondary},
  input:{minHeight:layout.controlHeight,minWidth:0,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.sm,padding:spacing.sm,color:colors.ink,backgroundColor:colors.surface,fontSize:typography.body},
});

const styles=StyleSheet.create({
  column:{width:'100%',maxWidth:Platform.OS==='web'?960:layout.maxContentWidth,alignSelf:'center',gap:spacing.lg,minWidth:0},
  reading:{maxWidth:layout.maxReadingWidth},
  card:{padding:spacing.lg,gap:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface,minWidth:0},
  notice:{fontSize:typography.meta,lineHeight:21,color:colors.textSecondary,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderLeftWidth:3,borderColor:colors.warning,borderRadius:radii.sm,backgroundColor:colors.warningSoft},
  meta:{fontSize:typography.meta,lineHeight:21,color:colors.textSecondary},
  chip:{minHeight:layout.minTouchTarget,justifyContent:'center',paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.sm,backgroundColor:colors.surface},
  selected:{backgroundColor:colors.accentSoft,borderColor:colors.accent},
  chipLabel:{...textStyles.small,fontWeight:'600',color:colors.textSecondary},
  selectedLabel:{color:colors.accentStrong},
  badge:{alignSelf:'flex-start',paddingHorizontal:spacing.xs,paddingVertical:spacing.xxs,borderRadius:radii.sm},
  badgeLabel:{fontSize:typography.meta,lineHeight:20,fontWeight:'600'},
  state:{width:'100%',alignItems:'center',padding:spacing.xl,gap:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface},
  error:{backgroundColor:colors.errorSoft,borderColor:colors.errorBorder},
  stateTitle:{...textStyles.body,color:colors.ink,fontWeight:'700',textAlign:'center'},
  stateBody:{...textStyles.small,color:colors.textSecondary,textAlign:'center'},
  grid:{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:spacing.md,minWidth:0},
  pressed:{opacity:0.75},
});
