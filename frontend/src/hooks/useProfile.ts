import { useEffect, useState } from "react";
import { getProfile, type UserProfile } from "@/lib/backend/api";
import { useAuth } from "@/hooks/useAuth";

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => void;
}

export function useProfile(): UseProfileResult {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getProfile(token)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoading(false);
        console.error("useProfile: failed to fetch profile", err);
      });

    return () => {
      cancelled = true;
    };
  }, [token, refetchKey]);

  const refetch = () => setRefetchKey((k) => k + 1);

  return { profile, loading, refetch };
}
