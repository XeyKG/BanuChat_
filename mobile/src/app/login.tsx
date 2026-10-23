import {useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useRouter} from 'expo-router';
import {useAuth} from '@/auth/auth-provider';
import {isCcdLocal} from '@/config/demo-mode';
import {AppButton} from '@/components/app-button';
import {BrandMark} from '@/ui/animated';
import {colors,radii,spacing,layout} from '@/ui/tokens';

export default function Login(){
 const {client,snapshot}=useAuth(),router=useRouter();const [uid,setUid]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 if(isCcdLocal())return <Redirect href="/profiles" />;
 if(snapshot.phase==='authenticated')return <Redirect href="/home" />;
 const unavailable=snapshot.phase==='unavailable',valid=[9,13].includes(uid.length)&&/^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$/.test(uid)&&password.length>0&&[...password].length<=128;
 async function signIn(){if(!valid||busy)return;setBusy(true);setError(false);try{await client.login(uid,password);setPassword('');router.replace('/home');}catch{setPassword('');setError(true);}finally{setBusy(false);}}
 return <SafeAreaView style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}><View style={styles.card}>
  <BrandMark size={48}/><Text style={styles.title}>Inicia sesión en BanuChat</Text>
  <Text style={styles.copy}>Usa tu UID sintético y tu contraseña propia de BanuChat.</Text>
  <Text style={styles.label}>UID sintético</Text><TextInput accessibilityLabel="UID sintético" value={uid} onChangeText={setUid} autoCapitalize="characters" autoCorrect={false} maxLength={13} editable={!busy&&!unavailable} placeholder="U + ocho dígitos" style={styles.input}/>
  <Text style={styles.label}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" editable={!busy&&!unavailable} style={styles.input} onSubmitEditing={()=>void signIn()}/>
  {unavailable&&<Text accessibilityRole="alert" style={styles.error}>El almacenamiento seguro nativo no está disponible. Usa un dispositivo Android o iOS compatible.</Text>}
  {error&&<Text accessibilityRole="alert" style={styles.error}>No se pudo iniciar sesión. Revisa tus datos y la conexión autorizada.</Text>}
  {snapshot.logoutRemoteConfirmed===false&&<Text accessibilityRole="alert" style={styles.error}>La sesión se cerró en este dispositivo. No se pudo confirmar la revocación remota.</Text>}
  {busy&&<ActivityIndicator accessibilityLabel="Iniciando sesión"/>}
  <AppButton label="Iniciar sesión" onPress={()=>void signIn()} loading={busy} disabled={!valid||unavailable}/>
 </View></ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},container:{flexGrow:1,justifyContent:'center',padding:spacing.xl},card:{width:'100%',maxWidth:layout.maxContentWidth,alignSelf:'center',gap:spacing.md},title:{fontSize:30,fontWeight:'700',color:colors.ink},copy:{fontSize:16,color:colors.textSecondary},label:{fontWeight:'600',color:colors.ink},input:{minHeight:52,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radii.md,paddingHorizontal:16,backgroundColor:colors.surface,color:colors.ink},error:{color:colors.error,fontSize:14}});
