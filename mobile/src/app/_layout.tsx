import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider,useSession } from '@/session/session-context';
import { isCcdLocal } from '@/config/demo-mode';
import {AuthProvider,useAuth} from '@/auth/auth-provider';
import {NotificationProvider} from '@/notifications/notification-provider';
import {ActivityIndicator,View} from 'react-native';

export default function RootLayout() {
  return <AuthProvider><NotificationProvider><SessionProvider><Navigation /></SessionProvider></NotificationProvider></AuthProvider>;
}

function Navigation(){
  const {snapshot}=useAuth();const {activeProfile}=useSession();const ccd=isCcdLocal();
  if(!ccd&&snapshot.phase==='restoring')return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Validando sesión" /></View>;
  const authenticated=ccd?activeProfile!==null:snapshot.phase==='authenticated';
  return (
    <View style={{flex:1}}>
      <StatusBar style="dark" />
      <Stack key={ccd?'ccd':authenticated?String(snapshot.epoch):'signed-out'} initialRouteName={ccd?'profiles':authenticated?'home':snapshot.epoch>0?'login':'index'} screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!ccd&&!authenticated}><Stack.Screen name="login" /></Stack.Protected>
        <Stack.Protected guard={ccd}><Stack.Screen name="profiles" /></Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="home" /><Stack.Screen name="chat" /><Stack.Screen name="history" /><Stack.Screen name="document" />
        </Stack.Protected>
        <Stack.Protected guard={!ccd&&authenticated&&snapshot.me?.capabilities.includes('progress')===true}>
          <Stack.Screen name="calendar" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="announcements" />
          <Stack.Screen name="notifications" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
