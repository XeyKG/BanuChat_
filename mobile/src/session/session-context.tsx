import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const value = useMemo<SessionContextValue>(
    () => ({
      activeProfile,
      selectProfile: setActiveProfile,
      clearSession: () => setActiveProfile(null),
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
