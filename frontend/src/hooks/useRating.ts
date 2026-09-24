import { useEffect, useState } from "react";
import { getRating } from "@/lib/backend/api";

/** Return shape of {@link useRating}. `voteAverage` is `null` while loading,
 * when TMDB has no votes yet for this film, or when the lookup failed — the
 * caller can't distinguish these (same as `useWatchProviders`, see there for
 * why: an error should hide the field, not show a wrong "no rating"). */
export interface UseRatingResult {
  voteAverage: number | null;
  loading: boolean;
}

/** A film's TMDB rating (CIN-104), live-fetched — never persisted, see
 * `backend/tmdb_rating.py`. `tmdbId` is `null` for a film that was never
 * TMDB-enriched; the lookup is simply skipped.
 *
 * Mirrors `useWatchProviders`'s tagged-result pattern: the fetched value is
 * tagged with the `tmdbId` it was fetched for and only exposed when that
 * still matches the current `tmdbId`, so a fetch resolving for a
 * since-superseded film never leaks into the new film's render. */
export function useRating(tmdbId: number | null, token: string | null): UseRatingResult {
  const [result, setResult] = useState<{ tmdbId: number | null; voteAverage: number | null }>({
    tmdbId: null,
    voteAverage: null,
  });

  useEffect(() => {
    if (tmdbId === null) return;
    let cancelled = false;

    getRating(tmdbId, token)
      .then((response) => {
        if (cancelled) return;
        setResult({ tmdbId, voteAverage: response.vote_average });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("useRating: failed to fetch rating", error);
        setResult({ tmdbId, voteAverage: null });
      });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, token]);

  const upToDate = tmdbId !== null && result.tmdbId === tmdbId;
  return {
    voteAverage: upToDate ? result.voteAverage : null,
    loading: tmdbId !== null && !upToDate,
  };
}
