import {useCallback,useRef} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {EditorialImage} from '@/components/editorial-image';
import {StatusBadge} from '@/components/secondary-ui';
import {CalendarGlyph,ChevronGlyph,DocGlyph} from '@/ui/icons';
import {colors,radii,spacing,textStyles} from '@/ui/tokens';
import {newsCategories,newsExcerpt,type NewsItem} from '@/utils/news-feed';
import {formatOe2CivilDate} from '@/api/oe2-demo';

const date = new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short',year:'numeric'});
const time = new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'});
export const formatNewsDate = (value:string, withTime=false) => value.length===10
  ? formatOe2CivilDate(value) : (withTime?time:date).format(new Date(value));

export function NewsMeta({item}:{item:NewsItem}) {
  return <View style={styles.meta}>
    <Text style={styles.category}>{newsCategories[item.category]}</Text>
    <StatusBadge tint={item.status==='active'?colors.success:colors.banuSecondary}
      soft={item.status==='active'?colors.successSoft:colors.banuSoft}>
      {item.status==='active'?(item.programming?'En curso':'Vigente'):item.status==='upcoming'?'Próxima':'Finalizada'}
    </StatusBadge>
  </View>;
}

export function AnnouncementCard({item,onOpen}:{item:NewsItem;onOpen:(cover?:string)=>void}) {
  const cover = useRef<string>(undefined);
  const storeCover = useCallback((uri:string)=>{cover.current=uri;},[]);
  const excerpt = item.description ? newsExcerpt(item.description) : undefined;
  const Icon = item.programming ? CalendarGlyph : DocGlyph;
  const action = item.category==='news' ? 'Leer noticia' : 'Ver detalles';
  const hasCover = item.status==='active' && item.editorialKey?.startsWith('editorial-image-');
  return <View testID="announcement-card" style={styles.card}>
    {hasCover ? <EditorialImage itemKey={item.editorialKey!} label={'Portada de '+item.title}
      style={styles.cover} onUri={storeCover} fallback={<View style={styles.graphic} aria-hidden><Icon color={colors.banuMagenta} size={26}/></View>} />
      : <View style={styles.graphic} aria-hidden><Icon color={colors.banuMagenta} size={26}/></View>}
    <View style={styles.content}>
      <NewsMeta item={item}/>
      <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
      <Text style={styles.date}>{formatNewsDate(item.starts)}</Text>
      {excerpt && <Text testID="announcement-excerpt" numberOfLines={2} style={styles.excerpt}>{excerpt}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={action+': '+item.title}
        testID="announcement-open" onPress={()=>onOpen(cover.current)} style={({pressed})=>[styles.open,pressed&&styles.pressed]}>
        <Text style={styles.action}>{action}</Text><View aria-hidden><ChevronGlyph color={colors.banuMagentaStrong}/></View>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card:{flex:1,overflow:'hidden',borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface},
  graphic:{height:55,paddingHorizontal:spacing.lg,justifyContent:'center',backgroundColor:colors.banuSoft,borderBottomWidth:1,borderColor:colors.banuBorder},
  cover:{height:124,borderRadius:0},
  content:{flexGrow:1,padding:spacing.md,gap:spacing.xs},
  meta:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.xs},
  category:{...textStyles.eyebrow,color:colors.banuMagentaStrong},
  date:{...textStyles.small,color:colors.banuMuted},
  title:{fontSize:21,lineHeight:28,fontWeight:'700',color:colors.banuNavy,flexShrink:1},
  excerpt:{...textStyles.small,color:colors.banuSecondary},
  open:{minHeight:44,alignSelf:'flex-start',maxWidth:'100%',flexDirection:'row',alignItems:'center',gap:spacing.xs,marginTop:'auto',paddingTop:spacing.xs},
  pressed:{opacity:0.7},
  action:{...textStyles.small,fontWeight:'700',color:colors.banuMagentaStrong,flexShrink:1},
});
