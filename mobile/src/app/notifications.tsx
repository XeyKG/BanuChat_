import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import { useNotifications } from '@/notifications/notification-provider';
import { colors, layout, radii, shadows, spacing, typography } from '@/ui/tokens';

const PERMISSION_COPY = {
  checking: 'Comprobando el permiso del dispositivo...',
  undetermined: 'Aún no has decidido si BanuChat puede mostrar notificaciones.',
  granted: 'El dispositivo concedió permiso para mostrar notificaciones.',
  denied: 'El permiso fue rechazado. Puedes cambiarlo desde los ajustes del sistema.',
  unavailable: 'Las notificaciones no están disponibles en esta plataforma o ejecución.',
} as const;

const REMOTE_COPY = {
  expo_go:
    'Push remoto no disponible en Expo Go para este SDK. Requiere un development build y un dispositivo físico.',
  simulator: 'Push remoto requiere un dispositivo físico; el simulador no acredita recepción.',
  project_unconfigured:
    'El development build aún no tiene un projectId/credenciales de push configurados.',
  backend_unavailable:
    'El cliente está preparado para recibir, pero REST no tiene un contrato autorizado para registrar, renovar o revocar tokens por cuenta.',
  platform_unavailable: 'Push remoto no está disponible en esta plataforma.',
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotifications();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Tus permisos y recordatorios"
        title="Notificaciones"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Permiso y recordatorios</Text>
            <Text accessibilityLiveRegion="polite" style={styles.cardText}>
              {PERMISSION_COPY[notifications.permission]}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado local</Text>
              <Text style={[styles.statusValue, notifications.enabled && styles.statusEnabled]}>
                {notifications.enabled ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <Text style={styles.cardText}>
              {notifications.scheduledCount === 1
                ? '1 recordatorio futuro programado.'
                : `${notifications.scheduledCount} recordatorios futuros programados.`}
            </Text>
            {notifications.error && (
              <Text accessibilityRole="alert" style={styles.errorText}>
                No fue posible completar la operación. Revisa la conexión y vuelve a intentarlo.
              </Text>
            )}
            <AppButton
              label="Activar y sincronizar recordatorios"
              loading={notifications.busy}
              loadingLabel="Sincronizando..."
              onPress={() => void notifications.enable()}
            />
            <AppButton
              disabled={notifications.permission === 'denied'}
              label="Enviar prueba local en 5 segundos"
              loading={notifications.busy}
              onPress={() => void notifications.sendLocalTest()}
              variant="secondary"
            />
            <AppButton
              disabled={!notifications.enabled}
              label="Desactivar y cancelar"
              loading={notifications.busy}
              onPress={() => void notifications.disable()}
              variant="quiet"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Qué se programa</Text>
            <Text style={styles.cardText}>
              BanuChat usa tus eventos de calendario y novedades. Los
              recordatorios futuros se programan 24 horas antes y se reemplazan por clave estable
              para evitar duplicados.
            </Text>
            <Text style={styles.cardText}>
              Al abrir una notificación, la app valida la cuenta activa y lleva a Calendario o
              Anuncios. Al cerrar o cambiar de cuenta cancela lo programado para la cuenta anterior.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Push remoto</Text>
            <Text style={styles.cardText}>{REMOTE_COPY[notifications.remoteState]}</Text>
            <Text style={styles.note}>
              La prueba local no sustituye push remoto. BanuChat no muestra ni persiste tokens en la
              interfaz y no incluye contraseñas, secretos ni datos personales en el payload.
            </Text>
            {notifications.lastReceivedAt !== null && (
              <Text accessibilityLiveRegion="polite" style={styles.successText}>
                La aplicación recibió una notificación durante esta apertura.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  cardTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  cardText: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 24 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  statusValue: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  statusEnabled: { color: colors.success },
  errorText: { color: colors.error, fontSize: typography.small, lineHeight: 20 },
  note: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 21,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  successText: { color: colors.success, fontSize: typography.small, fontWeight: '700' },
});
