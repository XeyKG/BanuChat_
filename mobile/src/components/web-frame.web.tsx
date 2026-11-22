import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useGlobalSearchParams, usePathname, useRouter, type Href} from 'expo-router';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useAuth} from '@/auth/auth-provider';
import {createConversation} from '@/api/conversations';
import {MonogramAvatar} from '@/ui/animated';
import {colors, radii, spacing, textStyles} from '@/ui/tokens';
import {BanuBottomNav,BanuWordmark} from '@/components/banu-core';
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
  const viewportWidth=useWindowDimensions().width;
  const desktop = viewportWidth >= 760;
  const tablet=desktop&&viewportWidth<=1040;
  const [menu,setMenu] = useState(false), [chatMenu,setChatMenu] = useState(false);
  const menuTrigger=useRef<HTMLElement|null>(null);
  const [starting,setStarting] = useState(false), [error,setError] = useState(false);
  const startingRef = useRef(false);
  const [lastChat,setLastChat] = useState<string|null>(null);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&(menu||chatMenu)){setMenu(false);setChatMenu(false);const trigger=menuTrigger.current;const fallback=document.querySelector<HTMLElement>(desktop?'[aria-label="Navegar a Chat"]':'[aria-label="Menú de navegación"]');(menu&&!desktop&&trigger?.checkVisibility({checkVisibilityCSS:true})?trigger:fallback)?.focus();}};
    document.addEventListener('keydown',escape);
    return()=>document.removeEventListener('keydown',escape);
  },[menu,chatMenu,desktop]);
  useEffect(()=>{focusContent();},[pathname]);
  // Route-derived state: remember the latest real conversation before rendering
  // its navigation affordance. Same session lifetime as the former ref.
  if (pathname === '/chat' && typeof params.conversation_id === 'string' && lastChat !== params.conversation_id) setLastChat(params.conversation_id);
  const can = (capability:string) => snapshot.me?.capabilities.includes(capability) === true;
  const links = [
    {path:'/home',label:'Inicio',enabled:true,Icon:SparkGlyph},
    {path:'/history',label:'Historial',enabled:can('history'),Icon:ClockGlyph},
    {path:'/progress',label:'Progreso',enabled:can('progress'),Icon:ChartGlyph},
    {path:'/calendar',label:'Calendario',enabled:can('calendar'),Icon:CalendarGlyph},
    {path:'/announcements',label:'Noticias',enabled:can('announcements'),Icon:DocGlyph},
  ];
  function closeMenu(){setMenu(false);setChatMenu(false);}
  function toggleMenu(){
    if(!menu){
      const active=document.activeElement;
      menuTrigger.current=active instanceof HTMLElement&&['Menú de navegación','Más en navegación inferior'].includes(active.getAttribute('aria-label')??'')?active:document.querySelector('[aria-label="Menú de navegación"]');
      requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector<HTMLElement>('#web-navigation [role="button"]')?.focus()));
    }
    setMenu(value=>!value);
  }
  function focusContent(){requestAnimationFrame(()=>requestAnimationFrame(()=>{const heading=[...document.querySelectorAll<HTMLElement>('[data-testid="core-page-heading"]')].find(element=>element.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!element.closest('[aria-hidden="true"]'));(heading??document.getElementById('web-main'))?.focus();}));}
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
    <View nativeID="web-navigation-shell" style={[styles.navigation, desktop ? styles.sidebar : styles.topbar,tablet&&styles.tabletSidebar]}>
      <View style={styles.brandRow}><BanuWordmark compact={!desktop}/>
        {!desktop && <Pressable accessibilityRole="button" accessibilityLabel="Menú de navegación" aria-expanded={menu} aria-controls="web-navigation" style={styles.link} onPress={toggleMenu}><Text style={styles.linkText}>{menu?'Cerrar menú':'Menú'}</Text></Pressable>}
      </View>
      {desktop && <Text style={styles.copy}>Tu compañero académico</Text>}
      {desktop&&can('chat')&&<Pressable accessibilityRole="button" accessibilityLabel="Crear conversación desde navegación" disabled={starting} accessibilityState={{disabled:starting,busy:starting}} onPress={()=>void newChat()} style={styles.newChat}><Text style={styles.newChatText}>{starting?'Creando…':'Nueva conversación'}</Text><Text aria-hidden style={styles.newChatText}>＋</Text></Pressable>}
      {desktop&&error&&<Text accessibilityRole="alert" style={styles.copy}>No fue posible crear la conversación. Puedes intentarlo de nuevo.</Text>}
      {(desktop||menu) && <ScrollView nativeID="web-navigation" role="navigation" accessibilityLabel="Navegación BanuChat" style={styles.navScroll} contentContainerStyle={styles.links}><Text style={styles.groupLabel}>MI ESPACIO</Text>
        {links.filter(item=>item.enabled).map((item,index) => <View key={item.path}>
          {index===2 && <Text style={styles.groupLabel}>EXPLORAR</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Navegar a ${item.label}`} aria-current={pathname===item.path?'page':undefined}
            onPress={() => go(item.path)} style={[styles.link, pathname === item.path && styles.selected]}>
            <View style={styles.navLabel}><item.Icon size={18} color={pathname===item.path?colors.banuMagenta:colors.banuMuted}/><Text style={styles.linkText}>{item.path==='/history'?'Mis conversaciones':item.path==='/progress'?'Mi progreso':item.label}</Text></View>
          </Pressable>
          {index===0 && can('chat') && <>
            <Pressable accessibilityRole="button" accessibilityLabel="Navegar a Chat" aria-expanded={chatMenu} aria-current={pathname==='/chat'?'page':undefined} style={[styles.link,pathname==='/chat'&&styles.selected]} onPress={()=>setChatMenu(v=>!v)}><View style={styles.navLabel}><ChatGlyph size={18} color={pathname==='/chat'?colors.banuMagenta:colors.banuMuted}/><Text style={styles.linkText}>Conversar con Banu</Text></View></Pressable>
            {chatMenu && <View style={styles.chatActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Nueva conversación web" disabled={starting} accessibilityState={{disabled:starting,busy:starting}} style={styles.link} onPress={()=>void newChat()}><Text style={styles.linkText}>{starting?'Creando...':'Nueva conversación'}</Text></Pressable>
              {lastChat && <Pressable accessibilityRole="button" style={styles.link} onPress={()=>{router.navigate({pathname:'/chat',params:{conversation_id:lastChat}});closeMenu();focusContent();}}><Text style={styles.linkText}>Volver al chat abierto</Text></Pressable>}
              {can('history') && <Pressable accessibilityRole="button" style={styles.link} onPress={()=>go('/history')}><Text style={styles.linkText}>Continuar desde historial</Text></Pressable>}
              {error && <Text accessibilityRole="alert" style={styles.copy}>No fue posible crear la conversación. Puedes intentarlo de nuevo.</Text>}
            </View>}
          </>}
        </View>)}
        {!desktop&&<Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión web" style={styles.link}
          onPress={() => { void client.logout().finally(() => router.replace('/login')); }}>
          <Text style={styles.linkText}>Cerrar sesión</Text>
        </Pressable>}
      </ScrollView>}
      {desktop && <View style={[styles.footer,tablet&&styles.tabletFooter]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión web" style={styles.link} onPress={()=>{void client.logout().finally(()=>router.replace('/login'));}}><Text style={styles.linkText}>Cerrar sesión</Text></Pressable>
        <View style={styles.account}><MonogramAvatar alias={snapshot.me?.profile.alias??'BanuChat'} size={32}/><Text style={styles.accountName}>{snapshot.me?.profile.alias}</Text></View>
        <Text style={[styles.copy,styles.footerCopy]}>Demostración local · cuenta ficticia</Text>
        <Text style={[styles.copy,styles.footerCopy]}>Al recargar se cierra el acceso en esta pestaña. Usa Cerrar sesión para revocarlo.</Text></View>}
    </View>
    <View nativeID="web-main" role="main" tabIndex={-1} style={styles.main}>{desktop&&pathname!=='/chat'&&<View testID="core-topline" style={styles.topline}><Text style={styles.copy}>Mi espacio　/　{links.find(item=>item.path===pathname)?.label??'Documento'}</Text><Text style={styles.localPill}>Demostración local</Text></View>}{children}</View>
    {!desktop&&<BanuBottomNav active={pathname==='/home'?'home':pathname==='/chat'?'chat':'other'} onHome={()=>go('/home')} onChat={()=>{if(pathname==='/chat')focusContent();else if(lastChat)router.navigate({pathname:'/chat',params:{conversation_id:lastChat}});else void newChat();}} onHistory={()=>go('/history')} onMenu={toggleMenu} menuExpanded={menu} menuControls="web-navigation" busy={starting} canChat={can('chat')} canHistory={can('history')}/>}
  </View>;
}
const styles = StyleSheet.create({
  newChat:{minHeight:48,marginHorizontal:spacing.xs,borderRadius:radii.sm,backgroundColor:colors.banuNavy,paddingHorizontal:spacing.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},newChatText:{color:colors.white,fontSize:13,fontWeight:'600'},topline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:48,paddingTop:spacing.xxl,paddingBottom:spacing.xs},localPill:{fontSize:11,color:colors.banuMuted,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.pill,paddingHorizontal:spacing.sm,paddingVertical:6,backgroundColor:colors.surface},
  frame:{flex:1,minWidth:0,backgroundColor:colors.banuCanvas},
  main:{flex:1,minWidth:0,minHeight:0},
  navigation:{backgroundColor:colors.surface,borderColor:colors.banuBorder,padding:spacing.md,gap:spacing.md},
  sidebar:{width:246,borderRightWidth:1,borderRightColor:colors.banuBorder,paddingTop:spacing.xl},
  tabletSidebar:{paddingVertical:spacing.sm,gap:spacing.xs},
  tabletFooter:{gap:spacing.xxs,paddingTop:spacing.xs},
  topbar:{borderBottomWidth:1,borderBottomColor:colors.banuBorder,padding:12,maxHeight:'65%'},
  brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brand:{flexDirection:'row',alignItems:'center',gap:spacing.sm},title:{fontSize:20,fontWeight:'800',letterSpacing:-0.6,color:colors.banuNavy},
  navScroll:{flex:1,minHeight:0},links:{gap:4},chatActions:{paddingLeft:12,borderLeftWidth:2,borderColor:colors.banuBorder},
  link:{minHeight:48,justifyContent:'center',paddingVertical:spacing.xs,paddingHorizontal:spacing.sm,borderRadius:radii.sm},
  navLabel:{flexDirection:'row',alignItems:'center',gap:12},
  selected:{backgroundColor:colors.banuSoft},linkText:{color:colors.banuNavy,fontWeight:'400',fontSize:13},
  groupLabel:{...textStyles.eyebrow,color:colors.banuMuted,paddingHorizontal:spacing.sm,paddingTop:spacing.lg,paddingBottom:spacing.xs},
  footer:{marginTop:'auto',gap:spacing.sm,borderTopWidth:1,borderColor:colors.banuBorder,paddingTop:spacing.md},
  account:{flexDirection:'row',alignItems:'center',gap:spacing.xs},accountName:{...textStyles.small,color:colors.banuInk,fontWeight:'600',flex:1},
  footerCopy:{fontSize:11,lineHeight:17},
  copy:{fontSize:13,lineHeight:20,color:colors.banuMuted},
});
