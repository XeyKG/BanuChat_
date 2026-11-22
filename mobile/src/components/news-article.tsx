import {Link} from 'expo-router';
import {StyleSheet,Text,View} from 'react-native';
import {formatNewsDate,NewsMeta} from '@/components/announcement-card';
import {EditorialAttachment} from '@/components/editorial-attachment';
import {EditorialImage} from '@/components/editorial-image';
import {NewsDialog} from '@/components/news-dialog';
import {SourceMeta} from '@/components/secondary-ui';
import {colors,spacing,textStyles} from '@/ui/tokens';
import type {NewsItem} from '@/utils/news-feed';

function ArticleText({body}:{body:string}) {
  return <View style={styles.paragraphs} testID="announcement-body">
    {body.split(/\n\s*\n/u).map((paragraph,index)=><Text key={index} selectable style={styles.body}>
      {paragraph.split(/(https:\/\/[^\s<>"']+)/gu).map((part,position)=>{
        if (position%2===0) return part;
        const target = part.replace(/[.,;!?)]*$/u,'');
        try {
          const url = new URL(target);
          if (url.username || url.password || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/iu.test(url.hostname)) return part;
          return <Text key={position}><Link href={url.href as `https://${string}`} target="_blank" style={styles.link}>{target}</Link>{part.slice(target.length)}</Text>;
        } catch {return part;}
      })}
    </Text>)}
  </View>;
}

export function NewsArticle({item,cover,onClose}:{item:NewsItem;cover?:string;onClose:()=>void}) {
  const course = item.programming;
  const showMedia = item.status==='active' && item.editorialKey;
  return <NewsDialog title={item.title} onClose={onClose}>
    <View style={styles.article}>
      <NewsMeta item={item}/>
      <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
      {item.publishedAt && <Text style={styles.detail}>Publicado el {formatNewsDate(item.publishedAt,true)}</Text>}
      {showMedia && <EditorialImage itemKey={item.editorialKey!} label={'Portada de '+item.title} loadedUri={cover}/>}
      <View style={styles.facts}>
        <Text style={styles.detail}>{course?'Inicio':item.category==='calls'?'Apertura':'Visible desde'} · {formatNewsDate(item.starts,true)}</Text>
        {item.ends && <Text style={styles.detail}>{course?'Finalización':'Cierre'} · {formatNewsDate(item.ends,true)}</Text>}
        {course && <>
          <Text style={styles.detail}>Código de curso · {course.course_code}</Text>
          <Text style={styles.detail}>Período · {course.period}</Text>
          <Text style={styles.detail}>Modalidad · {course.mode}</Text>
        </>}
      </View>
      {item.description && <ArticleText body={item.description}/>}
      {showMedia && <EditorialAttachment announcementKey={item.editorialKey!}/>}
      <View style={styles.sources}>
        <Text accessibilityRole="header" style={styles.sourceHeading}>Procedencia</Text>
        {item.origins.map((origin,index)=><SourceMeta key={index}>
          {origin.kind==='oe2'
            ? `Fuente sintética versionada · ${origin.record.source.source_id}\nRegistro ${origin.record.source.record_id} · Versión ${origin.record.source.source_version}`
            : origin.kind==='editorial' ? 'Panel editorial del CCD' : `Catálogo de demostración · ${origin.record.announcement_key}`}
          {'\n'}Publicación {origin.releaseId}
          {origin.kind!=='oe2' && origin.record.source?.source_locator.startsWith('revision:') ? '\nRevisión '+origin.record.source.source_locator.slice(9):''}
        </SourceMeta>)}
      </View>
    </View>
  </NewsDialog>;
}

const styles=StyleSheet.create({
  article:{width:'100%',alignSelf:'center',maxWidth:740,padding:spacing.lg,gap:spacing.md},
  title:{fontSize:28,lineHeight:36,fontWeight:'700',color:colors.banuNavy,flexShrink:1},
  detail:{...textStyles.small,color:colors.banuSecondary},
  facts:{gap:spacing.xs,backgroundColor:colors.banuSoft,padding:spacing.sm},
  paragraphs:{gap:spacing.md},
  body:{...textStyles.body,color:colors.banuInk,lineHeight:27},
  link:{color:colors.banuMagentaStrong,textDecorationLine:'underline'},
  sources:{gap:spacing.xs,borderTopWidth:1,borderColor:colors.banuBorder,paddingTop:spacing.md},
  sourceHeading:{...textStyles.small,color:colors.banuNavy,fontWeight:'700'},
});
