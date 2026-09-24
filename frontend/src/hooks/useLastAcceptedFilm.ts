import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  HISTORY_ENTRY_SELECT,
  rowToEntry,
  type HistoryEntry,
  type WatchHistoryRow,
} from "@/hooks/useHistory";

/** Return shape of {@link useLastAcceptedFilm}. */
export interface UseLastAcceptedFilmResult {
  /** Same shape as a history entry, so the panel can open the history's
   * `FilmDetailModal` as-is. */
  film: HistoryEntry | null;
  loading: boolean;
  refetch: () => void;
}

/** Reads the most recently accepted film from `watch_history` (joined
 * against `films`), for the home page's "Dernier film" panel. Takes the
 * caller's user id rather than calling `useAuth` itself, since `Home` already
 * holds the session and every extra `useAuth()` call opens its own
 * `getSession`/`onAuthStateChange` subscription.
 *
 * The fetched film is tagged with the `userId` it was fetched for and only
 * exposed when that still matches the current `userId`: a fetch resolving
 * for a since-superseded user (sign-out, account switch) must never leak
 * into the new user's render. */
export function useLastAcceptedFilm(userId: string | null): UseLastAcceptedFilmResult {
  const [result, setResult] = useState<{ userId: string; film: HistoryEntry | null }>({
    userId: "",
    film: null,
  });

  const [refetchKey, setRefetchKey] = useState(0);
  const refetch = () => setRefetchKey((key) => key + 1);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from("watch_history")
      .select(HISTORY_ENTRY_SELECT)
      .eq("user_id", userId)
      .eq("decision", "accepted")
      .order("decided_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useLastAcceptedFilm: failed to fetch last accepted film", error);
          setResult({ userId, film: null });
          return;
        }
        const row = data as unknown as WatchHistoryRow | null;
        // No joined film (deleted from the catalog) reads as "nothing yet",
        // not as a "Film inconnu" card.
        setResult({ userId, film: row?.films ? rowToEntry(row) : null });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refetchKey]);

  const upToDate = userId !== null && result.userId === userId;
  return {
    film: upToDate ? result.film : null,
    loading: userId !== null && !upToDate,
    refetch,
  };
}
