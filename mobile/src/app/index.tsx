import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { AppButton } from '@/components/app-button';
import { BanuWordmark } from '@/components/banu-core';
import { isCcdLocal } from '@/config/demo-mode';
import { BrandMark } from '@/ui/animated';
import { CalendarGlyph, ChartGlyph, ChatGlyph } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';

const FEATURES = [
  { Icon: ChatGlyph, name: 'Chat con Banu', detail: 'Pregunta por cursos, pruebas diagnósticas, requisitos y costos. Abre las fuentes desde la respuesta.' },
  { Icon: ChartGlyph, name: 'Mi progreso', detail: 'Consulta el avance de tu cuenta de demostración.' },
  { Icon: CalendarGlyph, name: 'Calendario y Noticias', detail: 'Encuentra actividades, fechas y novedades de la demostración.' },
];

export default function WelcomeScreen() {
  const { snapshot } = useAuth();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 840;

  if (isCcdLocal()) return <Redirect href="/profiles" />;
  if (snapshot.phase === 'authenticated') return <Redirect href="/home" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          <BanuWordmark />
          <View style={[styles.hero, wide && styles.wideHero]}>
            <View style={styles.introduction}>
              <Text style={styles.subject}>Centro de Competencias Digitales (CCD)</Text>
              <Text accessibilityRole="header" style={[styles.title, wide && styles.wideTitle]}>
                Tu guía para Competencias Digitales
              </Text>
              <Text style={styles.body}>
                BanuChat te ayuda a entender la ruta de formación, resolver dudas y encontrar qué paso sigue.
              </Text>
              <AppButton label="Iniciar sesión" tone="banu" onPress={() => router.replace('/login')} style={styles.button} />
            </View>
            {wide && <View aria-hidden style={styles.illustration}><BrandMark size={144} framed={false} /></View>}
          </View>
          <View style={styles.features}>
            {FEATURES.map(({ Icon, name, detail }) => (
              <View key={name} style={styles.feature}>
                <View aria-hidden style={styles.icon}><Icon size={21} color={colors.banuMagenta} /></View>
                <View style={styles.featureText}>
                  <Text accessibilityRole="header" style={styles.featureTitle}>{name}</Text>
                  <Text style={styles.detail}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.banuCanvas },
  page: { flexGrow: 1, padding: spacing.lg },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: spacing.xl, paddingVertical: spacing.md },
  hero: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.banuBorder, borderRadius: radii.lg, padding: spacing.xl },
  wideHero: { flexDirection: 'row', alignItems: 'stretch', padding: spacing.xxl, gap: spacing.xl },
  introduction: { flex: 1, minWidth: 0, gap: spacing.md, alignItems: 'flex-start' },
  subject: { color: colors.banuMagenta, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  title: { color: colors.banuInk, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9 },
  wideTitle: { fontSize: 48, lineHeight: 53, letterSpacing: -1.5 },
  body: { color: colors.banuMuted, fontSize: 16, lineHeight: 24, maxWidth: 490 },
  button: { width: '100%', maxWidth: 270, marginTop: spacing.xs },
  illustration: { width: 240, backgroundColor: colors.banuNavy, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  features: { borderTopWidth: 1, borderColor: colors.banuBorder },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.banuBorder, paddingVertical: spacing.md },
  icon: { width: 32, minHeight: 24, alignItems: 'center' },
  featureText: { flex: 1, gap: spacing.xxs },
  featureTitle: { color: colors.banuInk, fontSize: 16, fontWeight: '700' },
  detail: { color: colors.banuMuted, fontSize: 14, lineHeight: 21 },
});
