import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  letterboxd_username: string | null;
  last_sync: string | null;
  film_count: number;
}

export interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(
    null,
  );
  const [fetchedLoading, setFetchedLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from("users")
      .select("letterboxd_username, letterboxd_last_sync, letterboxd_film_count")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useProfile: failed to fetch profile", error);
          setFetchedLoading(false);
          return;
        }
        setFetchedProfile({
          letterboxd_username: data.letterboxd_username as string | null,
          last_sync: data.letterboxd_last_sync as string | null,
          film_count: (data.letterboxd_film_count as number | null) ?? 0,
        });
        setFetchedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refetchKey]);

  const refetch = () => setRefetchKey((k) => k + 1);
  const profile = user ? fetchedProfile : null;
  const loading = user ? fetchedLoading : false;

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch }}>
      {children}
    </ProfileContext.Provider>
  );
}
