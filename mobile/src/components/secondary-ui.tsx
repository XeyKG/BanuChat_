import {Children, useState, type ReactNode} from 'react';
import {ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {colors, layout, radii, spacing, textStyles, typography, shadows} from '@/ui/tokens';
import {BanuAvatar} from '@/components/banu-avatar';
import Animated from 'react-native-reanimated';
import {usePressFeedback} from '@/ui/animated';

/** Shared secondary-screen surfaces. Layout stays in RN, including on web. */
export function ContentColumn({children, testID, reading=false, style}: {children:ReactNode;testID?:string;reading?:boolean;style?:StyleProp<ViewStyle>}) {
  return <View testID={testID} style={[styles.column,reading&&styles.reading,style]}>{children}</View>;
}

export function SurfaceCard({children, style, testID}: {children:ReactNode;style?:StyleProp<ViewStyle>;testID?:string}) {
  return <View testID={testID??'secondary-card'} style={[styles.card,style]}>{children}</View>;
}

export function DemoNotice({children}: {children:ReactNode}) {
  return <Text testID="demo-notice" style={styles.notice}>{children}</Text>;
}

export function SourceMeta({children}: {children:ReactNode}) {
  return <Text selectable testID="source-meta" style={styles.meta}>{children}</Text>;
}

export function FilterChip({label, accessibilityLabel, selected, onPress}: {label:string;accessibilityLabel?:string;selected:boolean;onPress:()=>void}) {
  const {animatedStyle,pressIn,pressOut}=usePressFeedback();
  return <Pressable testID="filter-chip" accessibilityRole="radio" accessibilityLabel={accessibilityLabel??label} accessibilityState={{checked:selected}} aria-checked={selected} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={({pressed})=>[styles.chip,selected&&styles.selected,pressed&&styles.pressed]}>
    <Animated.Text style={[styles.chipLabel,selected&&styles.selectedLabel,animatedStyle]}>{label}</Animated.Text>
  </Pressable>;
}

export function StatusBadge({children,tint=colors.banuMagentaStrong,soft=colors.banuSoft}: {children:ReactNode;tint?:string;soft?:string}) {
  return <View style={[styles.badge,{backgroundColor:soft}]}><Text style={[styles.badgeLabel,{color:tint}]}>{children}</Text></View>;
}

export function ScreenState({kind,title,body,children,loadingLabel}: {kind:'loading'|'error'|'empty';title:string;body?:string;children?:ReactNode;loadingLabel?:string}) {
  return <View testID={`screen-state-${kind}`} accessibilityRole={kind==='error'?'alert':undefined} accessibilityLiveRegion="polite" style={[styles.state,kind==='error'&&styles.error]}>
    {kind==='loading'&&<ActivityIndicator color={colors.banuMagenta} accessibilityLabel={loadingLabel??title.replace(/\.\.\.$/,'')}/>}
    {kind==='empty'&&<BanuAvatar size={64} framed={false}/>}
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
  filterBar:{width:'100%',maxWidth:1220,alignSelf:'center',paddingHorizontal:spacing.lg,paddingVertical:spacing.sm},
  heading:{...textStyles.heading,color:colors.banuInk},
  title:{fontSize:typography.body,lineHeight:24,fontWeight:'700',color:colors.banuInk},
  body:{...textStyles.small,color:colors.banuSecondary},
  input:{minHeight:layout.controlHeight,minWidth:0,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.sm,padding:spacing.sm,color:colors.banuInk,backgroundColor:colors.surface,fontSize:typography.body,...shadows.banuInset},
});

const styles=StyleSheet.create({
  column:{width:'100%',maxWidth:Platform.OS==='web'?1180:layout.maxContentWidth,alignSelf:'center',gap:spacing.lg,minWidth:0},
  reading:{maxWidth:layout.maxReadingWidth},
  card:{padding:spacing.xl,gap:spacing.sm,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface,minWidth:0,...shadows.banuPanel},
  notice:{fontSize:typography.meta,lineHeight:21,color:colors.banuSecondary,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderLeftWidth:3,borderColor:colors.banuMagenta,borderRadius:radii.sm,backgroundColor:colors.banuSoft},
  meta:{fontSize:typography.meta,lineHeight:21,color:colors.banuMuted},
  chip:{maxWidth:'100%',minHeight:layout.minTouchTarget,justifyContent:'center',paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.sm,backgroundColor:colors.surface},
  selected:{backgroundColor:colors.banuSoft,borderColor:colors.banuMagenta},
  chipLabel:{...textStyles.small,fontWeight:'600',color:colors.banuSecondary,flexShrink:1},
  selectedLabel:{color:colors.banuMagentaStrong},
  badge:{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:spacing.xs,paddingVertical:spacing.xxs,borderRadius:radii.sm},
  badgeLabel:{fontSize:typography.meta,lineHeight:20,fontWeight:'600'},
  state:{width:'100%',alignItems:'center',padding:spacing.xl,gap:spacing.md,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface},
  error:{backgroundColor:colors.errorSoft,borderColor:colors.errorBorder},
  stateTitle:{...textStyles.body,color:colors.banuInk,fontWeight:'700',textAlign:'center'},
  stateBody:{...textStyles.small,color:colors.banuSecondary,textAlign:'center'},
  grid:{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:spacing.md,minWidth:0},
  pressed:{opacity:0.75},
});
