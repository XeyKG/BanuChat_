import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { clearOperatorConversations } from './operator-conversations';
import {isCcdLocal} from '../config/demo-mode';
import {useAuth} from '../auth/auth-provider';

export interface ActiveProfile {
  profile_key: string;
  alias: string;
}

interface SessionContextValue {
  activeProfile: ActiveProfile | null;
  selectProfile: (profile: ActiveProfile) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  return isCcdLocal()?<LegacySessionProvider>{children}</LegacySessionProvider>:<AuthenticatedSessionBridge>{children}</AuthenticatedSessionBridge>;
}

function AuthenticatedSessionBridge({children}:{children:ReactNode}){
  const {client,snapshot}=useAuth();
  const value=useMemo<SessionContextValue>(()=>({activeProfile:snapshot.phase==='authenticated'?snapshot.me!.profile:null,
    selectProfile:()=>{throw new Error('PROFILE_SELECTION_IS_NOT_AUTHENTICATION');},clearSession:()=>{void client.logout();}}),[client,snapshot]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function LegacySessionProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const value = useMemo<SessionContextValue>(
    () => ({
      activeProfile,
      selectProfile: setActiveProfile,
      clearSession: () => { clearOperatorConversations(); setActiveProfile(null); },
    }),
    [activeProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return session;
}
