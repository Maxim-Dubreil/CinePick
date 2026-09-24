import { createContext, useState, type ReactNode } from "react";

export interface SyncContextValue {
  /** Whether a Letterboxd sync is currently in flight — set by whichever
   * page/modal triggers it (Home, Profile, LetterboxdConfigModal), read by
   * Topbar to block navigation while it runs (CIN-104 follow-up: the sync
   * itself finishes server-side regardless of navigation, but each page had
   * its own local flag, so nothing stopped a second concurrent sync from
   * another page). */
  isSyncing: boolean;
  setSyncing: (value: boolean) => void;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setSyncing] = useState(false);

  return (
    <SyncContext.Provider value={{ isSyncing, setSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
