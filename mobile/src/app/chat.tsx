import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {Alert} from '@/ui/confirmation';

import { createConversation, getConversation } from '@/api/conversations';
import { CCD_AUTH_NOTICE,CCD_NOTICE,isCcdAuthenticated,isCcdLocal,isCcdKnowledge } from '@/config/demo-mode';
import {
  MessageRequestError,
  sendMessage,
  type SentAssistantMessage,
  type SentUserMessage,
} from '@/api/messages';
import { AppButton } from '@/components/app-button';
import { ChatSources } from '@/components/chat-sources';
import { offersOwnProgress, readableChatAnswer } from '@/components/chat-presentation';
import { ChartGlyph } from '@/ui/icons';
import { useSession } from '@/session/session-context';
import {useChatState} from '@/session/use-chat-state';
import {useAuth} from '@/auth/auth-provider';
import { BrandMark, BubbleIn, FadeIn, TypingIndicator, useMotionReduced } from '@/ui/animated';
import {NativeCoreNavigation} from '@/components/banu-core';
import { colors, layout, radii, spacing, typography, textStyles, shadows } from '@/ui/tokens';

type ChatMessage = SentUserMessage | SentAssistantMessage;
type SendError = 'http' | 'conflict' | 'uncertain' | 'invalid_response' | null;
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
  'Consulta tus cursos, revisa tu avance o resuelve una duda. ¿Por dónde empezamos?';

const SUGGESTIONS = [
  '¿Cuál es mi progreso?',
  'Eventos de esta semana',
  '¿Qué anuncios hay?',
  '¿Qué puedes hacer?',
];

