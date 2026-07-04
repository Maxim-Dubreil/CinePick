import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  letterboxd_username: string | null;
  last_sync: string | null;
  film_count: number;
}

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => void;
}

export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
          setLoading(false);
          return;
        }
        setProfile({
          letterboxd_username: data.letterboxd_username as string | null,
          last_sync: data.letterboxd_last_sync as string | null,
          film_count: (data.letterboxd_film_count as number | null) ?? 0,
        });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refetchKey]);

  const refetch = () => setRefetchKey((k) => k + 1);

  return { profile, loading, refetch };
}
