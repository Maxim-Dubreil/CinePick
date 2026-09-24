import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { genreLabels } from "@/lib/genres";

/** Aggregate stats derived from a user's full recommendation history —
 * consumed by ProfileStats (tile counts), ProfileTaste (genre/decade/director
 * breakdown), and any future dashboard widget. */
export interface RecommendationStats {
  totalCount: number;
  acceptedCount: number;
  /** Average match_score (0-100) over scored rows, rounded; null when no row
   * has been scored yet (e.g. the no-AI short-circuit, which leaves it null). */
  matchRate: number | null;
  /** Up to 3 genres, most frequent first, as a share of accepted films. */
  topGenres: { name: string; pct: number }[];
  /** Up to 3 decades (e.g. "1990s"), most frequent first, among accepted films. */
  topDecades: string[];
  /** Director of the most accepted films; null unless they account for at
   * least 2 — below that every director ties at 1 and the pick is arbitrary. */
  topDirector: string | null;
  /** Average runtime (minutes) of accepted films, rounded; null with none. */
  averageRuntime: number | null;
}

interface WatchHistoryStatsRow {
  decision: "proposed" | "accepted" | "skipped";
  match_score: number | null;
  films: {
    genres: string[] | null;
    year: number | null;
    runtime: number | null;
    director: string | null;
  } | null;
}

const EMPTY_STATS: RecommendationStats = {
  totalCount: 0,
  acceptedCount: 0,
  matchRate: null,
  topGenres: [],
  topDecades: [],
  topDirector: null,
  averageRuntime: null,
};

function topByCount<T extends string>(counts: Map<T, number>, limit: number): T[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function computeStats(rows: WatchHistoryStatsRow[]): RecommendationStats {
  const totalCount = rows.length;
  const accepted = rows.filter((row) => row.decision === "accepted");
  const acceptedCount = accepted.length;

  const scored = rows.filter((row) => row.match_score !== null);
  const matchRate =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + (row.match_score ?? 0), 0) / scored.length)
      : null;

  const genreCounts = new Map<string, number>();
  const decadeCounts = new Map<string, number>();
  const directorCounts = new Map<string, number>();
  const runtimes: number[] = [];

  for (const row of accepted) {
    const film = row.films;
    if (!film) continue;
    for (const genre of genreLabels(film.genres ?? [])) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
    if (film.year !== null) {
      const decade = `${Math.floor(film.year / 10) * 10}s`;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
    if (film.director) {
      directorCounts.set(film.director, (directorCounts.get(film.director) ?? 0) + 1);
    }
    if (film.runtime !== null) runtimes.push(film.runtime);
  }

  const topDirector = topByCount(directorCounts, 1)[0];

  return {
    totalCount,
    acceptedCount,
    matchRate,
    topGenres: topByCount(genreCounts, 3).map((name) => ({
      name,
      pct: Math.round(((genreCounts.get(name) ?? 0) / acceptedCount) * 100),
    })),
    topDecades: topByCount(decadeCounts, 3),
    topDirector: topDirector !== undefined && (directorCounts.get(topDirector) ?? 0) >= 2
      ? topDirector
      : null,
    averageRuntime:
      runtimes.length > 0
        ? Math.round(runtimes.reduce((sum, r) => sum + r, 0) / runtimes.length)
        : null,
  };
}

export interface UseRecommendationStatsResult {
  stats: RecommendationStats;
  loading: boolean;
}

/** Reads a user's full `watch_history` (all decisions, joined against
 * `films`) in one query and derives every stat from it client-side. Mirrors
 * useHistory's direct-Supabase-read pattern, but unfiltered by decision since
 * `totalCount` needs every row — takes `userId` rather than calling useAuth
 * itself, same reasoning as useLastAcceptedFilm. */
export function useRecommendationStats(userId: string | null): UseRecommendationStatsResult {
  const [result, setResult] = useState<{ userId: string; stats: RecommendationStats }>({
    userId: "",
    stats: EMPTY_STATS,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from("watch_history")
      .select("decision, match_score, films(genres, year, runtime, director)")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useRecommendationStats: failed to fetch watch history", error);
          setResult({ userId, stats: EMPTY_STATS });
          return;
        }
        setResult({
          userId,
          stats: computeStats((data ?? []) as unknown as WatchHistoryStatsRow[]),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const upToDate = userId !== null && result.userId === userId;
  return {
    stats: upToDate ? result.stats : EMPTY_STATS,
    loading: userId !== null && !upToDate,
  };
}
