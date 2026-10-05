import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getConversation } from '@/api/conversations';
import {
  MessageRequestError,
  sendMessage,
  type SentAssistantMessage,
  type SentUserMessage,
} from '@/api/messages';
import { AppButton } from '@/components/app-button';
import { ChatSources } from '@/components/chat-sources';
import { useSession } from '@/session/session-context';
import { BrandMark, BubbleIn, FadeIn, TypingIndicator } from '@/ui/animated';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

type ChatMessage = SentUserMessage | SentAssistantMessage;
type SendError = 'http' | 'uncertain' | 'invalid_response' | null;
type ConversationState = 'loading' | 'ready' | 'error' | 'profile_mismatch';
type ReconciliationState =
  | 'awaiting_check'
  | 'checking'
  | 'not_visible'
  | 'changed'
  | 'check_failed';

interface PendingUncertainSend {
  content: string;
  baselineMessageIds: string[];
  baselineCount: number;
}

interface ConversationLoadResult {
  requestKey: string | null;
  state: ConversationState;
}

const CHAT_INTRODUCTION =
  'Hola, soy Banu. Puedo ayudarte a consultar tu progreso, revisar eventos y anuncios, y responder preguntas basadas en el material disponible. ¿Qué quieres consultar?';

const SUGGESTIONS = [
  '¿Cuál es mi progreso?',
  'Eventos de esta semana',
  '¿Qué anuncios hay?',
  '¿Qué puedes hacer?',
];