const RESPONSE_NOTICE='Las respuestas pueden ser incompletas. Revisa las fuentes.';
const CHARACTER_LIMIT = 4000;
const CHARACTER_COUNTER_THRESHOLD = 3200;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export default function ChatScreen() {
  const reducedMotion = useMotionReduced();
  const insets=useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardVisible,setKeyboardVisible]=useState(false);
  useEffect(()=>{if(Platform.OS==='web')return;const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboardVisible(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardVisible(false));return()=>{show.remove();hide.remove();};},[]);
  const router = useRouter();
  const { activeProfile } = useSession();
  const params = useLocalSearchParams<{ conversation_id?: string | string[] }>();
  const conversationId = singleParam(params.conversation_id);
  const {client,snapshot}=useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastAutoScrollKeyRef=useRef<string|null>(null);
  const isMountedRef = useRef(true);
  const [messages, setMessages] = useChatState<ChatMessage[]>(conversationId,'messages',[]);
  const [conversationLoadResult, setConversationLoadResult] = useChatState<ConversationLoadResult>(conversationId,'load',{
    requestKey: null,
    state: 'loading',
  });
  const [conversationRetryCount, setConversationRetryCount] = useChatState(conversationId,'retry',0);
  const [content, setContent] = useChatState(conversationId,'draft','');
  const [isSending, setIsSending] = useChatState(conversationId,'sending',false);
  const [sendError, setSendError] = useChatState<SendError>(conversationId,'sendError',null);
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [newConversationError, setNewConversationError] = useState(false);
  const [pendingUncertainSend, setPendingUncertainSend] =
    useChatState<PendingUncertainSend | null>(conversationId,'uncertain',null);
  const [reconciliationState, setReconciliationState] =
    useChatState<ReconciliationState | null>(conversationId,'reconciliation',null);
  const canApplyResult=()=>isMountedRef.current||(Platform.OS==='web'&&client.getSnapshot().phase==='authenticated'&&client.getSnapshot().epoch===snapshot.epoch);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (activeProfile === null) router.replace(isCcdLocal()?'/profiles':'/login');
  }, [activeProfile, router]);

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
        if (isCcdLocal() && detail.profile.profile_key !== activeProfileKey) {
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
  }, [activeProfileKey, conversationId, conversationRequestKey, isConversationValid, setConversationLoadResult, setMessages]);

  function returnHome() {
    if(Platform.OS==='web')router.push('/home');else router.replace('/home');
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
          <AppButton tone="banu" label="Volver al inicio" onPress={returnHome} style={styles.invalidButton} />
        </View>
      </SafeAreaView>
    );
  }

  const activeConversationId = conversationId;
  const characterCount = Array.from(content).length;
  const isContentValid = content.trim().length > 0 && characterCount <= CHARACTER_LIMIT;
  const isConversationLocked =
    conversationState !== 'ready' || sendError === 'conflict' || sendError === 'uncertain' || sendError === 'invalid_response';
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
      if (!canApplyResult()) return;
      setMessages((current) => [...current,...[result.user_message,result.assistant_message].filter(next=>!current.some(message=>message.message_id===next.message_id))]);
      setContent('');
      setPendingUncertainSend(null);
      setReconciliationState(null);
    } catch (error) {
      if (!canApplyResult()) return;
      if (error instanceof MessageRequestError) {
        if (error.kind === 'timeout' || error.kind === 'network') {
          setContent(outgoing);
          setSendError('uncertain');
          setReconciliationState('awaiting_check');
        } else if (error.kind === 'conflict') {
          setPendingUncertainSend(null);
          setSendError('conflict');
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
      if (canApplyResult()) setIsSending(false);
    }
  }

  async function openNewConversation() {
    if (activeProfile === null || isStartingNew) return;
    setIsStartingNew(true);
    setNewConversationError(false);
    try {
      const created = await createConversation(activeProfile.profile_key);
      if (!isMountedRef.current) return;
      if(Platform.OS!=='web'){setMessages([]);setContent('');setSendError(null);setPendingUncertainSend(null);}
      router.replace({ pathname: '/chat', params: { conversation_id: created.conversation_id } });
    } catch {
      if (isMountedRef.current) setNewConversationError(true);
    } finally {
      if (isMountedRef.current) setIsStartingNew(false);
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
      if (!canApplyResult()) return;

      const prefixMatches =
        detail.messages.length >= pendingUncertainSend.baselineCount &&
        pendingUncertainSend.baselineMessageIds.every(
          (messageId, index) => detail.messages[index]?.message_id === messageId,
        );
      if (
        detail.conversation_id !== activeConversationId ||
        (isCcdLocal() && detail.profile.profile_key !== activeProfileKey) ||
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
      if (canApplyResult()) setReconciliationState('check_failed');
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
    <SafeAreaView testID="core-chat-screen" style={styles.safeArea}>
      {!keyboardVisible&&(
        <View style={styles.nativeToolbar}>
          <Text accessibilityRole="header" style={styles.nativeToolbarTitle}>Chat con Banu</Text>
          <AppButton tone="banu" label="Nuevo chat" accessibilityLabel="Nueva conversación desde chat" variant="secondary"
            onPress={()=>void openNewConversation()} loading={isStartingNew}
            disabled={isSending||sendError==='uncertain'||sendError==='invalid_response'} style={styles.newChatButton}/>
        </View>
      )}
      {newConversationError&&sendError!=='conflict'&&<Text accessibilityRole="alert" style={styles.errorText}>No fue posible crear otra conversación. Puedes intentarlo de nuevo.</Text>}
      <View testID="chat-layout" style={styles.chatLayout}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? 'height' : 'padding'}
        keyboardVerticalOffset={Platform.OS==='web'?0:insets.top+spacing.lg}
        style={styles.keyboardView}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            // Expanding references or changing text size must not move an older
            // response out of view. Keep the existing scroll for load/new turns.
            const key=`${conversationId}:${conversationState}:${messages.length}:${messages[messages.length-1]?.message_id??''}:${isSending}`;
            if(lastAutoScrollKeyRef.current===key)return;
            lastAutoScrollKeyRef.current=key;
            scrollViewRef.current?.scrollToEnd({animated:!reducedMotion});
          }}>
          <View testID="chat-column" style={styles.messageColumn}>
            {isCcdLocal() && <Text style={styles.conversationStateText}>{CCD_NOTICE} Solo se abren chats creados en esta apertura.</Text>}
            {isCcdAuthenticated() && <Text testID="demo-notice" style={styles.conversationStateText}>{CCD_AUTH_NOTICE}</Text>}
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
                  {isCcdLocal() ? 'Conversación no disponible en esta apertura local' : 'La conversación no está disponible para la asignación actual'}
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
                      <BrandMark size={72} framed={false} />
                    </View>
                    <Text style={styles.emptyTitle}>¿En qué te ayudo hoy?</Text>
                    <Text style={styles.emptyBody}>{isCcdKnowledge() ? 'Pregúntame sobre cursos, pruebas o trámites. Puedes abrir las fuentes de cada respuesta.' : CHAT_INTRODUCTION}</Text>
                  </View>
                </FadeIn>
                <View testID="chat-suggestions" style={styles.suggestionGrid}>
                  {(isCcdKnowledge() ? ['¿Cuáles son los cursos de Competencias Digitales?', '¿Qué son las pruebas diagnósticas?', '¿Cuál es el correo de contacto del CCD?', '¿Qué puedes hacer?'] : SUGGESTIONS).map((suggestion, index) => (
                    <FadeIn key={suggestion} delay={140 + index * 80} style={styles.suggestionItem}>
                      <Pressable
                        accessibilityRole="button"
                        testID="chat-suggestion"
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

            {conversationState === 'ready' && messages.map((message, index) =>
              message.role === 'user' ? (
                <BubbleIn key={message.message_id} style={styles.userRow}>
                  <View testID="chat-user" style={styles.userBubble}>
                    <Text selectable testID="chat-message" style={styles.userText}>{message.content}</Text>
                  </View>
                </BubbleIn>
              ) : (
                <BubbleIn key={message.message_id} style={styles.assistantRow}>
                  <View style={styles.assistantAvatar}><BrandMark size={30} framed={false}/></View>
                  <View testID="chat-assistant" style={styles.assistantBody}><Text style={styles.authorLabel}>Banu</Text>
                    <Text selectable testID="chat-message" style={styles.assistantText}>{readableChatAnswer(message.content)}</Text>

                    {!isCcdKnowledge() && offersOwnProgress(message, messages[index - 1]?.role === 'user' ? messages[index - 1]!.content : '') && (
                      <Pressable
                        testID="chat-progress-action"
                        accessibilityRole="button"
                        accessibilityLabel="Ver mi progreso"
                        accessibilityHint="Abre tus cursos e intentos académicos. Puedes volver a esta conversación."
                        onPress={() => router.push('/progress')}
                        style={({ pressed }) => [styles.progressAction, pressed && styles.progressActionPressed]}>
                        <View aria-hidden style={styles.progressActionIcon}><ChartGlyph color={colors.banuMagenta} size={22} /></View>
                        <View style={styles.progressActionCopy}>
                          <Text style={styles.progressActionTitle}>Ver mi progreso</Text>
                          <Text style={styles.progressActionDetail}>Tus cursos, avances e intentos</Text>
                        </View>
                        <Text aria-hidden style={styles.progressActionArrow}>→</Text>
                      </Pressable>
                    )}

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
                  <BrandMark size={30} framed={false}/><Text style={styles.authorLabel}>Banu</Text>
                </View>
                <View style={styles.thinkingBubble}>
                  <TypingIndicator color={colors.banuMagenta} />
                  <Text accessibilityLiveRegion="polite" style={styles.thinkingText}>
                    Banu está pensando...
                  </Text>
                </View>
              </BubbleIn>
            )}
          </View>
        </ScrollView>

        <View testID="chat-composer" style={styles.composer}>
          {sendError === 'conflict' && (
            <View accessibilityRole="alert" testID="chat-error" style={styles.errorBanner}>
              <Text style={styles.errorText}>No se puede continuar esta conversación. La revisión documental pudo cambiar o existe una operación concurrente. El historial se conserva. Abre una conversación nueva para usar la revisión actual; no se trasladarán mensajes.</Text>
              <AppButton label="Abrir conversación nueva" loading={isStartingNew} onPress={() => void openNewConversation()} />
              {newConversationError && <Text style={styles.errorText}>No fue posible crear otra conversación. El historial sigue disponible.</Text>}
            </View>
          )}
          {sendError === 'http' && (
            <View accessibilityLiveRegion="polite" testID="chat-error" style={styles.errorBanner}>
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
                  Banu no pudo confirmar el resultado del envío. Tu pregunta sigue aquí.
                  Pulsa Comprobar estado para revisar el historial antes de decidir si vuelves a enviarla.
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
            <View accessibilityLiveRegion="polite" testID="chat-error" style={styles.errorBanner}>
              <Text style={styles.errorText}>
                No fue posible interpretar la respuesta confirmada. Vuelve al inicio para continuar
                de forma segura.
              </Text>
            </View>
          )}

          <View testID="chat-composer-row" style={[styles.composerRow,inputFocused&&styles.composerFocused]}>
            <View style={styles.composerField}>
            <Text style={styles.composerLabel}>Tu pregunta</Text>
            <View testID="chat-input-shell" style={[styles.inputShell,keyboardVisible&&styles.inputWithKeyboard, inputFocused && styles.inputFocused]}>
              <TextInput
                accessibilityLabel="Mensaje"
                editable={!isSending && !isConversationLocked}
                multiline
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChangeText={(value) => {
                  setContent(value);
                  if (sendError === 'http') setSendError(null);
                }}
                placeholder="¿Qué te gustaría saber?"
                placeholderTextColor={colors.banuMuted}
                style={[styles.input,keyboardVisible&&styles.inputWithKeyboard, isConversationLocked && styles.inputLocked]}
                value={content}
              />
            </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              accessibilityState={{ busy: isSending, disabled: !isContentValid || isSending || isConversationLocked }}
              aria-busy={isSending}
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

          <Text testID="chat-composer-hint" style={styles.composerHint}>{RESPONSE_NOTICE}</Text>
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
      </View>
      <NativeCoreNavigation active="chat" onHome={returnHome} onChat={()=>{}} busy={isSending}/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,minHeight:0,backgroundColor:colors.banuCanvas,paddingHorizontal:spacing.sm,paddingTop:spacing.sm,gap:spacing.sm},
  nativeToolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},nativeToolbarTitle:{flex:1,minWidth:0,fontSize:17,lineHeight:24,fontWeight:'600',color:colors.banuInk},
  chatLayout:{width:'100%',flex:1,minHeight:0,flexDirection:'row',gap:spacing.lg},
  keyboardView:{flex:1,width:Platform.OS==='web'?undefined:'100%',minWidth:0,minHeight:0,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface,overflow:'hidden',...shadows.banuPanel},
  newChatButton:{minHeight:48,paddingHorizontal:spacing.sm},
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
    color: colors.banuInk,
    fontSize: typography.heading,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  invalidText: {
    color: colors.banuSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  invalidButton: { minWidth: 180, marginTop: spacing.sm },
  messageScroll:{flex:1,minHeight:0},
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
    borderColor: colors.banuBorder,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  conversationStateTitle: {
    color: colors.banuInk,
    fontSize: typography.body,
    lineHeight: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  conversationStateText: {
    color: colors.banuSecondary,
    fontSize: typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  conversationStateActions: { width: '100%', gap: spacing.sm },
  emptyState: { gap: spacing.lg, paddingVertical: spacing.md },
  emptyHero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyMarkHalo: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: spacing.sm,
  },
  emptyTitle: { color: colors.banuInk, fontSize: typography.heading, fontWeight: '800', letterSpacing: -0.4 },
  emptyBody: {
    color: colors.banuSecondary,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  suggestionGrid: { flexDirection:'row',flexWrap:'wrap',gap:spacing.sm },
  suggestionItem:{maxWidth:'100%',minWidth:0,flexShrink:1,flexGrow:1,flexBasis:220},
  suggestionChip: {
    maxWidth:'100%',minWidth:0,flexShrink:1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    backgroundColor: colors.surface,
  },
  suggestionChipPressed: { opacity: 0.7 },
  suggestionText: { flexShrink:1, color: colors.banuInk, fontSize: typography.small, fontWeight: '600' },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    backgroundColor: colors.banuSoft,
  },
  userText: { color: colors.banuMagentaStrong, fontSize: typography.body, lineHeight: 23 },
  assistantRow: { flexDirection:'row',alignItems: 'flex-start', gap: spacing.sm, minWidth: 0 },
  assistantAvatar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  authorLabel: { color: colors.banuInk, fontSize: typography.meta, fontWeight: '600' },
  assistantBody: { flex:1, minWidth: 0, gap: spacing.sm, backgroundColor: colors.surface },
  assistantText: { color: colors.banuInk, ...textStyles.body },
  progressAction: { flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,minHeight:64,maxWidth:420,width:'100%',borderRadius:radii.md,borderWidth:1,borderColor:colors.banuBorder,backgroundColor:colors.banuSoft },
  progressActionPressed: { borderColor:colors.banuMagenta,opacity:0.8 },
  progressActionIcon: { minWidth:40,minHeight:40,borderRadius:radii.sm,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center' },
  progressActionCopy: { flex:1,minWidth:0,gap:spacing.xxs },
  progressActionTitle: { color:colors.banuMagentaStrong,fontSize:typography.body,fontWeight:'700' },
  progressActionDetail: { color:colors.banuSecondary,fontSize:typography.meta,lineHeight:20 },
  progressActionArrow: { color:colors.banuMagenta,fontSize:24 },
  thinkingBubble: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.banuBorder,
    backgroundColor: colors.banuSoft,
  },
  thinkingText: { color: colors.banuSecondary, fontSize: typography.small, fontWeight: '600' },
  evidenceWarning: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
  },
  evidenceWarningTitle: { color: colors.warning, fontSize: typography.small, fontWeight: '800' },
  evidenceWarningText: { color: colors.banuSecondary, fontSize: 13, lineHeight: 19 },
  composer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.banuBorder,
    backgroundColor: colors.surface,
  },
  composerRow:{width:'100%',maxWidth:layout.maxReadingWidth,alignSelf:'center',flexDirection:'row',alignItems:'flex-end',gap:spacing.sm,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.md,padding:spacing.sm,backgroundColor:colors.surface,...shadows.banuInset},
  composerField:{flex:1,minWidth:0,gap:spacing.xxs},
  composerFocused:{borderColor:colors.banuMagenta},composerLabel:{fontSize:12,lineHeight:18,fontWeight:'600',color:colors.banuMuted},
  inputShell:{width:'100%',minWidth:0,minHeight:48,maxHeight:120,justifyContent:'center'},
  inputWithKeyboard:{maxHeight:72},
  inputFocused: { borderColor: colors.banuMagenta },
  input: {
    width:'100%',
    color: colors.banuInk,
    fontSize: typography.body,
    lineHeight: 24,
    minHeight: layout.minTouchTarget,
    maxHeight: 108,
    textAlignVertical: 'center',
  },
  inputLocked: { color: colors.banuMuted },
  sendButton: {
    minWidth: 50,
    minHeight: 50,
    padding: spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.banuMagenta,
  },
  sendButtonDisabled: { backgroundColor: colors.banuBorder },
  sendButtonPressed: { opacity: 0.75 },
  sendButtonGlyph: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: -2 },
  characterCount: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    color: colors.banuMuted,
    fontSize: typography.caption,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  limitExceeded: { color: colors.error, fontWeight: '800' },
  composerHint: { width: '100%', maxWidth: layout.maxReadingWidth, alignSelf: 'center', color: colors.banuMuted, fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
  errorBanner: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
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
    color: colors.banuSecondary,
    fontSize: typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  uncertainActions: { width: '100%', gap: spacing.xs },
  uncertainAction: { width: '100%' },
});
