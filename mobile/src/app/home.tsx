import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createConversation } from '@/api/conversations';
import { useSession } from '@/session/session-context';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

interface DashboardActionProps {
  title: string;
  description: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
  loading?: boolean;
}

function DashboardAction({
  title,
  description,
  onPress,
  disabled,
  primary = false,
  loading = false,
}: DashboardActionProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        primary && styles.primaryActionCard,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.actionHeading}>
        <Text style={[styles.actionTitle, primary && styles.primaryActionText]}>{title}</Text>
        {loading && <ActivityIndicator color={colors.surface} size="small" />}
      </View>
      <Text style={[styles.actionDescription, primary && styles.primaryActionDescription]}>
        {loading ? 'Creando una conversación segura...' : description}
      </Text>
      <Text aria-hidden style={[styles.actionHint, primary && styles.primaryActionText]}>
        Abrir
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { activeProfile, clearSession } = useSession();
  const isMountedRef = useRef(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [startChatError, setStartChatError] = useState(false);

  useEffect(() => {
    if (activeProfile === null) router.replace('/');
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
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.brand}>BanuChat</Text>
            <Text style={styles.greeting}>Hola, {activeProfile.alias}</Text>
            <Text style={styles.demoLabel}>Perfil de demostración</Text>
          </View>

          <View style={styles.actions}>
            <DashboardAction
              title="Chat"
              description="Consulta progreso, eventos, anuncios y material disponible."
              disabled={isStartingChat}
              loading={isStartingChat}
              onPress={() => void startChat()}
              primary
            />

            {startChatError && (
              <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
                <Text style={styles.errorTitle}>No fue posible iniciar el chat</Text>
                <Text style={styles.errorText}>Puedes volver a intentarlo desde esta pantalla.</Text>
              </View>
            )}

            <DashboardAction
              title="Calendario"
              description="Revisa las actividades de los próximos 30 días."
              disabled={isStartingChat}
              onPress={() => router.push('/calendar')}
            />
            <DashboardAction
              title="Progreso"
              description="Consulta el avance registrado para este perfil."
              disabled={isStartingChat}
              onPress={() => router.push('/progress')}
            />
          </View>

          <View style={styles.sessionSection}>
            <Text style={styles.sessionTitle}>Sesión de demostración</Text>
            <View style={styles.sessionActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isStartingChat }}
                disabled={isStartingChat}
                onPress={endSession}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                <Text style={styles.changeProfileLabel}>Cambiar perfil</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isStartingChat }}
                disabled={isStartingChat}
                onPress={endSession}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                <Text style={styles.closeSessionLabel}>Cerrar sesión demo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  heading: { gap: spacing.xs },
  brand: { color: colors.primary, fontSize: typography.small, fontWeight: '800', letterSpacing: 0.8 },
  greeting: { color: colors.brand, fontSize: typography.title, lineHeight: 37, fontWeight: '800' },
  demoLabel: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  actions: { gap: spacing.sm },
  actionCard: {
    minHeight: 132,
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  primaryActionCard: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actionTitle: { color: colors.brand, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  actionDescription: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 21 },
  actionHint: { color: colors.primary, fontSize: typography.small, fontWeight: '700' },
  primaryActionText: { color: colors.surface },
  primaryActionDescription: { color: '#DBEAFE' },
  errorBanner: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radii.md,
    backgroundColor: colors.errorSoft,
  },
  errorTitle: { color: colors.error, fontSize: typography.small, fontWeight: '700' },
  errorText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  sessionSection: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionTitle: { color: colors.muted, fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  sessionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textButton: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  changeProfileLabel: { color: colors.primary, fontSize: typography.small, fontWeight: '700' },
  closeSessionLabel: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.68 },
});
