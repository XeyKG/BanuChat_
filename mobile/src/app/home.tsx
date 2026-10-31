import { useEffect, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createConversation } from '@/api/conversations';
import { CCD_AUTH_NOTICE,isCcdAuthenticated,isCcdLocal,isCcdKnowledge } from '@/config/demo-mode';
import { useSession } from '@/session/session-context';
import {useAuth} from '@/auth/auth-provider';
import { BrandMark, FadeIn, MonogramAvatar, PressableScale } from '@/ui/animated';
import { CalendarGlyph, ChartGlyph, ChevronGlyph, ClockGlyph, DocGlyph, SparkGlyph } from '@/ui/icons';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

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
    <FadeIn delay={delay}>
      <PressableScale
        accessibilityLabel={`${title}. ${description}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}>
        <View style={[styles.quickCard, disabled && styles.disabled]}>
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
          <ChevronGlyph color={colors.muted} size={16} />
        </View>
      </PressableScale>
    </FadeIn>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { activeProfile, clearSession } = useSession();
  const {snapshot}=useAuth();
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <FadeIn>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <BrandMark size={36} />
                <Text style={styles.brandName}>BanuChat</Text>
              </View>
              {!isCcdLocal() && <MonogramAvatar alias={activeProfile.alias} size={40} />}
            </View>
          </FadeIn>

          <FadeIn delay={80}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{`Hola, ${activeProfile.alias}`}</Text>
              <Text style={styles.greetingSub}>¿Qué quieres consultar hoy?</Text>
              {isCcdAuthenticated() && <Text style={styles.greetingSub}>{CCD_AUTH_NOTICE}</Text>}
            </View>
          </FadeIn>

          <FadeIn delay={160}>
            <PressableScale
              accessibilityLabel="Abrir chat con Banu"
              accessibilityRole="button"
              accessibilityState={{ busy: isStartingChat, disabled: isStartingChat }}
              disabled={isStartingChat}
              onPress={() => void startChat()}
              scaleTo={0.98}>
              <View style={styles.heroCard}>
                <View aria-hidden style={styles.heroGlowOne} />
                <View aria-hidden style={styles.heroGlowTwo} />
                <View style={styles.heroIconWrap}>
                  <SparkGlyph color={colors.white} size={26} />
                </View>
                <Text style={styles.heroTitle}>Pregúntale a Banu</Text>
                <Text style={styles.heroBody}>
                  {isStartingChat
                    ? (isCcdLocal() ? 'Creando una conversación de demostración...' : 'Creando una conversación segura...')
                    : (isCcdKnowledge() ? 'Consulta los documentos CCD, pregunta de nuevo y abre las fuentes de las respuestas.' : 'Progreso, eventos, anuncios y material del programa, con citas verificables.')}
                </Text>
                <View style={styles.heroCtaRow}>
                  {isStartingChat && <ActivityIndicator color={colors.white} size="small" />}
                  <Text style={styles.heroCta}>{isStartingChat ? 'Abriendo...' : 'Iniciar conversación'}</Text>
                </View>
              </View>
            </PressableScale>
          </FadeIn>

          {startChatError && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>No fue posible iniciar el chat</Text>
              <Text style={styles.errorText}>Puedes volver a intentarlo desde esta pantalla.</Text>
            </View>
          )}

          <View style={styles.quickSection}>
            <FadeIn delay={230}>
              <Text style={styles.sectionLabel}>Accesos directos</Text>
            </FadeIn>
            {!isCcdLocal() && snapshot.me?.capabilities.includes('progress') && <><QuickAction
              title="Calendario"
              description="Actividades de los próximos 30 días."
              tint={colors.violet}
              tintSoft={colors.violetSoft}
              icon="calendar"
              onPress={() => router.push('/calendar')}
              disabled={isStartingChat}
              delay={280}
            />
            <QuickAction
              title="Mi progreso"
              description="Avance registrado para este perfil."
              tint={colors.success}
              tintSoft={colors.successSoft}
              icon="chart"
              onPress={() => router.push('/progress')}
              disabled={isStartingChat}
              delay={340}
            />
            <QuickAction
              title="Noticias y novedades"
              description="Consulta noticias y convocatorias."
              tint={colors.amber}
              tintSoft={colors.amberSoft}
              icon="doc"
              onPress={() => router.push('/announcements')}
              disabled={isStartingChat}
              delay={400}
            />
            {Platform.OS !== 'web' && <QuickAction
              title="Notificaciones"
              description="Configura tus permisos y recordatorios."
              tint={colors.amber}
              tintSoft={colors.amberSoft}
              icon="notification"
              onPress={() => router.push('/notifications' as Href)}
              disabled={isStartingChat}
              delay={430}
            />}
            <QuickAction
              title="Publicaciones OE2"
              description="Programación, convocatorias y novedades ficticias del pipeline."
              tint={colors.violet}
              tintSoft={colors.violetSoft}
              icon="doc"
              onPress={() => router.push('/oe2' as Href)}
              disabled={isStartingChat}
              delay={450}
            />
            </>}
            <QuickAction
              title="Historial"
              description={isCcdLocal() ? 'Solo las creadas durante esta apertura. Historial compartido en el backend, sin privacidad por usuario.' : 'Tus conversaciones anteriores.'}
              tint={colors.accent}
              tintSoft={colors.accentSoft}
              icon="clock"
              onPress={() => router.push('/history')}
              disabled={isStartingChat}
              delay={460}
            />
          </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: { width: '100%', maxWidth: Platform.OS==='web'?800:layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  greetingBlock: { gap: spacing.xxs },
  greeting: { color: colors.ink, fontSize: typography.title, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  greetingSub: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 24 },
  heroCard: {
    overflow: 'hidden',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.accent,
    ...shadows.card,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -70,
    left: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(20,26,60,0.22)',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: spacing.xs,
  },
  heroTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heroBody: { color: 'rgba(255,255,255,0.85)', fontSize: typography.small, lineHeight: 21 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  heroCta: { color: colors.white, fontSize: typography.body, fontWeight: '800' },
  errorBanner: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F3C2BE',
    borderRadius: radii.md,
    backgroundColor: colors.errorSoft,
  },
  errorTitle: { color: colors.error, fontSize: typography.small, fontWeight: '700' },
  errorText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  quickSection: { gap: spacing.sm },
  sectionLabel: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  quickCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: { flex: 1, gap: 2 },
  quickTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '800', letterSpacing: -0.2 },
  quickDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  sessionSection: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionTitle: { color: colors.muted, fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  sessionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textButton: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  changeProfileLabel: { color: colors.accent, fontSize: typography.small, fontWeight: '700' },
  closeSessionLabel: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.68 },
});
