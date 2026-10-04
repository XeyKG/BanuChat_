import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProfiles, type ProfileSummary } from '@/api/profiles';
import { AppButton } from '@/components/app-button';
import { useSession } from '@/session/session-context';
import { colors, layout, radii, spacing, typography } from '@/ui/tokens';

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
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>Demo académica</Text>
            <Text style={styles.title}>BanuChat</Text>
            <Text style={styles.subtitle}>Selecciona un perfil de demostración</Text>
            <Text style={styles.helperText}>
              Los perfiles y la información de esta aplicación son completamente sintéticos.
            </Text>
          </View>

          {loadState === 'loading' && (
            <View accessibilityLiveRegion="polite" style={styles.stateCard}>
              <ActivityIndicator
                accessibilityLabel="Cargando perfiles"
                size="large"
                color={colors.primary}
              />
              <Text style={styles.stateText}>Cargando perfiles...</Text>
            </View>
          )}

          {loadState === 'error' && (
            <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>No fue posible cargar los perfiles</Text>
              <Text style={styles.stateText}>Comprueba la conexión con el API local.</Text>
              <AppButton label="Reintentar" onPress={retry} style={styles.stateButton} />
            </View>
          )}

          {loadState === 'success' && (
            <View style={styles.selectorCard}>
              {profiles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.stateTitle}>No hay perfiles disponibles</Text>
                  <Text style={styles.stateText}>Intenta nuevamente cuando el API tenga datos.</Text>
                </View>
              ) : (
                <View accessibilityRole="radiogroup" style={styles.profileList}>
                  {profiles.map((profile) => {
                    const isSelected = selectedProfile?.profile_key === profile.profile_key;
                    return (
                      <Pressable
                        key={profile.profile_key}
                        accessibilityLabel={`Seleccionar perfil ${profile.alias}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected, disabled: isContinuing }}
                        disabled={isContinuing}
                        onPress={() => setSelectedProfile(profile)}
                        style={({ pressed }) => [
                          styles.profileOption,
                          isSelected && styles.profileOptionSelected,
                          pressed && !isContinuing && styles.pressed,
                        ]}>
                        <View style={styles.profileCopy}>
                          <Text style={styles.profileLabel}>Perfil de demostración</Text>
                          <Text style={styles.profileAlias}>{profile.alias}</Text>
                        </View>
                        <View
                          aria-hidden
                          style={[styles.selectionMark, isSelected && styles.selectionMarkSelected]}>
                          {isSelected && <Text style={styles.selectionMarkText}>✓</Text>}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <AppButton
                disabled={selectedProfile === null}
                label="Continuar"
                loading={isContinuing}
                loadingLabel="Continuando..."
                onPress={continueWithSelectedProfile}
                style={styles.continueButton}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  heading: { gap: spacing.xs },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: { color: colors.brand, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  subtitle: { color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  helperText: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  selectorCard: {
    gap: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  profileList: { gap: spacing.sm },
  profileOption: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  profileOptionSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  profileCopy: { flex: 1, gap: spacing.xxs },
  profileLabel: { color: colors.muted, fontSize: typography.caption, fontWeight: '600' },
  profileAlias: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  selectionMark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  selectionMarkSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  selectionMarkText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  continueButton: { width: '100%' },
  stateCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  errorCard: { borderColor: '#FECACA', backgroundColor: colors.errorSoft },
  stateTitle: {
    color: colors.text,
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
  stateButton: { minWidth: 144 },
  emptyState: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  pressed: { opacity: 0.72 },
});
