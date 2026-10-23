import {createContext,useContext,useEffect,useSyncExternalStore,type ReactNode} from 'react';
import {isCcdLocal} from '../config/demo-mode';
import {getApiBaseUrl} from '../config/api';
import {AuthSession,type AuthSnapshot} from './auth-session';
import {nativeRefreshStore} from './native-store';
import {installAuthSession} from './runtime';

const client=new AuthSession(nativeRefreshStore,getApiBaseUrl);installAuthSession(client);
const Context=createContext<{client:AuthSession;snapshot:AuthSnapshot}|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 useEffect(()=>{if(!isCcdLocal())void client.restore();},[]);
 return <Context.Provider value={{client,snapshot}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AUTH_PROVIDER_REQUIRED');return value;}
