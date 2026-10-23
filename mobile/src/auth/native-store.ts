import {Platform} from 'react-native';
import type {RefreshStore} from './auth-session';
import {getApiBaseUrl} from '../config/api';
import {isCcdAuthenticated} from '../config/demo-mode';
const key=()=> 'banuchat.auth.v2.refresh.'+(isCcdAuthenticated()?'ccd.':'')+getApiBaseUrl().replace(/[^A-Za-z0-9._-]/g,'_');
type SecureModule=typeof import('expo-secure-store');
let loaded:Promise<SecureModule>|null=null;
async function secure(){
 if(!['android','ios'].includes(Platform.OS))throw new Error('SECURE_STORAGE_UNAVAILABLE');
 loaded??=import('expo-secure-store');return loaded;
}
const options=(s:SecureModule)=>({keychainService:'banuchat.auth.v2',keychainAccessible:s.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
export const nativeRefreshStore:RefreshStore={
 available:async()=>{try{return await (await secure()).isAvailableAsync();}catch{return false;}},
 get:async()=>{const s=await secure();return s.getItemAsync(key(),options(s));},
 set:async token=>{const s=await secure();await s.setItemAsync(key(),token,options(s));},
 clear:async()=>{const s=await secure();await s.deleteItemAsync(key(),options(s));},
};
