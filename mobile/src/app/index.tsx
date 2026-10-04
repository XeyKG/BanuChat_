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

import { getProfiles, type ProfileSummary } from '@/api/profiles';
import { useSession } from '@/session/session-context';

type LoadState = 'loading' | 'error' | 'success';

export default function ProfileSelectorScreen() {
  const router = useRouter();
  const { selectProfile } = useSession();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSummary | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getProfiles()
      .then((result) => {
        if (!isMounted) return;
        setProfiles(result.profiles);
        setSelectedProfile(null);
        setLoadState('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setProfiles([]);
        setSelectedProfile(null);
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

  function continueWithSelectedProfile() {
    if (selectedProfile === null || isContinuing) return;

    setIsContinuing(true);
    selectProfile(selectedProfile);
    router.replace('/home');
  }

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
                      disabled={isContinuing}
                      onPress={() => {
                        setSelectedProfile(profile);
                      }}
                      style={[styles.profileOption, isSelected && styles.profileOptionSelected]}>
                      <Text style={styles.profileAlias}>{profile.alias}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedProfile === null || isContinuing }}
              disabled={selectedProfile === null || isContinuing}
              onPress={continueWithSelectedProfile}
              style={[
                styles.primaryButton,
                (selectedProfile === null || isContinuing) && styles.buttonDisabled,
              ]}>
              {isContinuing ? (
                <View style={styles.buttonProgress}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Continuando...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Continuar</Text>
              )}
            </Pressable>
          </View>
        )}
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
  buttonProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
