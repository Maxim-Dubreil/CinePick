import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  letterboxd_username: string | null;
  last_sync: string | null;
  film_count: number;
}

export interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(
    null,
  );
  const [fetchedLoading, setFetchedLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from("users")
      .select(
        "full_name, avatar_url, letterboxd_username, letterboxd_last_sync, letterboxd_film_count",
      )
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useProfile: failed to fetch profile", error);
          setLoadedUserId(user.id);
          setFetchedLoading(false);
          return;
        }
        setFetchedProfile({
          full_name: data.full_name as string | null,
          avatar_url: data.avatar_url as string | null,
          letterboxd_username: data.letterboxd_username as string | null,
          last_sync: data.letterboxd_last_sync as string | null,
          film_count: (data.letterboxd_film_count as number | null) ?? 0,
        });
        setLoadedUserId(user.id);
        setFetchedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refetchKey]);

  const refetch = () => setRefetchKey((k) => k + 1);
  // Applies a known-good write immediately, without waiting on the network
  // round-trip a refetch() would take — avoids a flash of the stale value.
  const updateProfile = (partial: Partial<UserProfile>) =>
    setFetchedProfile((prev) => (prev ? { ...prev, ...partial } : prev));
  const profile = user && loadedUserId === user.id ? fetchedProfile : null;
  const loading = user
    ? loadedUserId === user.id
      ? fetchedLoading
      : true
    : false;

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
