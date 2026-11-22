import { useEffect, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createConversation } from '@/api/conversations';
import { CCD_AUTH_NOTICE,isCcdAuthenticated,isCcdLocal,isCcdKnowledge } from '@/config/demo-mode';
import { useSession } from '@/session/session-context';
import {useAuth} from '@/auth/auth-provider';
import { BrandMark, FadeIn, PressableScale } from '@/ui/animated';
import { CalendarGlyph, ChartGlyph, ChevronGlyph, ClockGlyph, DocGlyph, SparkGlyph } from '@/ui/icons';
import {BanuPageHeading,BanuWordmark,NativeCoreNavigation} from '@/components/banu-core';
import {HomeAgenda} from '@/components/home-agenda';
import { colors, layout, radii, spacing, typography, textStyles, shadows, banuHeroGradient } from '@/ui/tokens';

interface QuickActionProps {
  title: string;
  description: string;
  tint: string;
  tintSoft: string;
  icon: 'calendar' | 'chart' | 'clock' | 'doc' | 'notification';
  onPress: () => void;
  disabled: boolean;
  delay: number;
}

function QuickAction({ title, description, tint, tintSoft, icon, onPress, disabled, delay }: QuickActionProps) {
  return (
    <FadeIn delay={delay} style={styles.quickItem}>
      <PressableScale
        accessibilityLabel={`${title}. ${description}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}>
        <View testID="home-action-card" style={[styles.quickCard, disabled && styles.disabled]}>
          <View style={[styles.quickIconWrap, { backgroundColor: tintSoft }]}>
            {icon === 'calendar' && <CalendarGlyph color={tint} size={22} />}
            {icon === 'chart' && <ChartGlyph color={tint} size={22} />}
            {icon === 'clock' && <ClockGlyph color={tint} size={22} />}
            {icon === 'doc' && <DocGlyph color={tint} size={22} />}
            {icon === 'notification' && <SparkGlyph color={tint} size={22} />}
          </View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>{title}</Text>
            <Text style={styles.quickDescription}>{description}</Text>
          </View>
          <View aria-hidden style={styles.quickChevron}><ChevronGlyph color={colors.banuMuted} size={14}/></View>
        </View>
      </PressableScale>
    </FadeIn>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {width,height,fontScale}=useWindowDimensions();
  // Reclaim spacing on normal Android windows; large text and short windows
  // retain the roomy composition. Text scaling itself is never overridden.
  const compactAndroid=Platform.OS==='android'&&height>=600&&width>=340&&fontScale<=1.3;
  const largeNativeText=Platform.OS!=='web'&&fontScale>1.3;
  const { activeProfile, clearSession } = useSession();
  const {snapshot}=useAuth();
  const canChat=isCcdLocal()||snapshot.me?.capabilities.includes('chat')===true;
  const isMountedRef = useRef(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [startChatError, setStartChatError] = useState(false);

  useEffect(() => {
    if (activeProfile === null) router.replace(isCcdLocal()?'/profiles':'/login');
  }, [activeProfile, router]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (activeProfile === null) return null;

  async function startChat() {
    if (activeProfile === null || isStartingChat) return;

    setIsStartingChat(true);
    setStartChatError(false);
    try {
      const conversation = await createConversation(activeProfile.profile_key);
      if (!isMountedRef.current) return;
      router.push({
        pathname: '/chat',
        params: { conversation_id: conversation.conversation_id },
      });
    } catch {
      if (isMountedRef.current) setStartChatError(true);
    } finally {
      if (isMountedRef.current) setIsStartingChat(false);
    }
  }

  function endSession() {
    if (isStartingChat) return;
    clearSession();
    router.replace(isCcdLocal()?'/profiles':'/login');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container,compactAndroid&&styles.containerCompact]}>
        <View testID="home-content" style={[styles.content,compactAndroid&&styles.contentCompact]}>
          {Platform.OS!=='web'&&<View testID="home-topbar" style={styles.topBar}><BanuWordmark compact/></View>}
          <FadeIn><BanuPageHeading eyebrow="TU ESPACIO ACADÉMICO" title={`Hola, ${activeProfile.alias}`} subtitle="Una pregunta es un buen punto de partida." titleTestID="home-greeting"/></FadeIn>
          <View testID="home-layout" style={styles.homeLayout}>
          <FadeIn style={styles.heroSlot}><PressableScale accessibilityLabel="Abrir chat con Banu" accessibilityRole="button" accessibilityState={{busy:isStartingChat,disabled:isStartingChat||!canChat}} disabled={isStartingChat||!canChat} onPress={()=>void startChat()} scaleTo={0.985}>
            <View testID="home-hero" style={[styles.heroCard,compactAndroid&&styles.heroCompact,largeNativeText&&styles.heroLargeText]}>
              <View testID="home-hero-copy" style={[styles.heroCopy,compactAndroid&&styles.heroCopyCompact,largeNativeText&&styles.heroCopyLargeText]}>
                <Text testID="home-hero-eyebrow" style={styles.heroEyebrow}>UNA CONVERSACIÓN, MUCHAS POSIBILIDADES</Text>
                <Text testID="home-hero-title" style={[styles.heroTitle,width<760&&{maxWidth:205},(compactAndroid||largeNativeText)&&{maxWidth:'100%'}]}>{'Tu próxima respuesta\nempieza con Banu.'}</Text>
                <Text testID="home-hero-body" style={[styles.heroBody,width<760&&{maxWidth:width<375?180:200},largeNativeText&&styles.heroTextLarge]}>{isStartingChat?'Preparando tu conversación…':isCcdKnowledge()?'Consulta el material disponible y explora sus fuentes.':'Progreso, eventos y material del programa, con fuentes que puedes revisar.'}</Text>
                <View testID="home-hero-cta" style={styles.heroCtaRow}>{isStartingChat&&<ActivityIndicator color={colors.banuNavy} size="small"/>}<Text style={styles.heroCta}>{isStartingChat?'Abriendo…':'Hablar con Banu'}</Text><ChevronGlyph color={colors.banuNavy} size={16}/></View>
              </View>
              <View testID="home-hero-icon" style={[styles.heroIconWrap,largeNativeText&&styles.heroIconLargeText]}><BrandMark size={Platform.OS==='web'&&width>=1100?180:Platform.OS==='web'&&width>=760?132:width<375?96:108} framed={false}/><Text style={styles.artCaption}>Aquí para acompañarte</Text></View>
            </View>
          </PressableScale></FadeIn>
          {Platform.OS==='web'&&width>=1100&&snapshot.me?.capabilities.includes('calendar')&&<HomeAgenda profileKey={activeProfile.profile_key}/>}
          </View>
          {startChatError && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>No fue posible iniciar el chat</Text>
              <Text style={styles.errorText}>Puedes volver a intentarlo desde esta pantalla.</Text>
            </View>
          )}

          <View testID="home-actions" style={styles.quickSection}>
            <FadeIn delay={230} style={{width:'100%'}}>
              <Text style={styles.sectionLabel}>A tu alcance</Text>
            </FadeIn>
            {!isCcdLocal() && snapshot.me?.capabilities.includes('calendar') && <QuickAction
              title="Mi calendario"
              description="Actividades de los próximos 30 días."
              tint={colors.banuMagenta}
              tintSoft={colors.banuSoft}
              icon="calendar"
              onPress={() => router.push('/calendar')}
              disabled={isStartingChat}
              delay={280}
            />}
            {!isCcdLocal()&&snapshot.me?.capabilities.includes('progress')&&<QuickAction
              title="Mi progreso"
              description="Avance registrado para este perfil."
              tint={colors.banuMuted}
              tintSoft={colors.banuSoft}
              icon="chart"
              onPress={() => router.push('/progress')}
              disabled={isStartingChat}
              delay={340}
            />}
            {!isCcdLocal()&&snapshot.me?.capabilities.includes('announcements')&&<QuickAction
              title="Noticias"
              description="Consulta novedades, convocatorias y programación."
              tint={colors.banuMuted}
              tintSoft={colors.banuSoft}
              icon="doc"
              onPress={() => router.push('/announcements')}
              disabled={isStartingChat}
              delay={400}
            />}
            {!isCcdLocal()&&snapshot.me?.capabilities.includes('progress')&&Platform.OS !== 'web' && <QuickAction
              title="Recordatorios"
              description="Configura tus permisos y recordatorios."
              tint={colors.banuOrange}
              tintSoft={colors.amberSoft}
              icon="notification"
              onPress={() => router.push('/notifications' as Href)}
              disabled={isStartingChat}
              delay={430}
            />}
          </View>

          <View style={styles.homeBottom}><Text style={styles.bottomCopy}>Cada respuesta merece una fuente que puedas revisar.</Text><Pressable accessibilityRole="button" onPress={()=>router.push('/history')} style={styles.textButton}><Text style={styles.changeProfileLabel}>Mis conversaciones →</Text></Pressable></View>
          {isCcdAuthenticated()&&<Text testID="demo-notice" style={styles.demoNotice}>{CCD_AUTH_NOTICE}</Text>}
          <FadeIn delay={520}>
            <View style={styles.sessionSection}>
              <Text style={styles.sessionTitle}>{isCcdLocal() ? 'Operador local · memoria temporal' : 'Sesión BanuChat'}</Text>
              <View style={styles.sessionActions}>
                {!isCcdLocal() && <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isStartingChat }}
                  disabled={isStartingChat}
                  onPress={endSession}
                  style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                  <Text style={styles.changeProfileLabel}>Cambiar de cuenta</Text>
                </Pressable>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isStartingChat }}
                  disabled={isStartingChat}
                  onPress={endSession}
                  style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                  <Text style={styles.closeSessionLabel}>{isCcdLocal() ? 'Finalizar apertura local' : 'Cerrar sesión'}</Text>
                </Pressable>
              </View>
            </View>
          </FadeIn>
        </View>
      </ScrollView>
      <NativeCoreNavigation active="home" onHome={()=>{}} onChat={()=>void startChat()} busy={isStartingChat}/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  containerCompact:{paddingVertical:spacing.md},
  contentCompact:{gap:spacing.md},
  heroCompact:{minHeight:320,padding:spacing.lg},
  heroCopyCompact:{gap:spacing.xs},
  // Large native text needs its own space; the mascot stays out of the CTA.
  heroLargeText:{flexDirection:'column'},
  heroCopyLargeText:{flex:0},
  heroTextLarge:{maxWidth:'100%'},
  heroIconLargeText:{position:'relative',right:0,bottom:0,alignSelf:'flex-end',marginTop:spacing.sm},
  content: { width: '100%', maxWidth: Platform.OS==='web'?1180:layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: { color: colors.banuInk, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  greetingBlock: { gap: spacing.xxs },
  eyebrow: { ...textStyles.eyebrow, color: colors.banuMuted, marginBottom: spacing.xs },
  greeting: { ...textStyles.title, color: colors.banuInk },
  greetingSub: { color: colors.banuSecondary, fontSize: typography.body, lineHeight: 24 },
  demoNotice: { color: colors.banuSecondary, fontSize: typography.meta, lineHeight: 21, padding: spacing.md, borderLeftWidth: 3, borderColor: colors.warning, borderRadius: radii.sm, backgroundColor: colors.warningSoft },
  homeLayout:{gap:spacing.lg},heroSlot:{flex:1,minWidth:0},
  heroCard:{minHeight:356,overflow:'hidden',flexDirection:'row',padding:spacing.xl,borderRadius:22,backgroundColor:colors.banuNavy,...shadows.banuHero,...(Platform.OS!=='web'?{experimental_backgroundImage:banuHeroGradient}:{})},
  heroCopy:{flex:1,minWidth:0,gap:spacing.sm},heroEyebrow:{fontSize:10,lineHeight:16,letterSpacing:1.4,fontWeight:'700',color:colors.banuOnNavyAccent,maxWidth:230},
  heroTitle:{color:colors.white,fontSize:29,lineHeight:34,fontWeight:'600',letterSpacing:-1,maxWidth:310},heroBody:{color:colors.banuOnNavy,fontSize:14,lineHeight:22,maxWidth:285},
  heroIconWrap:{position:'absolute',right:6,bottom:34,alignItems:'center'},artCaption:{display:'none',fontSize:11,color:colors.banuOnNavyAccent,padding:6,borderWidth:1,borderColor:colors.banuOnNavyAccent,borderRadius:radii.pill},
  heroCtaRow:{minHeight:layout.minTouchTarget,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:spacing.md,marginTop:spacing.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderRadius:radii.sm,backgroundColor:colors.white,...shadows.soft},heroCta:{color:colors.banuNavy,fontSize:14,fontWeight:'600',flexShrink:1},
  errorBanner: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.md,
    backgroundColor: colors.errorSoft,
  },
  errorTitle: { color: colors.error, fontSize: typography.small, fontWeight: '700' },
  errorText: { color: colors.banuSecondary, fontSize: typography.small, lineHeight: 20 },
  quickSection: { flexDirection:'row',flexWrap:'wrap',gap:spacing.sm },
  quickItem:{flexBasis:'47%',flexGrow:1,minWidth:0},
  sectionLabel: {
    color: colors.banuInk,
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  quickCard: {
    minHeight: 152,
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.banuPanel,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChevron:{position:'absolute',right:14,top:24},
  quickCopy: { flex: 1, gap: 2 },
  quickTitle: { color: colors.banuInk, fontSize: typography.small, fontWeight: '600', letterSpacing: -0.2 },
  quickDescription: { color: colors.banuSecondary, fontSize: typography.meta, lineHeight: 20 },
  homeBottom:{gap:spacing.xs},bottomCopy:{fontSize:12,lineHeight:20,color:colors.banuMuted},
  sessionSection: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionTitle: { color: colors.banuMuted, fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  sessionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textButton: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  changeProfileLabel: { color: colors.banuMagenta, fontSize: typography.small, fontWeight: '700' },
  closeSessionLabel: { color: colors.banuSecondary, fontSize: typography.small, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.68 },
});
