import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProfiles, type ProfileSummary } from '@/api/profiles';
import { AppButton } from '@/components/app-button';
import { useSession } from '@/session/session-context';
import { BrandMark, FadeIn, MonogramAvatar, PressableScale } from '@/ui/animated';
import { CheckGlyph, ChevronGlyph } from '@/ui/icons';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

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
          <FadeIn>
            <View style={styles.heading}>
              <View style={styles.brandRow}>
                <BrandMark size={40} />
                <Text style={styles.brandName}>BanuChat</Text>
              </View>
              <Text style={styles.title}>Elige tu perfil</Text>
              <Text style={styles.helperText}>
                Selecciona un perfil de demostración para comenzar. Toda la información es
                completamente sintética.
              </Text>
            </View>
          </FadeIn>

          {loadState === 'loading' && (
            <FadeIn delay={120}>
              <View accessibilityLiveRegion="polite" style={styles.stateCard}>
                <ActivityIndicator
                  accessibilityLabel="Cargando perfiles"
                  size="large"
                  color={colors.accent}
                />
                <Text style={styles.stateText}>Cargando perfiles...</Text>
              </View>
            </FadeIn>
          )}

          {loadState === 'error' && (
            <FadeIn delay={120}>
              <View accessibilityLiveRegion="polite" style={[styles.stateCard, styles.errorCard]}>
                <Text style={styles.stateTitle}>No fue posible cargar los perfiles</Text>
                <Text style={styles.stateText}>Comprueba la conexión con el API local.</Text>
                <AppButton label="Reintentar" onPress={retry} style={styles.stateButton} />
              </View>
            </FadeIn>
          )}

          {loadState === 'success' && profiles.length === 0 && (
            <FadeIn delay={120}>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>No hay perfiles disponibles</Text>
                <Text style={styles.stateText}>Intenta nuevamente cuando el API tenga datos.</Text>
                <AppButton label="Reintentar" onPress={retry} style={styles.stateButton} />
              </View>
            </FadeIn>
          )}

          {loadState === 'success' && profiles.length > 0 && (
            <>
              <View accessibilityRole="radiogroup" style={styles.profileList}>
                {profiles.map((profile, index) => {
                  const isSelected = selectedProfile?.profile_key === profile.profile_key;
                  return (
                    <FadeIn key={profile.profile_key} delay={120 + index * 90}>
                      <PressableScale
                        accessibilityLabel={`Seleccionar perfil ${profile.alias}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected, disabled: isContinuing }}
                        disabled={isContinuing}
                        onPress={() => setSelectedProfile(profile)}>
                        <View style={[styles.profileOption, isSelected && styles.profileOptionSelected]}>
                          <MonogramAvatar alias={profile.alias} size={48} />
                          <View style={styles.profileCopy}>
                            <Text style={styles.profileLabel}>Perfil de demostración</Text>
                            <Text style={styles.profileAlias}>{profile.alias}</Text>
                          </View>
                          {isSelected ? (
                            <View style={styles.selectionMarkSelected}>
                              <CheckGlyph color={colors.white} size={13} />
                            </View>
                          ) : (
                            <ChevronGlyph color={colors.muted} size={16} />
                          )}
                        </View>
                      </PressableScale>
                    </FadeIn>
                  );
                })}
              </View>

              <FadeIn delay={140 + profiles.length * 90}>
                <AppButton
                  disabled={selectedProfile === null}
                  label="Continuar"
                  loading={isContinuing}
                  loadingLabel="Continuando..."
                  onPress={continueWithSelectedProfile}
                  style={styles.continueButton}
                />
              </FadeIn>
            </>
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
  heading: { gap: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  title: { color: colors.ink, fontSize: typography.display, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  helperText: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 24 },
  profileList: { gap: spacing.sm },
  profileOption: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  profileOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  profileCopy: { flex: 1, gap: 2 },
  profileLabel: { color: colors.muted, fontSize: typography.caption, fontWeight: '600' },
  profileAlias: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  selectionMarkSelected: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.accent,
  },
  continueButton: { width: '100%' },
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
  stateButton: { minWidth: 160 },
  pressed: { opacity: 0.7 },
});
