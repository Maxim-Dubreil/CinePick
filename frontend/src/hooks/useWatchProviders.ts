import { useEffect, useState } from "react";
import { getWatchProviders, type WatchProvider } from "@/lib/backend/api";

/** Return shape of {@link useWatchProviders}. `providers` is `null` while
 * loading, or when the TMDB lookup failed — the caller should render
 * nothing (not an error message) in the failure case, an empty-state
 * message when it resolves to `[]`. */
export interface UseWatchProvidersResult {
  providers: WatchProvider[] | null;
  link: string | null;
  loading: boolean;
}

/** Where to watch a film in France (CIN-103), shared by the Result, Home,
 * and Historique screens — only the layout differs per screen, not the
 * fetch. `tmdbId` is `null` for a film that was never TMDB-enriched (see
 * `EnrichedFilm.tmdb_id`); the lookup is simply skipped.
 *
 * Mirrors `useLastAcceptedFilm`'s tagged-result pattern: the fetched data is
 * tagged with the `tmdbId` it was fetched for and only exposed when that
 * still matches the current `tmdbId`, so a fetch resolving for a
 * since-superseded film (the user swipes to the next candidate) never leaks
 * into the new film's render. */
export function useWatchProviders(
  tmdbId: number | null,
  token: string | null,
): UseWatchProvidersResult {
  const [result, setResult] = useState<{
    tmdbId: number | null;
    providers: WatchProvider[] | null;
    link: string | null;
  }>({ tmdbId: null, providers: null, link: null });

  useEffect(() => {
    if (tmdbId === null) return;
    let cancelled = false;

    getWatchProviders(tmdbId, token)
      .then((response) => {
        if (cancelled) return;
        setResult({ tmdbId, providers: response.providers, link: response.link });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("useWatchProviders: failed to fetch watch providers", error);
        setResult({ tmdbId, providers: null, link: null });
      });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, token]);

  const upToDate = tmdbId !== null && result.tmdbId === tmdbId;
  return {
    providers: upToDate ? result.providers : null,
    link: upToDate ? result.link : null,
    loading: tmdbId !== null && !upToDate,
  };
}
