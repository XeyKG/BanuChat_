import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BanuChat</Text>
      <Text style={styles.message}>
        La conexión con la API REST se configurará localmente en este dispositivo.
      </Text>
      <Text style={styles.configuration}>EXPO_PUBLIC_API_BASE_URL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    color: '#172554',
    fontSize: 32,
    fontWeight: '700',
  },
  message: {
    maxWidth: 320,
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  configuration: {
    color: '#64748b',
    fontSize: 14,
  },
});
