import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createConversation } from '@/api/conversations';
import { getProfiles, type ProfileSummary } from '@/api/profiles';

type LoadState = 'loading' | 'error' | 'success';

export default function HomeScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSummary | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [startChatError, setStartChatError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadState('loading');

    void getProfiles()
      .then((result) => {
        if (!isMounted) return;
        setProfiles(result.profiles);
        setSelectedProfile(null);
        setStartChatError(false);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setProfiles([]);
        setSelectedProfile(null);
        setStartChatError(false);
        setLoadState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  function retry() {
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  }

  async function continueWithSelectedProfile() {
    if (selectedProfile === null || isStartingChat) return;

    setIsStartingChat(true);
    setStartChatError(false);
    try {
      const conversation = await createConversation(selectedProfile.profile_key);
      router.push({
        pathname: '/chat',
        params: {
          conversation_id: conversation.conversation_id,
          profile_key: conversation.profile_key,
          profile_alias: conversation.profile_alias,
        },
      });
    } catch {
      setStartChatError(true);
    } finally {
      setIsStartingChat(false);
    }
  }

  const isProgressDisabled = selectedProfile === null || isStartingChat || loadState !== 'success';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>BanuChat</Text>

        {loadState === 'loading' && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.message}>Cargando perfiles...</Text>
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.stateContainer}>
            <Text style={styles.message}>No fue posible cargar los perfiles.</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {loadState === 'success' && (
          <View style={styles.content}>
            <Text style={styles.message}>Selecciona un perfil de demostración</Text>

            {profiles.length === 0 ? (
              <Text style={styles.secondaryText}>No hay perfiles disponibles.</Text>
            ) : (
              <View style={styles.profileList}>
                {profiles.map((profile) => {
                  const isSelected = selectedProfile?.profile_key === profile.profile_key;
                  return (
                    <Pressable
                      key={profile.profile_key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      disabled={isStartingChat}
                      onPress={() => {
                        setSelectedProfile(profile);
                        setStartChatError(false);
                      }}
                      style={[styles.profileOption, isSelected && styles.profileOptionSelected]}>
                      <Text style={styles.profileAlias}>{profile.alias}</Text>
                      <Text style={styles.profileKey}>{profile.profile_key}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedProfile === null || isStartingChat }}
              disabled={selectedProfile === null || isStartingChat}
              onPress={() => void continueWithSelectedProfile()}
              style={[
                styles.primaryButton,
                (selectedProfile === null || isStartingChat) && styles.buttonDisabled,
              ]}>
              {isStartingChat ? (
                <View style={styles.buttonProgress}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Iniciando chat...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Continuar</Text>
              )}
            </Pressable>

            {startChatError && (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                No fue posible iniciar el chat.
              </Text>
            )}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isStartingChat}
          onPress={() => router.push('/calendar')}
          style={[styles.secondaryButton, isStartingChat && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Calendario</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isProgressDisabled }}
          disabled={isProgressDisabled}
          onPress={() => {
            if (selectedProfile === null) return;
            router.push({
              pathname: '/progress',
              params: {
                profile_key: selectedProfile.profile_key,
                profile_alias: selectedProfile.alias,
              },
            });
          }}
          style={[
            styles.secondaryButton,
            isProgressDisabled && styles.buttonDisabled,
          ]}>
          <Text style={styles.secondaryButtonText}>Progreso</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#172554',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'stretch',
    gap: 16,
  },
  stateContainer: {
    alignItems: 'center',
    gap: 20,
  },
  message: {
    color: '#334155',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  secondaryText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
  profileList: {
    gap: 12,
  },
  profileOption: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  profileOptionSelected: {
    borderColor: '#1d4ed8',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  profileAlias: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '600',
  },
  profileKey: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 15,
    textAlign: 'center',
  },
});
