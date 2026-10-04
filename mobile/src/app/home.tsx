import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createConversation } from '@/api/conversations';
import { useSession } from '@/session/session-context';

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
      <View style={styles.container}>
        <View style={styles.heading}>
          <Text style={styles.brand}>BanuChat</Text>
          <Text style={styles.profileAlias}>{activeProfile.alias}</Text>
          <Text style={styles.demoLabel}>Perfil sintético de demostración</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isStartingChat }}
            disabled={isStartingChat}
            onPress={() => void startChat()}
            style={[styles.primaryButton, isStartingChat && styles.disabled]}>
            {isStartingChat ? (
              <View style={styles.buttonProgress}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Iniciando chat...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Chat</Text>
            )}
          </Pressable>

          {startChatError && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              No fue posible iniciar el chat. Puedes volver a intentarlo.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={isStartingChat}
            onPress={() => router.push('/calendar')}
            style={[styles.secondaryButton, isStartingChat && styles.disabled]}>
            <Text style={styles.secondaryButtonText}>Calendario</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isStartingChat}
            onPress={() => router.push('/progress')}
            style={[styles.secondaryButton, isStartingChat && styles.disabled]}>
            <Text style={styles.secondaryButtonText}>Progreso</Text>
          </Pressable>
        </View>

        <View style={styles.sessionActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isStartingChat}
            onPress={endSession}
            style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Cambiar perfil</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isStartingChat}
            onPress={endSession}
            style={styles.textButton}>
            <Text style={styles.closeSessionLabel}>Cerrar sesión demo</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, justifyContent: 'center', gap: 32, padding: 24 },
  heading: { alignItems: 'center', gap: 8 },
  brand: { color: '#172554', fontSize: 32, fontWeight: '700' },
  profileAlias: { color: '#0f172a', fontSize: 20, fontWeight: '600' },
  demoLabel: { color: '#64748b', fontSize: 14 },
  actions: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 14 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#1d4ed8', fontSize: 16, fontWeight: '700' },
  buttonProgress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { color: '#b91c1c', fontSize: 15, textAlign: 'center' },
  sessionActions: { alignItems: 'center', gap: 8 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  textButtonLabel: { color: '#1d4ed8', fontSize: 15, fontWeight: '600' },
  closeSessionLabel: { color: '#475569', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
