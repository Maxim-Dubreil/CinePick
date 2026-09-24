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
  tmdbId: number | null;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  /** Raw TMDB genre ids behind `genres`, for `FilmCard` which maps them itself. */
  genreIds: string[];
  runtime: number | null;
  director: string | null;
  actors: string[];
  matchScore: number | null;
  decision: HistoryDecision;
  decidedAt: string;
  aiSummary: string | null;
  overview: string | null;
}

/** Columns `rowToEntry` reads — shared with useLastAcceptedFilm so both
 * build the same `HistoryEntry`. */
export const HISTORY_ENTRY_SELECT =
  "id, film_id, decision, decided_at, ai_critique, match_score, films(tmdb_id, title, poster_url, year, runtime, director, actors, genres, overview)";

/** Raw `watch_history` row joined with `films`, as selected by `HISTORY_ENTRY_SELECT`. */
export interface WatchHistoryRow {
  id: string;
  film_id: string;
  decision: HistoryDecision;
  decided_at: string;
  ai_critique: string | null;
  match_score: number | null;
  films: {
    tmdb_id: number | null;
    title: string;
    poster_url: string | null;
    year: number | null;
    runtime: number | null;
    director: string | null;
    actors: string[] | null;
    genres: string[] | null;
    overview: string | null;
  } | null;
}

/** Maps a joined `watch_history` row to the UI's `HistoryEntry`. */
export function rowToEntry(row: WatchHistoryRow): HistoryEntry {
  const film = row.films;
  return {
    id: row.id,
    filmId: row.film_id,
    tmdbId: film?.tmdb_id ?? null,
    title: film?.title ?? "Film inconnu",
    year: film?.year ?? null,
    posterUrl: film?.poster_url ?? null,
    genres: genreLabels(film?.genres ?? []),
    genreIds: film?.genres ?? [],
    runtime: film?.runtime ?? null,
    director: film?.director ?? null,
    actors: film?.actors ?? [],
    matchScore: row.match_score,
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
  /** Deletes every accepted/skipped entry (in-flight `proposed` rows of an
   * open session are left alone). */
  clearHistory: () => Promise<void>;
}

/** One page of the user's recommendation history (accepted/skipped films
 * only — `proposed` rows are in-flight state, not history), joined against
 * `films`. Mirrors useProfile's direct-Supabase read + `refetchKey` pattern —
 * takes `userId` rather than calling useAuth itself, and paginates
 * server-side via `.range()` since history only grows over time.
 *
 * `pageSize` defaults to `HISTORY_PAGE_SIZE` (the full history page) but can
 * be overridden — e.g. the profile page's "recent recommendations" preview
 * reuses this same query with `pageSize=4` instead of a separate hook. */
export function useHistory(
  userId: string | null,
  page: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): UseHistoryResult {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState<{
    userId: string;
    page: number;
  } | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    supabase
      .from("watch_history")
      .select(HISTORY_ENTRY_SELECT, { count: "exact" })
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
          setLoadedQuery({ userId, page });
          setLoading(false);
          return;
        }
        setEntries(
          ((data ?? []) as unknown as WatchHistoryRow[]).map(rowToEntry),
        );
        setTotalCount(count ?? 0);
        setLoadedQuery({ userId, page });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, page, pageSize, refetchKey]);

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

  const clearHistory = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .eq("user_id", userId)
      .in("decision", ["accepted", "skipped"]);
    if (error) {
      console.error("useHistory: failed to clear history", error);
      return;
    }
    setRefetchKey((k) => k + 1);
  };

  const queryIsLoaded =
    loadedQuery?.userId === userId && loadedQuery.page === page;
  return {
    entries: queryIsLoaded ? entries : [],
    totalCount: queryIsLoaded ? totalCount : 0,
    loading: userId ? (queryIsLoaded ? loading : true) : false,
    removeEntry,
    clearHistory,
  };
}
