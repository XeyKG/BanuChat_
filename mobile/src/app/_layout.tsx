import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/session/session-context';
import { isCcdLocal } from '@/config/demo-mode';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Protected guard={!isCcdLocal()}>
          <Stack.Screen name="calendar" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="announcements" />
        </Stack.Protected>
      </Stack>
    </SessionProvider>
  );
}
