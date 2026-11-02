import { useCallback, useEffect, useState } from 'react';
import { CCD_NOTICE, isCcdLocal } from '@/config/demo-mode';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {Alert} from '@/ui/confirmation';

import {
  createConversation,
  deleteConversation,
  listConversations,
  type ConversationSummary,
} from '@/api/conversations';
import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import { FadeIn } from '@/ui/animated';
import {CardGrid,ContentColumn,DemoNotice,ScreenState,secondaryStyles} from '@/components/secondary-ui';
import { ChatGlyph, ChevronGlyph, TrashGlyph } from '@/ui/icons';
import { colors, layout, radii, shadows, spacing, textStyles } from '@/ui/tokens';

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
    return () => {
      isMounted = false;
    };
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile === null) router.replace(isCcdLocal()?'/profiles':'/login');
  }, [activeProfile, router]);

  useFocusEffect(loadConversations);

  function retry() {
    setLoadState('loading');
    loadConversations();
  }

  function openConversation(conversationId: string) {
    const destination={pathname:'/chat' as const,params:{conversation_id:conversationId}};
    if(Platform.OS==='web')router.navigate(destination);else router.push(destination);
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
    <SafeAreaView testID="secondary-screen" style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Tus conversaciones y fuentes"
        title={isCcdLocal() ? 'Historial de demostración' : 'Historial'}
      />
      <ScrollView contentContainerStyle={secondaryStyles.scroll}>
        <ContentColumn testID="history-content">
          {isCcdLocal() && <DemoNotice>{CCD_NOTICE} Al recargar o finalizar, se pierde esta lista local; el backend conserva los chats. No se enumeran conversaciones de otras aperturas.</DemoNotice>}
          {loadState === 'loading' && (
            <ScreenState kind="loading" loadingLabel="Cargando historial" title="Cargando conversaciones..."/>
          )}

          {loadState === 'error' && (
            <ScreenState kind="error" title="No fue posible cargar el historial" body="Comprueba la conexión e intenta nuevamente."><AppButton tone="banu" label="Reintentar" onPress={retry}/></ScreenState>
          )}

          {loadState === 'success' && conversations.length === 0 && (
            <FadeIn>
              <ScreenState kind="empty" title={isCcdLocal() ? 'No hay conversaciones en esta apertura' : 'Aún no tienes conversaciones'} body="Inicia tu primera conversación con Banu y aparecerá aquí.">
                <AppButton tone="banu"
                  label="Iniciar conversación"
                  loading={isStartingChat}
                  loadingLabel="Creando..."
                  onPress={() => void startNewConversation()}
                  style={styles.stateButton}
                />
              </ScreenState>
            </FadeIn>
          )}

          {loadState === 'success' && conversations.length > 0 && (
            <>
              <FadeIn>
                <AppButton tone="banu" label="Nueva conversación"
                  accessibilityLabel="Iniciar una nueva conversación"
                  loading={isStartingChat}
                  loadingLabel="Creando conversación..."
                  disabled={isStartingChat}
                  style={{alignSelf:'flex-start'}}
                  onPress={() => void startNewConversation()}/>
              </FadeIn>

              <CardGrid testID="history-list" minItemWidth={300}>
                {conversations.map((conversation, index) => (
                  <FadeIn key={conversation.conversation_id} delay={80 + index * 60}>
                    <View testID="history-card" style={styles.conversationCard}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir conversación del ${formatStartedAt(conversation.started_at)}`}
                        onPress={() => openConversation(conversation.conversation_id)}
                        style={({ pressed }) => [
                          styles.openConversationButton,
                          pressed && styles.pressed,
                        ]}>
                        <View style={styles.conversationIcon}>
                          <ChatGlyph color={colors.banuMagenta} size={20} />
                        </View>
                        <View style={styles.conversationCopy}>
                          <Text style={styles.conversationDate}>
                            {dateFormatter.format(new Date(conversation.started_at))}
                          </Text>
                          <Text style={styles.conversationMeta}>
                            {timeFormatter.format(new Date(conversation.started_at))}{' · '}{conversation.message_count === 0
                              ? 'Sin mensajes'
                              : conversation.message_count === 1
                                ? '1 mensaje'
                                : `${conversation.message_count} mensajes`}
                          </Text>
                        </View>
                        <ChevronGlyph color={colors.banuMagenta} size={16}/>
                      </Pressable>
                      {!isCcdLocal() && <Pressable
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
                          <><TrashGlyph color={colors.error} size={17} /><Text style={styles.deleteLabel}>Eliminar</Text></>
                        )}
                      </Pressable>}
                    </View>
                  </FadeIn>
                ))}
              </CardGrid>
            </>
          )}
        </ContentColumn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
stateButton: { minWidth: 180 },
conversationCard: {
    minHeight: 76,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.banuPanel,
  },
openConversationButton: {
    flex: 1,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
conversationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.banuSoft,
  },
conversationCopy: { flex: 1, minWidth:0, gap: spacing.xxs },
conversationDate: { color: colors.banuInk, ...textStyles.body, fontWeight: '700' },
conversationMeta: { color: colors.banuMuted, ...textStyles.small },
deleteButton: {
    minHeight: layout.minTouchTarget,
    flexDirection:'row',
    gap:spacing.xs,
    paddingHorizontal:spacing.md,
    paddingVertical:spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf:'flex-end',
  },
deleteLabel:{...textStyles.small,color:colors.error,fontWeight:'600'},
pressed: { opacity: 0.65 }
});
