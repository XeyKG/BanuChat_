import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MessageRequestError,
  sendMessage,
  type SentAssistantMessage,
  type SentUserMessage,
} from '@/api/messages';
import { AppButton } from '@/components/app-button';
import { ChatSources } from '@/components/chat-sources';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/session/session-context';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

type ChatMessage = SentUserMessage | SentAssistantMessage;
type SendError = 'http' | 'uncertain' | 'invalid_response' | null;

const CHAT_INTRODUCTION =
  'Hola, soy Banu. Puedo ayudarte a consultar tu progreso, revisar eventos y anuncios, y responder preguntas basadas en el material disponible. ¿Qué quieres consultar?';
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
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<SendError>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (activeProfile === null) router.replace('/');
  }, [activeProfile, router]);

  const conversationId = singleParam(params.conversation_id);
  function returnHome() {
    router.replace('/home');
  }

  if (activeProfile === null) return null;

  if (conversationId === null || !UUID_PATTERN.test(conversationId)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidContainer}>
          <Text style={styles.invalidEyebrow}>BanuChat</Text>
          <Text style={styles.invalidTitle}>No fue posible abrir esta conversación</Text>
          <Text style={styles.invalidText}>Vuelve al inicio para crear una conversación válida.</Text>
          <AppButton label="Volver al inicio" onPress={returnHome} style={styles.invalidButton} />
        </View>
      </SafeAreaView>
    );
  }

  const activeConversationId = conversationId;
  const characterCount = Array.from(content).length;
  const isContentValid = content.trim().length > 0 && characterCount <= 4000;
  const isConversationLocked = sendError === 'uncertain' || sendError === 'invalid_response';

  async function submitMessage() {
    if (!isContentValid || isSending || isConversationLocked) return;

    setIsSending(true);
    setSendError(null);
    try {
      const result = await sendMessage(activeConversationId, content);
      if (!isMountedRef.current) return;
      setMessages((current) => [...current, result.user_message, result.assistant_message]);
      setContent('');
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error instanceof MessageRequestError) {
        if (error.kind === 'timeout' || error.kind === 'network') {
          setSendError('uncertain');
        } else if (error.kind === 'invalid_response') {
          setSendError('invalid_response');
        } else {
          setSendError('http');
        }
      } else {
        setSendError('invalid_response');
      }
    } finally {
      if (isMountedRef.current) setIsSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScreenHeader
          actionDisabled={isSending}
          onAction={returnHome}
          subtitle={`Perfil: ${activeProfile.alias}`}
          title="Chat"
        />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.messageColumn}>
            {messages.length === 0 && (
              <View style={[styles.messageCard, styles.assistantCard, styles.introductionCard]}>
                <View style={styles.introductionLabel}>
                  <Text style={styles.introductionLabelText}>Bienvenida</Text>
                </View>
                <Text style={styles.messageRole}>BanuChat</Text>
                <Text style={styles.messageContent}>{CHAT_INTRODUCTION}</Text>
              </View>
            )}

            {messages.map((message) => (
              <View
                key={message.message_id}
                style={[
                  styles.messageCard,
                  message.role === 'user' ? styles.userCard : styles.assistantCard,
                ]}>
                <Text style={styles.messageRole}>
                  {message.role === 'user' ? 'Tú' : 'BanuChat'}
                </Text>
                <Text style={styles.messageContent}>{message.content}</Text>

                {message.role === 'assistant' && message.insufficient_evidence && (
                  <View accessibilityRole="alert" style={styles.evidenceWarning}>
                    <Text style={styles.evidenceWarningTitle}>Evidencia insuficiente</Text>
                    <Text style={styles.evidenceWarningText}>
                      La respuesta no cuenta con respaldo documental suficiente.
                    </Text>
                  </View>
                )}

                {message.role === 'assistant' && message.citations.length > 0 && (
                  <ChatSources citations={message.citations} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          {isSending && (
            <View accessibilityLiveRegion="polite" style={styles.sendingStatus}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.sendingText}>BanuChat está respondiendo...</Text>
            </View>
          )}

          {sendError === 'http' && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorText}>No fue posible obtener una respuesta.</Text>
            </View>
          )}

          {sendError === 'uncertain' && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorText}>
                No se pudo confirmar si el mensaje fue procesado.{`\n`}No se reenviará
                automáticamente para evitar duplicados.
              </Text>
            </View>
          )}

          {sendError === 'invalid_response' && (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorText}>
                No fue posible interpretar la respuesta confirmada. Vuelve al inicio para
                continuar de forma segura.
              </Text>
            </View>
          )}

          <View style={styles.composerRow}>
            <View style={styles.inputColumn}>
              <TextInput
                accessibilityLabel="Mensaje"
                editable={!isSending && !isConversationLocked}
                multiline
                onChangeText={(value) => {
                  setContent(value);
                  if (sendError === 'http') setSendError(null);
                }}
                placeholder="Escribe tu mensaje"
                placeholderTextColor={colors.muted}
                style={[styles.input, isConversationLocked && styles.inputLocked]}
                value={content}
              />
              <Text
                accessibilityLabel={`${characterCount} de 4000 caracteres`}
                style={[styles.characterCount, characterCount > 4000 && styles.limitExceeded]}>
                {characterCount}/4000
              </Text>
            </View>
            <AppButton
              disabled={!isContentValid || isConversationLocked}
              label="Enviar"
              loading={isSending}
              loadingLabel="Enviando"
              onPress={() => void submitMessage()}
              style={styles.sendButton}
            />
          </View>
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
  invalidEyebrow: { color: colors.primary, fontSize: typography.small, fontWeight: '800' },
  invalidTitle: { color: colors.brand, fontSize: typography.heading, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  invalidText: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 23, textAlign: 'center' },
  invalidButton: { minWidth: 180, marginTop: spacing.sm },
  messageList: { flexGrow: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  messageColumn: { width: '100%', maxWidth: layout.maxReadingWidth, alignSelf: 'center', gap: spacing.md },
  messageCard: { maxWidth: '88%', padding: spacing.md, borderRadius: radii.lg },
  userCard: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: radii.sm,
    backgroundColor: '#DBEAFE',
  },
  assistantCard: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  introductionCard: { marginTop: spacing.xs, backgroundColor: colors.primarySoft },
  introductionLabel: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  introductionLabelText: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  messageRole: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: '800', marginBottom: spacing.xs },
  messageContent: { color: colors.text, fontSize: typography.body, lineHeight: 24 },
  evidenceWarning: {
    gap: spacing.xxs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
  },
  evidenceWarningTitle: { color: colors.warning, fontSize: typography.small, fontWeight: '800' },
  evidenceWarningText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  composer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerRow: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  inputColumn: { flex: 1, gap: spacing.xxs },
  input: {
    minHeight: 48,
    maxHeight: 112,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: typography.body,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  inputLocked: { backgroundColor: colors.background, color: colors.muted },
  characterCount: { color: colors.muted, fontSize: typography.caption, textAlign: 'right' },
  limitExceeded: { color: colors.error, fontWeight: '800' },
  sendButton: { minWidth: 100 },
  sendingStatus: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sendingText: { color: colors.textSecondary, fontSize: typography.small },
  errorBanner: {
    width: '100%',
    maxWidth: layout.maxReadingWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.errorSoft,
  },
  errorText: { color: colors.error, fontSize: typography.small, lineHeight: 20, textAlign: 'center' },
});