const CHARACTER_LIMIT = 4000;
const CHARACTER_COUNTER_THRESHOLD = 3200;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export default function ChatScreen() {
  const router = useRouter();
  const { activeProfile } = useSession();
  const params = useLocalSearchParams<{ conversation_id?: string | string[] }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationLoadResult, setConversationLoadResult] = useState<ConversationLoadResult>({
    requestKey: null,
    state: 'loading',
  });
  const [conversationRetryCount, setConversationRetryCount] = useState(0);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<SendError>(null);
  const [pendingUncertainSend, setPendingUncertainSend] =
    useState<PendingUncertainSend | null>(null);
  const [reconciliationState, setReconciliationState] =
    useState<ReconciliationState | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (activeProfile === null) router.replace('/profiles');
  }, [activeProfile, router]);

  const conversationId = singleParam(params.conversation_id);
  const isConversationValid = conversationId !== null && UUID_PATTERN.test(conversationId);
  const activeProfileKey = activeProfile?.profile_key ?? null;
  const conversationRequestKey =
    isConversationValid && conversationId !== null && activeProfileKey !== null
      ? `${activeProfileKey}:${conversationId}:${conversationRetryCount}`
      : null;
  const conversationState =
    conversationRequestKey !== null &&
    conversationLoadResult.requestKey === conversationRequestKey
      ? conversationLoadResult.state
      : 'loading';

  useEffect(() => {
    if (
      !isConversationValid ||
      conversationId === null ||
      activeProfileKey === null ||
      conversationRequestKey === null
    ) {
      return;
    }

    let isMounted = true;
    void getConversation(conversationId)
      .then((detail) => {
        if (!isMounted) return;
        if (detail.profile.profile_key !== activeProfileKey) {
          setMessages([]);
          setConversationLoadResult({
            requestKey: conversationRequestKey,
            state: 'profile_mismatch',
          });
          return;
        }
        setMessages(detail.messages);
        setConversationLoadResult({ requestKey: conversationRequestKey, state: 'ready' });
      })
      .catch(() => {
        if (!isMounted) return;
        setConversationLoadResult({ requestKey: conversationRequestKey, state: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [activeProfileKey, conversationId, conversationRequestKey, isConversationValid]);

  function returnHome() {
    router.replace('/home');
  }

  function retryConversationLoad() {
    setConversationRetryCount((count) => count + 1);
  }

  if (activeProfile === null) return null;

  if (!isConversationValid) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidContainer}>
          <BrandMark size={52} />
          <Text style={styles.invalidTitle}>No fue posible abrir esta conversación</Text>
          <Text style={styles.invalidText}>Vuelve al inicio para crear una conversación válida.</Text>
          <AppButton label="Volver al inicio" onPress={returnHome} style={styles.invalidButton} />
        </View>
      </SafeAreaView>
    );
  }

  const activeConversationId = conversationId;
  const characterCount = Array.from(content).length;
  const isContentValid = content.trim().length > 0 && characterCount <= CHARACTER_LIMIT;
  const isConversationLocked =
    conversationState !== 'ready' || sendError === 'uncertain' || sendError === 'invalid_response';
  const showEmptyState = conversationState === 'ready' && messages.length === 0;

  async function submitMessage(text?: string) {
    const outgoing = (text ?? content).trim();
    if (
      conversationState !== 'ready' ||
      outgoing.length === 0 ||
      characterCount > CHARACTER_LIMIT ||
      isSending ||
      isConversationLocked
    ) {
      return;
    }

    const pendingSend: PendingUncertainSend = {
      content: outgoing,
      baselineMessageIds: messages.map((message) => message.message_id),
      baselineCount: messages.length,
    };
    setIsSending(true);
    setSendError(null);
    setPendingUncertainSend(pendingSend);
    setReconciliationState(null);
    try {
      const result = await sendMessage(activeConversationId, outgoing);
      if (!isMountedRef.current) return;
      setMessages((current) => [...current, result.user_message, result.assistant_message]);
      setContent('');
      setPendingUncertainSend(null);
      setReconciliationState(null);
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error instanceof MessageRequestError) {
        if (error.kind === 'timeout' || error.kind === 'network') {
          setSendError('uncertain');
          setReconciliationState('awaiting_check');
        } else if (error.kind === 'invalid_response') {
          setPendingUncertainSend(null);
          setSendError('invalid_response');
        } else {
          setPendingUncertainSend(null);
          setSendError('http');
        }
      } else {
        setPendingUncertainSend(null);
        setSendError('invalid_response');
      }
    } finally {
      if (isMountedRef.current) setIsSending(false);
    }
  }

  async function checkUncertainSend() {
    if (
      pendingUncertainSend === null ||
      activeProfileKey === null ||
      reconciliationState === 'checking'
    ) {
      return;
    }

    setReconciliationState('checking');
    try {
      const detail = await getConversation(activeConversationId);
      if (!isMountedRef.current) return;

      const prefixMatches =
        detail.messages.length >= pendingUncertainSend.baselineCount &&
        pendingUncertainSend.baselineMessageIds.every(
          (messageId, index) => detail.messages[index]?.message_id === messageId,
        );
      if (
        detail.conversation_id !== activeConversationId ||
        detail.profile.profile_key !== activeProfileKey ||
        !prefixMatches
      ) {
        setReconciliationState('changed');
        return;
      }

      const additionalMessages = detail.messages.slice(pendingUncertainSend.baselineCount);
      if (additionalMessages.length === 0) {
        setReconciliationState('not_visible');
        return;
      }

      const [userMessage, assistantMessage] = additionalMessages;
      if (
        additionalMessages.length === 2 &&
        userMessage.role === 'user' &&
        userMessage.content === pendingUncertainSend.content &&
        assistantMessage.role === 'assistant'
      ) {
        setMessages(detail.messages);
        setPendingUncertainSend(null);
        setReconciliationState(null);
        setSendError(null);
        setContent('');
        return;
      }

      setReconciliationState('changed');
    } catch {
      if (isMountedRef.current) setReconciliationState('check_failed');
    }
  }

  function continueAfterUncertainSend() {
    if (pendingUncertainSend === null) return;

    Alert.alert(
      'Continuar con precaución',
      'El mensaje anterior podría seguir procesándose. Si continúas y vuelves a enviarlo, podría quedar duplicado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            setContent(pendingUncertainSend.content);
            setPendingUncertainSend(null);
            setReconciliationState(null);
            setSendError(null);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <View style={styles.banuAvatar}>
              <BrandMark size={38} />
              <View style={styles.presenceDot} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Banu</Text>
              <Text style={styles.headerSubtitle}>Asistente académico · {activeProfile.alias}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSending }}
            disabled={isSending}
            onPress={returnHome}
            style={({ pressed }) => [
              styles.headerAction,
              isSending && styles.headerActionDisabled,
              pressed && !isSending && styles.pressed,
            ]}>
            <Text style={styles.headerActionText}>Inicio</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.messageColumn}>
            {conversationState === 'loading' && (
              <View accessibilityLiveRegion="polite" style={styles.conversationStateCard}>
                <Text style={styles.conversationStateText}>Cargando conversación...</Text>
              </View>
            )}

            {conversationState === 'error' && (
              <View accessibilityRole="alert" style={styles.conversationStateCard}>
                <Text style={styles.conversationStateTitle}>
                  No fue posible cargar la conversación
                </Text>
                <View style={styles.conversationStateActions}>
                  <AppButton label="Reintentar" onPress={retryConversationLoad} />
                  <AppButton label="Volver al inicio" onPress={returnHome} variant="secondary" />
                </View>
              </View>
            )}

            {conversationState === 'profile_mismatch' && (
              <View accessibilityRole="alert" style={styles.conversationStateCard}>
                <Text style={styles.conversationStateTitle}>
                  Esta conversación pertenece a otro perfil de demostración
                </Text>
                <Text style={styles.conversationStateText}>
                  Selecciona la conversación desde el historial del perfil activo.
                </Text>
                <View style={styles.conversationStateActions}>
                  <AppButton label="Volver al inicio" onPress={returnHome} />
                  <AppButton
                    label="Ir al historial"
                    onPress={() => router.replace('/history')}
                    variant="secondary"
                  />
                </View>
              </View>
            )}

            {showEmptyState && (
              <View style={styles.emptyState}>
                <FadeIn>
                  <View style={styles.emptyHero}>
                    <View style={styles.emptyMarkHalo}>
                      <BrandMark size={64} />
                    </View>
                    <Text style={styles.emptyTitle}>Bienvenida de Banu</Text>
                    <Text style={styles.emptyBody}>{CHAT_INTRODUCTION}</Text>
                  </View>
                </FadeIn>
                <View style={styles.suggestionGrid}>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <FadeIn key={suggestion} delay={140 + index * 80}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Sugerencia: ${suggestion}`}
                        accessibilityState={{ disabled: conversationState !== 'ready' }}
                        disabled={conversationState !== 'ready'}
                        onPress={() => setContent(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          pressed && styles.suggestionChipPressed,
                        ]}>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </Pressable>
                    </FadeIn>
                  ))}
                </View>
              </View>
            )}

            {conversationState === 'ready' && messages.map((message) =>
              message.role === 'user' ? (
                <BubbleIn key={message.message_id} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{message.content}</Text>
                  </View>
                </BubbleIn>
              ) : (
                <BubbleIn key={message.message_id} style={styles.assistantRow}>
                  <View style={styles.assistantAvatar}>
                    <BrandMark size={30} />
                  </View>
                  <View style={styles.assistantBody}>
                    <Text style={styles.assistantText}>{message.content}</Text>

                    {message.insufficient_evidence && (
                      <View accessibilityRole="alert" style={styles.evidenceWarning}>
                        <Text style={styles.evidenceWarningTitle}>Evidencia insuficiente</Text>
                        <Text style={styles.evidenceWarningText}>
                          La respuesta no cuenta con respaldo documental suficiente.
                        </Text>
                      </View>
                    )}

                    {message.citations.length > 0 && <ChatSources citations={message.citations} />}
                  </View>
                </BubbleIn>
              ),
            )}

            {conversationState === 'ready' && isSending && (
              <BubbleIn style={styles.assistantRow}>
                <View style={styles.assistantAvatar}>
                  <BrandMark size={30} />
                </View>
                <View style={styles.thinkingBubble}>
                  <TypingIndicator color={colors.accent} />
                  <Text accessibilityLiveRegion="polite" style={styles.thinkingText}>
                    Banu está pensando...
                  </Text>
                </View>
              </BubbleIn>
            )}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          {sendError === 'http' && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorText}>No fue posible obtener una respuesta. Inténtalo de nuevo.</Text>
            </View>
          )}

          {sendError === 'uncertain' && (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[styles.errorBanner, styles.uncertainBanner]}>
              <Text style={styles.uncertainTitle}>Resultado del envío sin confirmar</Text>

              {(reconciliationState === 'awaiting_check' || reconciliationState === null) && (
                <Text style={styles.uncertainText}>
                  No se pudo confirmar si el mensaje fue procesado. No se reenviará automáticamente
                  para evitar duplicados.
                </Text>
              )}

              {reconciliationState === 'checking' && (
                <Text style={styles.uncertainText}>Comprobando el historial de la conversación...</Text>
              )}

              {reconciliationState === 'not_visible' && (
                <Text style={styles.uncertainText}>
                  El turno todavía no aparece en el historial. Puede seguir procesándose.
                </Text>
              )}

              {reconciliationState === 'check_failed' && (
                <Text style={styles.uncertainText}>
                  No fue posible verificar el mensaje todavía. Puedes comprobar el estado nuevamente.
                </Text>
              )}

              {reconciliationState === 'changed' ? (
                <>
                  <Text style={styles.uncertainText}>
                    La conversación cambió mientras se verificaba el mensaje. Revisa el historial antes
                    de continuar.
                  </Text>
                  <View style={styles.uncertainActions}>
                    <AppButton
                      label="Ir al historial"
                      onPress={() => router.replace('/history')}
                      style={styles.uncertainAction}
                    />
                    <AppButton
                      label="Ir al inicio"
                      onPress={returnHome}
                      style={styles.uncertainAction}
                      variant="secondary"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.uncertainActions}>
                  <AppButton
                    label={reconciliationState === 'not_visible' ? 'Comprobar de nuevo' : 'Comprobar estado'}
                    loading={reconciliationState === 'checking'}
                    loadingLabel="Comprobando..."
                    onPress={() => void checkUncertainSend()}
                    style={styles.uncertainAction}
                  />
                  {reconciliationState === 'not_visible' && (
                    <AppButton
                      label="Continuar de todos modos"
                      onPress={continueAfterUncertainSend}
                      style={styles.uncertainAction}
                      variant="secondary"
                    />
                  )}
                </View>
              )}
            </View>
          )}

          {sendError === 'invalid_response' && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorText}>
                No fue posible interpretar la respuesta confirmada. Vuelve al inicio para continuar
                de forma segura.
              </Text>
            </View>
          )}

          <View style={styles.composerRow}>
            <View style={styles.inputShell}>
              <TextInput
                accessibilityLabel="Mensaje"
                editable={!isSending && !isConversationLocked}
                multiline
                onChangeText={(value) => {
                  setContent(value);
                  if (sendError === 'http') setSendError(null);
                }}
                placeholder="Escríbele a Banu..."
                placeholderTextColor={colors.muted}
                style={[styles.input, isConversationLocked && styles.inputLocked]}
                value={content}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              accessibilityState={{ busy: isSending, disabled: !isContentValid || isConversationLocked }}
              disabled={!isContentValid || isSending || isConversationLocked}
              onPress={() => void submitMessage()}
              style={({ pressed }) => [
                styles.sendButton,
                (!isContentValid || isConversationLocked) && styles.sendButtonDisabled,
                pressed && isContentValid && !isConversationLocked && styles.sendButtonPressed,
              ]}>
              <Text aria-hidden style={styles.sendButtonGlyph}>
                ↑
              </Text>
            </Pressable>
          </View>

          {characterCount > CHARACTER_COUNTER_THRESHOLD && (
            <Text
              accessibilityLabel={`${characterCount} de ${CHARACTER_LIMIT} caracteres`}
              style={[
                styles.characterCount,
                characterCount > CHARACTER_LIMIT && styles.limitExceeded,
              ]}>
              {characterCount}/{CHARACTER_LIMIT}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  invalidContainer: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  invalidTitle: {
    color: colors.ink,
    fontSize: typography.heading,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  invalidText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  invalidButton: { minWidth: 180, marginTop: spacing.sm },
  header: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  banuAvatar: { position: 'relative' },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.success,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  headerAction: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  headerActionText: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  headerActionDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  messageList: { flexGrow: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  messageColumn: { width: '100%', maxWidth: layout.maxReadingWidth, alignSelf: 'center', gap: spacing.md },
  conversationStateCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  conversationStateTitle: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  conversationStateText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  conversationStateActions: { width: '100%', gap: spacing.sm },
  emptyState: { gap: spacing.xl, paddingVertical: spacing.xl },
  emptyHero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyMarkHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.sm,
  },
  emptyTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800', letterSpacing: -0.4 },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  suggestionGrid: { gap: spacing.xs },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  suggestionChipPressed: { opacity: 0.7 },
  suggestionText: { color: colors.ink, fontSize: typography.small, fontWeight: '600' },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    backgroundColor: colors.accent,
    ...shadows.soft,
  },
  userText: { color: colors.white, fontSize: typography.body, lineHeight: 23 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  assistantAvatar: { marginTop: 2 },
  assistantBody: { flex: 1, gap: spacing.xs, paddingTop: spacing.xxs },
  assistantText: { color: colors.ink, fontSize: typography.body, lineHeight: 24 },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  thinkingText: { color: colors.textSecondary, fontSize: typography.small, fontWeight: '600' },
  evidenceWarning: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#F0DFA8',
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
  },
  evidenceWarningTitle: { color: colors.warning, fontSize: typography.small, fontWeight: '800' },
  evidenceWarningText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  composer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerRow: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  inputShell: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 25,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  input: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 22,
    maxHeight: 108,
    textAlignVertical: 'center',
  },
  inputLocked: { color: colors.muted },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    ...shadows.soft,
  },
  sendButtonDisabled: { backgroundColor: colors.borderStrong },
  sendButtonPressed: { transform: [{ scale: 0.92 }] },
  sendButtonGlyph: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: -2 },
  characterCount: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    color: colors.muted,
    fontSize: typography.caption,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  limitExceeded: { color: colors.error, fontWeight: '800' },
  errorBanner: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F3C2BE',
    backgroundColor: colors.errorSoft,
  },
  errorText: { color: colors.error, fontSize: typography.small, lineHeight: 20, textAlign: 'center' },
  uncertainBanner: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  uncertainTitle: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  uncertainText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  uncertainActions: { width: '100%', gap: spacing.xs },
  uncertainAction: { width: '100%' },
});
