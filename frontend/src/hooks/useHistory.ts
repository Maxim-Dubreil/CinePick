import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { genreLabels } from "@/lib/genres";

export const HISTORY_PAGE_SIZE = 10;

export type HistoryDecision = "accepted" | "skipped";

/** One past recommendation shown on the history page — a `watch_history` row
 * joined against `films`. */
export interface HistoryEntry {
  id: string;
  filmId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  runtime: number | null;
  decision: HistoryDecision;
  decidedAt: string;
  aiSummary: string | null;
  overview: string | null;
}

interface WatchHistoryRow {
  id: string;
  film_id: string;
  decision: HistoryDecision;
  decided_at: string;
  ai_critique: string | null;
  films: {
    title: string;
    poster_url: string | null;
    year: number | null;
    runtime: number | null;
    genres: string[] | null;
    overview: string | null;
  } | null;
}

function rowToEntry(row: WatchHistoryRow): HistoryEntry {
  const film = row.films;
  return {
    id: row.id,
    filmId: row.film_id,
    title: film?.title ?? "Film inconnu",
    year: film?.year ?? null,
    posterUrl: film?.poster_url ?? null,
    genres: genreLabels(film?.genres ?? []),
    runtime: film?.runtime ?? null,
    decision: row.decision,
    decidedAt: row.decided_at,
    aiSummary: row.ai_critique,
    overview: film?.overview ?? null,
  };
}

export interface UseHistoryResult {
  entries: HistoryEntry[];
  totalCount: number;
  loading: boolean;
  removeEntry: (id: string) => Promise<void>;
}

/** One page of the user's recommendation history (accepted/skipped films
 * only — `proposed` rows are in-flight state, not history), joined against
 * `films`. Mirrors useProfile's direct-Supabase read + `refetchKey` pattern —
 * takes `userId` rather than calling useAuth itself, and paginates
 * server-side via `.range()` since history only grows over time. */
export function useHistory(userId: string | null, page: number): UseHistoryResult {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const from = (page - 1) * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE - 1;

    supabase
      .from("watch_history")
      .select(
        "id, film_id, decision, decided_at, ai_critique, films(title, poster_url, year, runtime, genres, overview)",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .in("decision", ["accepted", "skipped"])
      .order("decided_at", { ascending: false })
      .range(from, to)
      .then(({ data, count, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useHistory: failed to fetch history", error);
          setEntries([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
        setEntries(((data ?? []) as unknown as WatchHistoryRow[]).map(rowToEntry));
        setTotalCount(count ?? 0);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, page, refetchKey]);

  const removeEntry = async (id: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.error("useHistory: failed to delete history entry", error);
      return;
    }
    setRefetchKey((k) => k + 1);
  };

  return { entries, totalCount, loading, removeEntry };
}
