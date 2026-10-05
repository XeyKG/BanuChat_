import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createConversation,
  deleteConversation,
  listConversations,
  type ConversationSummary,
} from '@/api/conversations';
import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import { FadeIn, PressableScale } from '@/ui/animated';
import { ChatGlyph, ChevronGlyph, TrashGlyph } from '@/ui/icons';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

type LoadState = 'loading' | 'error' | 'success';

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
});

function formatStartedAt(timestamp: string): string {
  const date = new Date(timestamp);
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { activeProfile } = useSession();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const loadConversations = useCallback(() => {
    if (activeProfile === null) return;

    let isMounted = true;
    void listConversations(activeProfile.profile_key)
      .then((result) => {
        if (!isMounted) return;
        setConversations(result);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setConversations([]);
        setLoadState('error');
      });
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile === null) router.replace('/profiles');
  }, [activeProfile, router]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function retry() {
    setLoadState('loading');
    loadConversations();
  }

  function openConversation(conversationId: string) {
    router.push({ pathname: '/chat', params: { conversation_id: conversationId } });
  }

  async function startNewConversation() {
    if (activeProfile === null || isStartingChat) return;
    setIsStartingChat(true);
    try {
      const conversation = await createConversation(activeProfile.profile_key);
      router.push({
        pathname: '/chat',
        params: { conversation_id: conversation.conversation_id },
      });
    } catch {
      // El usuario permanece en el historial y puede reintentar.
    } finally {
      setIsStartingChat(false);
    }
  }

  function confirmDelete(conversation: ConversationSummary) {
    Alert.alert(
      'Eliminar conversación',
      'Se eliminarán los mensajes de esta conversación. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void removeConversation(conversation.conversation_id),
        },
      ],
    );
  }

  async function removeConversation(conversationId: string) {
    if (deletingId !== null) return;
    setDeletingId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((current) =>
        current.filter((item) => item.conversation_id !== conversationId),
      );
    } catch {
      Alert.alert(
        'No fue posible eliminar',
        'La conversación no se pudo eliminar. Inténtalo nuevamente.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (activeProfile === null) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle={`Perfil: ${activeProfile.alias}`}
        title="Historial"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando historial"
                size="large"
                color={colors.accent}
              />
              <Text style={styles.stateText}>Cargando conversaciones...</Text>
            </View>
          )}

          {loadState === 'error' && (
            <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>No fue posible cargar el historial</Text>
              <Text style={styles.stateText}>Comprueba la conexión e intenta nuevamente.</Text>
              <AppButton label="Reintentar" onPress={retry} style={styles.stateButton} />
            </View>
          )}

          {loadState === 'success' && conversations.length === 0 && (
            <FadeIn>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconHalo}>
                  <ChatGlyph color={colors.accent} size={34} />
                </View>
                <Text style={styles.stateTitle}>Aún no tienes conversaciones</Text>
                <Text style={styles.stateText}>
                  Inicia tu primera conversación con Banu y aparecerá aquí.
                </Text>
                <AppButton
                  label="Iniciar conversación"
                  loading={isStartingChat}
                  loadingLabel="Creando..."
                  onPress={() => void startNewConversation()}
                  style={styles.stateButton}
                />
              </View>
            </FadeIn>
          )}

          {loadState === 'success' && conversations.length > 0 && (
            <>
              <FadeIn>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar una nueva conversación"
                  accessibilityState={{ busy: isStartingChat }}
                  disabled={isStartingChat}
                  onPress={() => void startNewConversation()}>
                  <View style={styles.newConversationCard}>
                    <View style={styles.newConversationIcon}>
                      <ChatGlyph color={colors.white} size={18} />
                    </View>
                    <Text style={styles.newConversationText}>
                      {isStartingChat ? 'Creando conversación...' : 'Nueva conversación'}
                    </Text>
                  </View>
                </PressableScale>
              </FadeIn>

              <View style={styles.list}>
                {conversations.map((conversation, index) => (
                  <FadeIn key={conversation.conversation_id} delay={80 + index * 60}>
                    <View style={styles.conversationCard}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir conversación del ${formatStartedAt(conversation.started_at)}`}
                        onPress={() => openConversation(conversation.conversation_id)}
                        style={({ pressed }) => [
                          styles.openConversationButton,
                          pressed && styles.pressed,
                        ]}>
                        <View style={styles.conversationIcon}>
                          <ChatGlyph color={colors.accent} size={20} />
                        </View>
                        <View style={styles.conversationCopy}>
                          <Text style={styles.conversationDate}>
                            {formatStartedAt(conversation.started_at)}
                          </Text>
                          <Text style={styles.conversationMeta}>
                            {conversation.message_count === 0
                              ? 'Sin mensajes'
                              : conversation.message_count === 1
                                ? '1 mensaje'
                                : `${conversation.message_count} mensajes`}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar conversación"
                        accessibilityState={{ busy: deletingId === conversation.conversation_id }}
                        disabled={deletingId !== null}
                        hitSlop={8}
                        onPress={() => confirmDelete(conversation)}
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.pressed,
                        ]}>
                        {deletingId === conversation.conversation_id ? (
                          <ActivityIndicator color={colors.error} size="small" />
                        ) : (
                          <TrashGlyph color={colors.error} size={17} />
                        )}
                      </Pressable>
                      <ChevronGlyph color={colors.muted} size={15} />
                    </View>
                  </FadeIn>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.md },
  stateCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  errorCard: { borderColor: '#F3C2BE', backgroundColor: colors.errorSoft },
  stateTitle: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  stateButton: { minWidth: 180 },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  emptyIconHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  newConversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    ...shadows.soft,
  },
  newConversationIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  newConversationText: { color: colors.white, fontSize: typography.body, fontWeight: '800' },
  list: { gap: spacing.sm },
  conversationCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  openConversationButton: {
    flex: 1,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
  },
  conversationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  conversationCopy: { flex: 1, gap: 2 },
  conversationDate: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  conversationMeta: { color: colors.muted, fontSize: typography.caption },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorSoft,
  },
  pressed: { opacity: 0.65 },
});
