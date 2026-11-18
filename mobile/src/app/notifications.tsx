import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenHeader } from '@/components/screen-header';
import {ContentColumn,StatusBadge,SurfaceCard,secondaryStyles} from '@/components/secondary-ui';
import { useNotifications } from '@/notifications/notification-provider';
import { colors, radii, spacing, typography, textStyles } from '@/ui/tokens';

const PERMISSION_COPY = {
  checking: 'Comprobando el permiso del dispositivo...',
  undetermined: 'Aún no has decidido si BanuChat puede mostrar notificaciones.',
  granted: 'El dispositivo concedió permiso para mostrar notificaciones.',
  denied: 'El permiso fue rechazado. Puedes cambiarlo desde los ajustes del sistema.',
  unavailable: 'Las notificaciones no están disponibles en esta plataforma o ejecución.',
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotifications();

  return (
    <SafeAreaView testID="secondary-screen" style={styles.safeArea}>
      <ScreenHeader
        onAction={() => router.replace('/home')}
        subtitle="Tus permisos y recordatorios"
        title="Recordatorios"
      />
      <ScrollView contentContainerStyle={secondaryStyles.scroll}>
        <ContentColumn>

          <SurfaceCard>
            <Text style={styles.cardTitle}>Permiso y recordatorios</Text>
            <Text accessibilityLiveRegion="polite" style={styles.cardText}>
              {PERMISSION_COPY[notifications.permission]}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado local</Text>
              <StatusBadge tint={notifications.enabled?colors.success:colors.banuMuted} soft={notifications.enabled?colors.successSoft:colors.banuCanvas}>
                {notifications.enabled ? 'Activo' : 'Inactivo'}
              </StatusBadge>
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
            <AppButton tone="banu"
              label="Activar recordatorios"
              loading={notifications.busy}
              loadingLabel="Sincronizando..."
              onPress={() => void notifications.enable()}
            />

            <AppButton tone="banu"
              disabled={!notifications.enabled}
              label="Desactivar y cancelar"
              loading={notifications.busy}
              onPress={() => void notifications.disable()}
              variant="quiet"
            />
          </SurfaceCard>

          <SurfaceCard>
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
          </SurfaceCard>


        </ContentColumn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safeArea: { flex: 1, backgroundColor: colors.banuCanvas },
cardTitle: { ...textStyles.heading, color: colors.banuInk },
cardText: { color: colors.banuSecondary, fontSize: typography.body, lineHeight: 24 },
statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.banuBorder,
  },
statusLabel: { color: colors.banuInk, fontSize: typography.small, fontWeight: '700' },
errorText: { color: colors.error, fontSize: typography.small, lineHeight: 20 },
note: {
    color: colors.banuMuted,
    fontSize: typography.small,
    lineHeight: 21,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.banuCanvas,
  },
successText: { color: colors.success, fontSize: typography.small, fontWeight: '700' }
});
