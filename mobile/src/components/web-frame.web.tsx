import type {ReactNode} from 'react';
import {usePathname, useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useAuth} from '@/auth/auth-provider';
import {BrandMark} from '@/ui/animated';
import {colors, radii, spacing} from '@/ui/tokens';

export function WebFrame({children}: {children: ReactNode}) {
  const {snapshot, client} = useAuth();
  const router = useRouter(), pathname = usePathname();
  const desktop = useWindowDimensions().width >= 1024;
  if (snapshot.phase !== 'authenticated') return <View style={styles.main}>{children}</View>;
  return <View style={[styles.frame, {flexDirection: desktop ? 'row' : 'column'}]}>
    <View accessibilityLabel="Navegación BanuChat" style={[styles.navigation, desktop ? styles.sidebar : styles.topbar]}>
      <View style={styles.brand}><BrandMark size={32}/><Text style={styles.title}>BanuChat</Text></View>
      {desktop && <Text style={styles.copy}>Tu espacio de consulta</Text>}
      <View style={desktop ? styles.links : styles.compactLinks}>
        {([{path:'/home', label:'Inicio'}, {path:'/history', label:'Historial'}] as const).map(item =>
          <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={`Navegar a ${item.label}`}
            onPress={() => router.push(item.path)} style={[styles.link, pathname === item.path && styles.selected]}>
            <Text style={styles.linkText}>{item.label}</Text>
          </Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión web" style={styles.link}
          onPress={() => { void client.logout().finally(() => router.replace('/login')); }}>
          <Text style={styles.linkText}>Salir</Text>
        </Pressable>
      </View>
      {desktop && <View style={styles.footer}><Text style={styles.copy}>{snapshot.me?.profile.alias}</Text>
        <Text style={styles.copy}>Demostración local · cuenta ficticia</Text>
        <Text style={styles.copy}>Al recargar se cierra el acceso en esta pestaña. Usa Salir para revocar la sesión.</Text></View>}
    </View>
    <View style={styles.main}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  frame:{flex:1,minWidth:0,backgroundColor:colors.background},
  main:{flex:1,minWidth:0,minHeight:0},
  navigation:{backgroundColor:colors.surface,borderColor:colors.border,padding:spacing.md,gap:spacing.md},
  sidebar:{width:244,borderRightWidth:1,paddingTop:spacing.xl},
  topbar:{borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,padding:8,flexWrap:'wrap'},
  brand:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:19,fontWeight:'800',color:colors.brand},
  links:{gap:8,marginTop:spacing.xl},compactLinks:{flexDirection:'row',gap:2},
  link:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:radii.sm},
  selected:{backgroundColor:colors.accentSoft},linkText:{color:colors.brand,fontWeight:'700',fontSize:14},
  footer:{marginTop:'auto',gap:spacing.sm},copy:{fontSize:13,lineHeight:20,color:colors.muted},
});
