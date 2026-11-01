import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useGlobalSearchParams, usePathname, useRouter, type Href} from 'expo-router';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useAuth} from '@/auth/auth-provider';
import {createConversation} from '@/api/conversations';
import {BrandMark, MonogramAvatar} from '@/ui/animated';
import {colors, radii, spacing, textStyles} from '@/ui/tokens';
import {webAppearance} from '@/ui/web-appearance';
import {CalendarGlyph, ChartGlyph, ChatGlyph, ClockGlyph, DocGlyph, SparkGlyph} from '@/ui/icons';

export function WebFrame({children}: {children: ReactNode}) {
  const {snapshot} = useAuth();
  useEffect(()=>{
    const sheet=document.createElement('style');sheet.textContent=webAppearance;
    document.head.append(sheet);return()=>sheet.remove();
  },[]);
  if (snapshot.phase !== 'authenticated') return <View nativeID="banu-web-frame" style={styles.main}>{children}</View>;
  return <AuthenticatedFrame key={snapshot.epoch}>{children}</AuthenticatedFrame>;
}

function AuthenticatedFrame({children}: {children: ReactNode}) {
  const {snapshot, client} = useAuth();
  const router = useRouter(), pathname = usePathname();
  const params = useGlobalSearchParams<{conversation_id?:string}>();
  const desktop = useWindowDimensions().width >= 1024;
  const [menu,setMenu] = useState(false), [chatMenu,setChatMenu] = useState(false);
  const [starting,setStarting] = useState(false), [error,setError] = useState(false);
  const startingRef = useRef(false), lastChat = useRef<string|null>(null);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&(menu||chatMenu)){setMenu(false);setChatMenu(false);document.querySelector<HTMLElement>(desktop?'[aria-label="Navegar a Chat"]':'[aria-label="Menú de navegación"]')?.focus();}};
    document.addEventListener('keydown',escape);
    return()=>document.removeEventListener('keydown',escape);
  },[menu,chatMenu,desktop]);
  if (pathname === '/chat' && typeof params.conversation_id === 'string') lastChat.current = params.conversation_id;
  const can = (capability:string) => snapshot.me?.capabilities.includes(capability) === true;
  const links = [
    {path:'/home',label:'Inicio',enabled:true,Icon:SparkGlyph},
    {path:'/history',label:'Historial',enabled:can('history'),Icon:ClockGlyph},
    {path:'/progress',label:'Progreso',enabled:can('progress'),Icon:ChartGlyph},
    {path:'/calendar',label:'Calendario',enabled:can('calendar'),Icon:CalendarGlyph},
    {path:'/announcements',label:'Anuncios y convocatorias',enabled:can('announcements'),Icon:DocGlyph},
    {path:'/oe2',label:'Publicaciones OE2',enabled:can('progress'),Icon:DocGlyph},
    {path:'/oe2-changes',label:'Banu al día',enabled:can('progress'),Icon:SparkGlyph},
  ];
  function closeMenu(){setMenu(false);setChatMenu(false);}
  function focusContent(){requestAnimationFrame(()=>document.getElementById('web-main')?.focus());}
  function go(path:string){if(pathname!==path)router.push(path as Href);closeMenu();focusContent();}
  async function newChat(){
    if(startingRef.current || !snapshot.me)return;
    startingRef.current=true;setStarting(true);setError(false);
    const epoch=snapshot.epoch;
    try{
      const conversation=await createConversation(snapshot.me.profile.profile_key);
      if(client.getSnapshot().epoch!==epoch)return;
      router.push({pathname:'/chat',params:{conversation_id:conversation.conversation_id}});closeMenu();
    }catch{if(client.getSnapshot().epoch===epoch)setError(true);}
    finally{startingRef.current=false;setStarting(false);}
  }
  // Keep the screen subtree stable at every breakpoint, preserving chat state.
  return <View nativeID="banu-web-frame" style={[styles.frame, {flexDirection: desktop ? 'row' : 'column'}]}>
    <a className="web-skip" href="#web-main">Saltar al contenido</a>
    <View style={[styles.navigation, desktop ? styles.sidebar : styles.topbar]}>
      <View style={styles.brandRow}><View style={styles.brand}><BrandMark size={32}/><Text style={styles.title}>BanuChat</Text></View>
        {!desktop && <Pressable accessibilityRole="button" accessibilityLabel="Menú de navegación" aria-expanded={menu} aria-controls="web-navigation" style={styles.link} onPress={()=>setMenu(v=>!v)}><Text style={styles.linkText}>{menu?'Cerrar menú':'Menú'}</Text></Pressable>}
      </View>
      {desktop && <Text style={styles.copy}>Tu asistente académico</Text>}
      {(desktop||menu) && <ScrollView nativeID="web-navigation" role="navigation" accessibilityLabel="Navegación BanuChat" style={styles.navScroll} contentContainerStyle={styles.links}>
        {links.filter(item=>item.enabled).map((item,index) => <View key={item.path}>
          {index===2 && <Text style={styles.groupLabel}>EXPLORAR</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Navegar a ${item.label}`} aria-current={pathname===item.path?'page':undefined}
            onPress={() => go(item.path)} style={[styles.link, pathname === item.path && styles.selected]}>
            <View style={styles.navLabel}><item.Icon size={18} color={pathname===item.path?colors.accent:colors.muted}/><Text style={styles.linkText}>{item.label}</Text></View>
          </Pressable>
          {index===0 && can('chat') && <>
            <Pressable accessibilityRole="button" accessibilityLabel="Navegar a Chat" aria-expanded={chatMenu} aria-current={pathname==='/chat'?'page':undefined} style={[styles.link,pathname==='/chat'&&styles.selected]} onPress={()=>setChatMenu(v=>!v)}><View style={styles.navLabel}><ChatGlyph size={18}/><Text style={styles.linkText}>Chat</Text></View></Pressable>
            {chatMenu && <View style={styles.chatActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Nueva conversación web" disabled={starting} accessibilityState={{disabled:starting,busy:starting}} style={styles.link} onPress={()=>void newChat()}><Text style={styles.linkText}>{starting?'Creando...':'Nueva conversación'}</Text></Pressable>
              {lastChat.current && <Pressable accessibilityRole="button" style={styles.link} onPress={()=>{router.navigate({pathname:'/chat',params:{conversation_id:lastChat.current!}});closeMenu();focusContent();}}><Text style={styles.linkText}>Volver al chat abierto</Text></Pressable>}
              {can('history') && <Pressable accessibilityRole="button" style={styles.link} onPress={()=>go('/history')}><Text style={styles.linkText}>Continuar desde historial</Text></Pressable>}
              {error && <Text accessibilityRole="alert" style={styles.copy}>No fue posible crear la conversación. Puedes intentarlo de nuevo.</Text>}
            </View>}
          </>}
        </View>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión web" style={styles.link}
          onPress={() => { void client.logout().finally(() => router.replace('/login')); }}>
          <Text style={styles.linkText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>}
      {desktop && <View style={styles.footer}><View style={styles.account}><MonogramAvatar alias={snapshot.me?.profile.alias??'BanuChat'} size={32}/><Text style={styles.accountName}>{snapshot.me?.profile.alias}</Text></View>
        <Text style={styles.copy}>Demostración local · cuenta ficticia</Text>
        <Text style={styles.copy}>Al recargar se cierra el acceso en esta pestaña. Usa Cerrar sesión para revocarlo.</Text></View>}
    </View>
    <View nativeID="web-main" role="main" tabIndex={-1} style={styles.main}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  frame:{flex:1,minWidth:0,backgroundColor:colors.background},
  main:{flex:1,minWidth:0,minHeight:0},
  navigation:{backgroundColor:colors.surface,borderColor:colors.border,padding:spacing.md,gap:spacing.md},
  sidebar:{width:248,borderRightWidth:1,borderRightColor:colors.border,paddingTop:spacing.xl},
  topbar:{borderBottomWidth:1,borderBottomColor:colors.border,padding:12,maxHeight:'65%'},
  brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brand:{flexDirection:'row',alignItems:'center',gap:spacing.sm},title:{fontSize:20,fontWeight:'800',letterSpacing:-0.6,color:colors.brand},
  navScroll:{flexShrink:1},links:{gap:4},chatActions:{paddingLeft:12,borderLeftWidth:2,borderColor:colors.border},
  link:{minHeight:48,justifyContent:'center',paddingVertical:spacing.xs,paddingHorizontal:spacing.sm,borderRadius:radii.sm},
  navLabel:{flexDirection:'row',alignItems:'center',gap:12},
  selected:{backgroundColor:colors.accentSoft},linkText:{color:colors.brand,fontWeight:'600',fontSize:14},
  groupLabel:{...textStyles.eyebrow,color:colors.muted,paddingHorizontal:spacing.sm,paddingTop:spacing.lg,paddingBottom:spacing.xs},
  footer:{marginTop:'auto',gap:spacing.sm,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.md},
  account:{flexDirection:'row',alignItems:'center',gap:spacing.xs},accountName:{...textStyles.small,color:colors.ink,fontWeight:'600',flex:1},
  copy:{fontSize:13,lineHeight:20,color:colors.muted},
});
