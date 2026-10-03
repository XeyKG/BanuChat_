import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
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

import {
  MessageRequestError,
  sendMessage,
  type SentAssistantMessage,
  type SentUserMessage,
} from '@/api/messages';

type ChatMessage = SentUserMessage | SentAssistantMessage;
type SendError = 'http' | 'uncertain' | 'invalid_response' | null;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversation_id?: string | string[];
    profile_key?: string | string[];
    profile_alias?: string | string[];
  }>();
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

  const conversationId = singleParam(params.conversation_id);
  const profileKey = singleParam(params.profile_key);
  const profileAlias = singleParam(params.profile_alias);
  function returnToProfiles() {
    router.replace('/');
  }

  if (
    conversationId === null ||
    !UUID_PATTERN.test(conversationId) ||
    profileKey === null ||
    !PROFILE_KEY_PATTERN.test(profileKey) ||
    profileAlias === null ||
    profileAlias.trim().length === 0
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidContainer}>
          <Text style={styles.title}>BanuChat</Text>
          <Text style={styles.errorText}>No fue posible abrir esta conversación.</Text>
          <Pressable accessibilityRole="button" onPress={returnToProfiles} style={styles.button}>
            <Text style={styles.buttonText}>Volver a perfiles</Text>
          </Pressable>
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>BanuChat</Text>
            <Text style={styles.profileLabel}>Perfil: {profileAlias}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isSending}
            onPress={returnToProfiles}
            style={[styles.backButton, isSending && styles.disabled]}>
            <Text style={styles.backButtonText}>Volver a perfiles</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 && (
            <Text style={styles.emptyText}>Escribe un mensaje para comenzar.</Text>
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
                <Text style={styles.evidenceWarning}>Evidencia insuficiente</Text>
              )}

              {message.role === 'assistant' && message.citations.length > 0 && (
                <View style={styles.sources}>
                  <Text style={styles.sourcesTitle}>Fuentes</Text>
                  {message.citations.map((citation) => (
                    <View key={`${message.message_id}-${citation.index}`} style={styles.source}>
                      <Text style={styles.sourceLabel}>
                        [{citation.index + 1}] {citation.label}
                      </Text>
                      <Text style={styles.sourceLocator}>{citation.locator}</Text>
                      <Text style={styles.sourceKind}>{citation.source_kind}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          {isSending && (
            <View style={styles.progress}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.progressText}>BanuChat está respondiendo...</Text>
            </View>
          )}

          {sendError === 'http' && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              No fue posible obtener una respuesta.
            </Text>
          )}

          {sendError === 'uncertain' && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              No se pudo confirmar si el mensaje fue procesado.{`\n`}No se reenviará
              automáticamente para evitar duplicados.
            </Text>
          )}

          {sendError === 'invalid_response' && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              No fue posible interpretar la respuesta confirmada. Vuelve a perfiles para
              continuar de forma segura.
            </Text>
          )}

          <TextInput
            accessibilityLabel="Mensaje"
            editable={!isSending && !isConversationLocked}
            multiline
            onChangeText={(value) => {
              setContent(value);
              if (sendError === 'http') setSendError(null);
            }}
            placeholder="Escribe tu mensaje"
            style={styles.input}
            value={content}
          />
          <Text style={[styles.characterCount, characterCount > 4000 && styles.limitExceeded]}>
            {characterCount}/4000
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isContentValid || isSending || isConversationLocked }}
            disabled={!isContentValid || isSending || isConversationLocked}
            onPress={() => void submitMessage()}
            style={[
              styles.button,
              (!isContentValid || isSending || isConversationLocked) && styles.disabled,
            ]}>
            <Text style={styles.buttonText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  invalidContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: { color: '#172554', fontSize: 26, fontWeight: '700' },
  profileLabel: { color: '#475569', fontSize: 14, marginTop: 4 },
  backButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  backButtonText: { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },
  messageList: { flexGrow: 1, gap: 12, padding: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 32 },
  messageCard: { maxWidth: '88%', padding: 14, borderRadius: 14 },
  userCard: { alignSelf: 'flex-end', backgroundColor: '#dbeafe' },
  assistantCard: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  messageRole: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 5 },
  messageContent: { color: '#0f172a', fontSize: 16, lineHeight: 23 },
  evidenceWarning: { color: '#92400e', fontWeight: '700', marginTop: 12 },
  sources: { gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  sourcesTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  source: { gap: 2 },
  sourceLabel: { color: '#1e293b', fontSize: 14, fontWeight: '600' },
  sourceLocator: { color: '#475569', fontSize: 13 },
  sourceKind: { color: '#64748b', fontSize: 12 },
  composer: { gap: 9, padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  progressText: { color: '#334155', fontSize: 14 },
  input: {
    minHeight: 52,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  characterCount: { color: '#64748b', fontSize: 12, textAlign: 'right' },
  limitExceeded: { color: '#b91c1c', fontWeight: '700' },
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  errorText: { color: '#b91c1c', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
