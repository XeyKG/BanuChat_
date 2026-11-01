import {useRef,useState} from 'react';
import {KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useRouter} from 'expo-router';
import {useAuth} from '@/auth/auth-provider';
import {SessionError} from '@/auth/auth-session';
import {isCcdLocal} from '@/config/demo-mode';
import {AppButton} from '@/components/app-button';
import {BrandMark} from '@/ui/animated';
import {DocGlyph,ClockGlyph} from '@/ui/icons';
import {colors,radii,spacing,layout,textStyles,typography} from '@/ui/tokens';

export default function Login(){
 const {client,snapshot}=useAuth(),router=useRouter();const [uid,setUid]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[errorKind,setErrorKind]=useState<SessionError['kind']>('session');
 const passwordRef=useRef<TextInput>(null);
 const [focused,setFocused]=useState<'uid'|'password'|null>(null);
 if(isCcdLocal())return <Redirect href="/profiles" />;
 if(snapshot.phase==='authenticated')return <Redirect href="/home" />;
 const unavailable=snapshot.phase==='unavailable',valid=[9,13].includes(uid.length)&&/^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$/.test(uid)&&password.length>0&&[...password].length<=128;
 async function signIn(){if(!valid||busy)return;setBusy(true);setError(false);try{await client.login(uid,password);setPassword('');router.replace('/home');}catch(error){setPassword('');setErrorKind(error instanceof SessionError?error.kind:'session');setError(true);}finally{setBusy(false);}}
 return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
 <View testID="login-layout" style={styles.layout}>
 <View testID="login-story" style={styles.story}>
  <View style={styles.brand}><BrandMark size={40}/><Text style={styles.wordmark}>BanuChat</Text></View>
  <View testID="login-story-body" style={styles.storyBody}>
   <Text style={styles.eyebrow}>TU ESPACIO ACADÉMICO</Text>
   <Text style={styles.storyTitle}>{'Una pregunta.\nUn buen comienzo.'}</Text>
   <Text style={styles.storyCopy}>Conversa con Banu, explora el material disponible y encuentra las fuentes detrás de cada respuesta.</Text>
   <View style={styles.storyFeature}><DocGlyph color={colors.onBrandSecondary}/><Text style={styles.featureCopy}>Consulta documentos y sus fuentes</Text></View>
   <View style={styles.storyFeature}><ClockGlyph color={colors.onBrandSecondary}/><Text style={styles.featureCopy}>Retoma tus conversaciones</Text></View>
  </View>
  <Text testID="login-story-footer" style={styles.storyFoot}>Un asistente para acompañar tus consultas.</Text>
 </View>
 <View testID="login-form" style={styles.card}>
  <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Inicia sesión en BanuChat</Text>
  <Text style={styles.copy}>Ingresa con tu usuario y contraseña de BanuChat.</Text></View>
  {snapshot.sessionExpired===true&&<Text accessibilityRole="alert" style={styles.error}>Tu sesión expiró. Vuelve a iniciar sesión para consultar tus datos.</Text>}
  <View style={styles.field}><Text nativeID="login-uid-label" style={styles.label}>Usuario</Text><TextInput accessibilityLabel="Usuario" aria-labelledby="login-uid-label" value={uid} onChangeText={setUid} autoCapitalize="characters" autoCorrect={false} maxLength={13} editable={!busy&&!unavailable} placeholder="U + ocho dígitos" placeholderTextColor={colors.muted} style={[styles.input,focused==='uid'&&styles.inputFocused]} onFocus={()=>setFocused('uid')} onBlur={()=>setFocused(null)} returnKeyType="next" submitBehavior="submit" onSubmitEditing={()=>passwordRef.current?.focus()}/></View>
  <View style={styles.field}><Text nativeID="login-password-label" style={styles.label}>Contraseña</Text><TextInput ref={passwordRef} accessibilityLabel="Contraseña" aria-labelledby="login-password-label" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" editable={!busy&&!unavailable} style={[styles.input,focused==='password'&&styles.inputFocused]} onFocus={()=>setFocused('password')} onBlur={()=>setFocused(null)} returnKeyType="go" onSubmitEditing={()=>void signIn()}/></View>
  {unavailable&&<Text accessibilityRole="alert" style={styles.error}>{Platform.OS==='web'?'La sesión web no está disponible. Abre el origen local autorizado.':'El almacenamiento seguro nativo no está disponible. Usa un dispositivo Android o iOS compatible.'}</Text>}
  {error&&<Text accessibilityRole="alert" style={styles.error}>{Platform.OS==='web'&&errorKind==='credentials'?'Usuario o contraseña inválidos.':Platform.OS==='web'&&errorKind==='unavailable'?'El servicio no está disponible. Inténtalo más tarde.':'No se pudo iniciar sesión. Revisa tus datos y la conexión autorizada.'}</Text>}
  {snapshot.logoutRemoteConfirmed===false&&<Text accessibilityRole="alert" style={styles.error}>La sesión se cerró en este dispositivo. No se pudo confirmar la revocación remota.</Text>}
  <AppButton label="Iniciar sesión" onPress={()=>void signIn()} loading={busy} loadingLabel="Iniciando sesión…" disabled={!valid||unavailable}/>
  <View style={styles.notice}><Text style={styles.noticeTitle}>Demostración local · cuenta ficticia</Text><Text style={styles.noticeCopy}>{Platform.OS==='web'?'La sesión solo vive en esta pestaña; al recargar debes iniciar sesión de nuevo.':'Usa la cuenta de demostración asignada. No corresponde a una identidad institucional.'}</Text></View>
 </View></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},
 container:{flexGrow:1,justifyContent:'center',padding:spacing.xl},
 layout:{width:'100%',maxWidth:layout.maxContentWidth,alignSelf:'center',gap:spacing.xxl},
 story:{gap:spacing.xl},brand:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
 wordmark:{color:colors.brand,fontSize:typography.heading,fontWeight:'800',letterSpacing:-0.6},
 storyBody:{display:'none',gap:spacing.xl},eyebrow:{...textStyles.eyebrow,color:colors.onBrandSecondary},
 storyTitle:{...textStyles.title,color:colors.white},storyCopy:{...textStyles.body,color:colors.onBrandSecondary},
 storyFeature:{flexDirection:'row',alignItems:'center',gap:spacing.md},featureCopy:{...textStyles.small,color:colors.onBrandSecondary,flex:1},
 storyFoot:{display:'none',...textStyles.small,color:colors.onBrandSecondary},
 card:{gap:spacing.xl,width:'100%'},heading:{gap:spacing.sm},
 title:{...textStyles.title,color:colors.ink},copy:{...textStyles.body,color:colors.textSecondary},
 field:{gap:spacing.xs},label:{fontSize:typography.small,fontWeight:'600',color:colors.ink},
 input:{minHeight:layout.controlHeight,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.sm,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,backgroundColor:colors.surface,color:colors.ink,fontSize:typography.body},
 inputFocused:{borderColor:colors.accent},
 error:{...textStyles.small,color:colors.error,padding:spacing.md,borderRadius:radii.sm,borderWidth:1,borderColor:colors.errorBorder,backgroundColor:colors.errorSoft},
 notice:{gap:spacing.xxs,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.lg},
 noticeTitle:{fontSize:typography.meta,lineHeight:20,fontWeight:'600',color:colors.textSecondary},
 noticeCopy:{fontSize:typography.meta,lineHeight:21,color:colors.muted},
});
