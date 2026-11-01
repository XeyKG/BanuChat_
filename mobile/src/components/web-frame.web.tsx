import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useGlobalSearchParams, usePathname, useRouter, type Href} from 'expo-router';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useAuth} from '@/auth/auth-provider';
import {createConversation} from '@/api/conversations';
import {BrandMark} from '@/ui/animated';
import {colors, radii, spacing} from '@/ui/tokens';

export function WebFrame({children}: {children: ReactNode}) {
  const {snapshot} = useAuth();
  if (snapshot.phase !== 'authenticated') return <View style={styles.main}>{children}</View>;
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
    const sheet=document.createElement('style');
    sheet.textContent='[role="button"]:focus-visible,[role="radio"]:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #3B4FE0;outline-offset:3px}.web-skip{position:absolute;left:8px;top:-100px;z-index:100;background:white;padding:12px}.web-skip:focus{top:8px}';
    document.head.append(sheet);
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);setChatMenu(false);document.querySelector<HTMLElement>('[aria-label="Menú de navegación"]')?.focus();}};
    document.addEventListener('keydown',escape);
    return()=>{sheet.remove();document.removeEventListener('keydown',escape);};
  },[]);
  if (pathname === '/chat' && typeof params.conversation_id === 'string') lastChat.current = params.conversation_id;
  const can = (capability:string) => snapshot.me?.capabilities.includes(capability) === true;
  const links = [
    {path:'/home',label:'Inicio',enabled:true},
    {path:'/history',label:'Historial',enabled:can('history')},
    {path:'/progress',label:'Progreso',enabled:can('progress')},
    {path:'/calendar',label:'Calendario',enabled:can('calendar')},
    {path:'/announcements',label:'Anuncios y convocatorias',enabled:can('announcements')},
    {path:'/oe2',label:'Publicaciones OE2',enabled:can('progress')},
    {path:'/oe2-changes',label:'Banu al día',enabled:can('progress')},
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
  return <View style={[styles.frame, {flexDirection: desktop ? 'row' : 'column'}]}>
    <a className="web-skip" href="#web-main">Saltar al contenido</a>
    <View style={[styles.navigation, desktop ? styles.sidebar : styles.topbar]}>
      <View style={styles.brandRow}><View style={styles.brand}><BrandMark size={32}/><Text style={styles.title}>BanuChat</Text></View>
        {!desktop && <Pressable accessibilityRole="button" accessibilityLabel="Menú de navegación" aria-expanded={menu} aria-controls="web-navigation" style={styles.link} onPress={()=>setMenu(v=>!v)}><Text style={styles.linkText}>{menu?'Cerrar menú':'Menú'}</Text></Pressable>}
      </View>
      {desktop && <Text style={styles.copy}>Tu espacio de consulta</Text>}
      {(desktop||menu) && <ScrollView nativeID="web-navigation" role="navigation" accessibilityLabel="Navegación BanuChat" style={styles.navScroll} contentContainerStyle={styles.links}>
        {links.filter(item=>item.enabled).map((item,index) => <View key={item.path}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Navegar a ${item.label}`} aria-current={pathname===item.path?'page':undefined}
            onPress={() => go(item.path)} style={[styles.link, pathname === item.path && styles.selected]}>
            <Text style={styles.linkText}>{item.label}</Text>
          </Pressable>
          {index===0 && can('chat') && <>
            <Pressable accessibilityRole="button" accessibilityLabel="Navegar a Chat" aria-expanded={chatMenu} aria-current={pathname==='/chat'?'page':undefined} style={[styles.link,pathname==='/chat'&&styles.selected]} onPress={()=>setChatMenu(v=>!v)}><Text style={styles.linkText}>Chat</Text></Pressable>
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
      {desktop && <View style={styles.footer}><Text style={styles.copy}>{snapshot.me?.profile.alias}</Text>
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
  sidebar:{width:244,borderRightWidth:1,paddingTop:spacing.xl},
  topbar:{borderBottomWidth:1,padding:8,maxHeight:'65%'},
  brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brand:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:19,fontWeight:'800',color:colors.brand},
  navScroll:{flexShrink:1},links:{gap:4},chatActions:{paddingLeft:12,borderLeftWidth:2,borderColor:colors.border},
  link:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:radii.sm},
  selected:{backgroundColor:colors.accentSoft},linkText:{color:colors.brand,fontWeight:'700',fontSize:14},
  footer:{marginTop:'auto',gap:spacing.sm},copy:{fontSize:13,lineHeight:20,color:colors.muted},
});
