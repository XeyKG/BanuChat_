import {useEffect, useState, type ReactNode} from 'react';
import {useRouter, type Href} from 'expo-router';
import {BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@/auth/auth-provider';
import {BrandMark} from '@/ui/animated';
import {ChatGlyph, ClockGlyph, SparkGlyph} from '@/ui/icons';
import {colors, layout, radii, spacing} from '@/ui/tokens';

export function BanuWordmark({compact=false}: {compact?:boolean}) {
  return <View style={styles.brand}><BrandMark size={compact?36:44} framed={false}/><Text style={styles.wordmark}>Banu<Text style={styles.magenta}>Chat</Text></Text></View>;
}

export function BanuPageHeading({eyebrow,title,subtitle,action,titleTestID}: {eyebrow:string;title:string;subtitle:string;action?:ReactNode;titleTestID?:string}) {
  return <View testID="core-page-heading" tabIndex={Platform.OS==='web'?-1:undefined} style={styles.heading}>
    <View style={styles.headingCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" testID={titleTestID} style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>{action}
  </View>;
}

export function BanuBottomNav({active,onHome,onChat,onHistory,onMenu,busy=false,canChat=true,canHistory=true,menuExpanded=false,menuControls}: {active:'home'|'chat'|'other';onHome:()=>void;onChat:()=>void;onHistory:()=>void;onMenu:()=>void;busy?:boolean;canChat?:boolean;canHistory?:boolean;menuExpanded?:boolean;menuControls?:string}) {
  const items=[{label:'Inicio',key:'home',Icon:SparkGlyph,onPress:onHome},{label:'Chat',key:'chat',Icon:ChatGlyph,onPress:onChat},{label:'Historial',key:'history',Icon:ClockGlyph,onPress:onHistory},{label:'Más',key:'more',Icon:null,onPress:onMenu}];
  return <View testID="core-bottom-nav" style={styles.bottom}>{items.filter(item=>(item.key!=='chat'||canChat)&&(item.key!=='history'||canHistory)).map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`${item.label} en navegación inferior`} accessibilityState={{selected:active===item.key,disabled:busy,expanded:item.key==='more'?menuExpanded:undefined}} aria-current={Platform.OS==='web'&&active===item.key?'page':undefined} aria-expanded={item.key==='more'?menuExpanded:undefined} aria-controls={item.key==='more'?menuControls:undefined} disabled={busy} onPress={item.onPress} style={styles.tab}>
    <View aria-hidden style={[styles.tabIcon,active===item.key&&styles.activeIcon]}>{item.Icon?<item.Icon size={19} color={active===item.key?colors.banuMagenta:colors.banuMuted}/>:<Text style={styles.more}>•••</Text>}</View><Text style={[styles.tabLabel,active===item.key&&styles.magenta]}>{item.label}</Text>
  </Pressable>)}</View>;
}

/** Native menu uses the current capabilities; web keeps its existing navigation state. */
export function NativeCoreNavigation({active,onHome,onChat,busy=false}: {active:'home'|'chat';onHome:()=>void;onChat:()=>void;busy?:boolean}) {
  const router=useRouter(),{snapshot}=useAuth();
  const [menu,setMenu]=useState(false),[keyboard,setKeyboard]=useState(false);
  useEffect(()=>{if(Platform.OS==='web')return;const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboard(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(false));return()=>{show.remove();hide.remove();};},[]);
  useEffect(()=>{if(Platform.OS==='web'||!menu)return;const back=BackHandler.addEventListener('hardwareBackPress',()=>{setMenu(false);return true;});return()=>back.remove();},[menu]);
  if(Platform.OS==='web'||keyboard)return null;
  const links=[{label:'Mi progreso',route:'/progress',cap:'progress'},{label:'Calendario',route:'/calendar',cap:'calendar'},{label:'Noticias y convocatorias',route:'/announcements',cap:'announcements'},{label:'Publicaciones OE2',route:'/oe2',cap:'progress'},{label:'Banu al día',route:'/oe2-changes',cap:'progress'},{label:'Recordatorios',route:'/notifications',cap:'progress'}];
  return <View>{menu&&<ScrollView style={styles.menuScroll} contentContainerStyle={styles.menu} accessibilityLabel="Más opciones de BanuChat">{links.filter(l=>snapshot.me?.capabilities.includes(l.cap)).map(item=><Pressable key={item.route} accessibilityRole="button" onPress={()=>{setMenu(false);router.push(item.route as Href);}} style={styles.menuItem}><Text style={styles.menuLabel}>{item.label}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setMenu(false)} style={styles.menuItem}><Text style={styles.magenta}>Cerrar menú</Text></Pressable></ScrollView>}
    <BanuBottomNav active={active} onHome={onHome} onChat={onChat} onHistory={()=>router.push('/history')} onMenu={()=>setMenu(v=>!v)} busy={busy} menuExpanded={menu} canChat={!snapshot.me||snapshot.me.capabilities.includes('chat')} canHistory={!snapshot.me||snapshot.me.capabilities.includes('history')}/>
  </View>;
}

const styles=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:spacing.xs},wordmark:{fontSize:23,fontWeight:'700',letterSpacing:-1,color:colors.banuInk},magenta:{color:colors.banuMagenta,fontWeight:'600'},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md},headingCopy:{flex:1,minWidth:0,gap:spacing.xs},eyebrow:{fontSize:11,lineHeight:18,letterSpacing:1.4,fontWeight:'700',color:colors.banuMagenta},title:{fontSize:28,lineHeight:34,fontWeight:'600',letterSpacing:-0.8,color:colors.banuInk},subtitle:{fontSize:14,lineHeight:22,color:colors.banuMuted},
  bottom:{flexDirection:'row',backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.banuBorder,paddingHorizontal:spacing.xs,paddingVertical:spacing.xs},tab:{flex:1,minWidth:0,minHeight:layout.minTouchTarget,alignItems:'center',justifyContent:'center',gap:spacing.xxs},tabIcon:{height:24,width:30,alignItems:'center',justifyContent:'center',borderRadius:radii.sm},activeIcon:{backgroundColor:colors.banuSoft},tabLabel:{fontSize:11,color:colors.banuMuted},more:{color:colors.banuMuted,fontWeight:'700',fontSize:14},menuScroll:{maxHeight:300,flexShrink:1},menu:{backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.banuBorder,paddingHorizontal:spacing.lg,paddingVertical:spacing.xs},menuItem:{minHeight:layout.minTouchTarget,justifyContent:'center'},menuLabel:{color:colors.banuInk,fontSize:14},
});
