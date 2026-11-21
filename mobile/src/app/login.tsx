import {useRef,useState} from 'react';
import {KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useRouter} from 'expo-router';
import {useAuth} from '@/auth/auth-provider';
import {SessionError} from '@/auth/auth-session';
import {isCcdLocal} from '@/config/demo-mode';
import {AppButton} from '@/components/app-button';
import {BrandMark} from '@/ui/animated';
import {BanuPageHeading,BanuWordmark} from '@/components/banu-core';
import {colors,radii,spacing,layout,textStyles,typography,shadows} from '@/ui/tokens';

export default function Login(){
 const width=useWindowDimensions().width;
 const wideWeb=Platform.OS==='web'&&width>=760;
 const {client,snapshot}=useAuth(),router=useRouter();const [uid,setUid]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[errorKind,setErrorKind]=useState<SessionError['kind']>('session');
 const passwordRef=useRef<TextInput>(null);
 const [focused,setFocused]=useState<'uid'|'password'|null>(null);
 const [validation,setValidation]=useState('');
 if(isCcdLocal())return <Redirect href="/profiles" />;
 if(snapshot.phase==='authenticated')return <Redirect href="/home" />;
 const unavailable=snapshot.phase==='unavailable';
 async function signIn(){
  if(busy)return;
  setError(false);
  const username=uid.trim().toUpperCase();
  if(!username||!password){
   setValidation(!username&&!password?'Ingresa tu usuario y contraseña.':!username?'Ingresa tu usuario.':'Ingresa tu contraseña.');
   return;
  }
  if(!/^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$/.test(username)){
   setValidation('Ingresa un usuario válido, por ejemplo U seguido de ocho dígitos.');
   return;
  }
  if([...password].length>128){setValidation('La contraseña no puede superar los 128 caracteres.');return;}
  if(unavailable){setValidation('No se pudo preparar la sesión. Vuelve a abrir la aplicación e inténtalo de nuevo.');return;}
  setValidation('');
  setBusy(true);
  try{await client.login(username,password);setPassword('');router.replace('/home');}
  catch(error){setPassword('');setErrorKind(error instanceof SessionError?error.kind:'session');setError(true);}
  finally{setBusy(false);}
 }
 return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
 <View testID="login-shell" style={styles.shell}>
 <BanuWordmark/>
 {Platform.OS==='web'&&<BanuPageHeading eyebrow="BanuChat" title="Centro de Competencias Digitales" subtitle="Consulta cursos, pruebas diagnósticas y requisitos con Banu."/>}
 <View testID="login-layout" style={[styles.layout,wideWeb&&styles.wideLayout]}>
 <View testID="login-story" style={[styles.story,wideWeb?styles.wideStory:styles.compactStory]}>
  {Platform.OS==='web'?<><BrandMark size={wideWeb?180:88} framed={false}/><Text style={[styles.storyTitle,!wideWeb&&styles.compactStoryTitle]}>Chat con Banu</Text><Text style={styles.storyCopy}>Pregunta sobre la ruta y consulta las fuentes de la respuesta.</Text></>:<View style={styles.nativeWelcome}><BrandMark size={72} framed={false}/><View style={styles.nativeWelcomeCopy}><Text style={styles.nativeWelcomeTitle}>Hola, soy Banu.</Text><Text style={styles.nativeWelcomeBody}>Tu guía para Competencias Digitales.</Text></View></View>}
 </View>
 <View testID="login-form" style={styles.card}>
  <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Inicia sesión</Text>
  <Text style={styles.copy}>Ingresa con tu usuario y contraseña de BanuChat.</Text></View>
  {snapshot.sessionExpired===true&&<Text accessibilityRole="alert" style={styles.error}>Tu sesión expiró. Vuelve a iniciar sesión para consultar tus datos.</Text>}
  <View style={styles.field}><Text nativeID="login-uid-label" style={styles.label}>Usuario</Text><TextInput accessibilityLabel="Usuario" aria-labelledby="login-uid-label" value={uid} onChangeText={setUid} autoCapitalize="characters" autoCorrect={false} maxLength={13} editable={!busy&&!unavailable} placeholder="U + ocho dígitos" placeholderTextColor={colors.muted} style={[styles.input,focused==='uid'&&styles.inputFocused]} onFocus={()=>setFocused('uid')} onBlur={()=>setFocused(null)} returnKeyType="next" submitBehavior="submit" onSubmitEditing={()=>passwordRef.current?.focus()}/></View>
  <View style={styles.field}><Text nativeID="login-password-label" style={styles.label}>Contraseña</Text><TextInput ref={passwordRef} accessibilityLabel="Contraseña" aria-labelledby="login-password-label" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" editable={!busy&&!unavailable} style={[styles.input,focused==='password'&&styles.inputFocused]} onFocus={()=>setFocused('password')} onBlur={()=>setFocused(null)} returnKeyType="go" onSubmitEditing={()=>void signIn()}/></View>
  {unavailable&&<Text accessibilityRole="alert" style={styles.error}>{Platform.OS==='web'?'No se pudo preparar la sesión web. Recarga la página e inténtalo de nuevo.':'El almacenamiento seguro nativo no está disponible. Usa un dispositivo Android o iOS compatible.'}</Text>}
  {validation!==''&&<Text accessibilityRole="alert" style={styles.error}>{validation}</Text>}
  {error&&<Text accessibilityRole="alert" style={styles.error}>{errorKind==='credentials'?'Usuario o contraseña inválidos.':errorKind==='unavailable'?'El servicio no está disponible. Inténtalo más tarde.':'No se pudo iniciar sesión. Vuelve a intentarlo.'}</Text>}
  {snapshot.logoutRemoteConfirmed===false&&<Text accessibilityRole="alert" style={styles.error}>La sesión se cerró en este dispositivo. No se pudo confirmar la revocación remota.</Text>}
  <AppButton tone="banu" label="Iniciar sesión" onPress={()=>void signIn()} loading={busy} loadingLabel="Iniciando sesión…"/>
  <View style={styles.notice}><Text style={styles.noticeTitle}>Cuenta de demostración</Text><Text style={styles.noticeCopy}>{Platform.OS==='web'?'La sesión solo vive en esta pestaña; al recargar debes iniciar sesión de nuevo.':'Usa la cuenta de demostración asignada.'}</Text></View>
 </View></View></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.banuCanvas},
 container:{flexGrow:1,justifyContent:'center',padding:spacing.xl},
 shell:{width:'100%',maxWidth:900,alignSelf:'center',gap:spacing.xl},
 layout:{width:'100%',maxWidth:760,alignSelf:'center',borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.lg,backgroundColor:colors.surface,overflow:'hidden',...shadows.banuPanel},wideLayout:{flexDirection:'row'},
 story:{padding:spacing.xl,gap:spacing.sm,backgroundColor:colors.banuNavy,alignItems:'center',justifyContent:'center'},wideStory:{width:'44%',padding:spacing.xxl},compactStory:{padding:spacing.lg},compactStoryTitle:{fontSize:21,lineHeight:27},
 storyTitle:{fontSize:24,lineHeight:30,fontWeight:'600',letterSpacing:-0.6,color:colors.white,textAlign:'center'},storyCopy:{fontSize:14,lineHeight:22,color:colors.banuOnNavy,textAlign:'center'},
 nativeWelcome:{flexDirection:'row',alignItems:'center',gap:spacing.md,width:'100%'},nativeWelcomeCopy:{flex:1,minWidth:0,gap:spacing.xs},nativeWelcomeTitle:{fontSize:21,lineHeight:27,fontWeight:'600',color:colors.white},nativeWelcomeBody:{fontSize:13,lineHeight:21,color:colors.banuOnNavy},
 card:{gap:spacing.lg,padding:spacing.xl,flex:1,minWidth:0},heading:{gap:spacing.sm},
 title:{fontSize:25,lineHeight:32,fontWeight:'600',letterSpacing:-0.6,color:colors.banuInk},copy:{fontSize:14,lineHeight:22,color:colors.banuMuted},
 field:{gap:spacing.xs},label:{fontSize:typography.small,fontWeight:'600',color:colors.banuInk},
 input:{minHeight:layout.controlHeight,borderWidth:1,borderColor:colors.banuBorder,borderRadius:radii.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,backgroundColor:colors.banuCanvas,color:colors.banuInk,fontSize:typography.body,...shadows.banuInset},inputFocused:{borderColor:colors.banuMagenta},
 error:{...textStyles.small,color:colors.error,padding:spacing.md,borderRadius:radii.sm,borderWidth:1,borderColor:colors.errorBorder,backgroundColor:colors.errorSoft},
 notice:{gap:spacing.xxs,borderTopWidth:1,borderColor:colors.banuBorder,paddingTop:spacing.lg},noticeTitle:{fontSize:13,lineHeight:20,fontWeight:'600',color:colors.banuSecondary},noticeCopy:{fontSize:12,lineHeight:19,color:colors.banuMuted},
});
