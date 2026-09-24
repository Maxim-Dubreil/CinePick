const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL environment variable");
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new ApiError(0, "Network error");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export async function validateLetterboxdAccount(
  username: string,
): Promise<{ username: string; count: number }> {
  return apiFetch(
    `/letterboxd/validate?username=${encodeURIComponent(username)}`,
  );
}

export async function syncWatchlist(
  letterboxdUsername: string,
  token: string | null,
): Promise<{ film_count: number; sync_duration_ms: number }> {
  return apiFetch("/letterboxd/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ letterboxd_username: letterboxdUsername }),
  });
}

export async function unlinkLetterboxdAccount(
  token: string | null,
): Promise<{ unlinked: boolean }> {
  return apiFetch("/letterboxd/unlink", {
    method: "DELETE",
    headers: {
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export interface RecommendRequest {
  genre: string[];
  emotion: string[];
  ambiance: string[];
  withWho: "seul" | "amis" | "couple" | "famille" | "any";
  duration: "lt90" | "90-120" | "120-150" | "150plus" | "any";
  era:
    | "silent"
    | "golden"
    | "newwave"
    | "blockbuster"
    | "2000s"
    | "recent"
    | "any";
  region: string[];
  subtitles: "with" | "without" | "any";
  seen: "nouveau" | "any";
}

export interface RecommendedFilm {
  film_id: string;
  tmdb_id: number | null;
  title: string;
  poster_url: string | null;
  year: number | null;
  runtime: number | null;
  overview: string | null;
  genres: string[];
  origin_country: string[];
  director: string | null;
  actors: string[];
  rank: number;
  match_score: number | null;
  critique: string | null;
}

export interface RecommendResponse {
  candidates: RecommendedFilm[];
  meta: { candidates_considered: number };
  recommendation_session_id: string;
}

export interface RecommendCurrentResponse extends RecommendResponse {
  /** The answers that produced this session — lets the front retry with a
   * fresh /recommend call if every resumed candidate gets skipped. */
  answers: RecommendRequest;
}

export type RecommendDecision = "accepted" | "skipped";

export interface RecommendDecisionRequest {
  recommendation_session_id: string;
  film_id: string;
  decision: RecommendDecision;
}

export interface WatchlistFilterFilm {
  id: string;
  genres: string[];
  duration: "lt90" | "90-120" | "120-150" | "150plus" | null;
  era:
    | "silent"
    | "golden"
    | "newwave"
    | "blockbuster"
    | "2000s"
    | "recent"
    | null;
  origin_country: string[];
  last_proposed_at: string | null;
}

export interface WatchlistFilterResponse {
  films: WatchlistFilterFilm[];
}

export async function getWatchlistForFilter(
  token: string | null,
): Promise<WatchlistFilterResponse> {
  return apiFetch("/watchlist", {
    headers: {
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function getRecommendation(
  answers: RecommendRequest,
  token: string | null,
): Promise<RecommendResponse> {
  return apiFetch("/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(answers),
  });
}

export async function recordDecision(
  body: RecommendDecisionRequest,
  token: string | null,
): Promise<void> {
  await apiFetch("/recommend/decision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** `null` means nothing is awaiting a decision (backend 404) — not an error. */
export async function getCurrentRecommendation(
  token: string | null,
): Promise<RecommendCurrentResponse | null> {
  try {
    return await apiFetch<RecommendCurrentResponse>("/recommend/current", {
      headers: {
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export type WatchProviderCategory = "free" | "subscription" | "rent_buy";

export interface WatchProvider {
  provider_id: number;
  name: string;
  logo_url: string;
  category: WatchProviderCategory;
  /** True when this platform only offers the film ad-supported — show an
   * "avec pub" mention for it. */
  ads: boolean;
}

export interface WatchProvidersResponse {
  providers: WatchProvider[];
  /** TMDB's "where to watch" page for this film, shared by every provider
   * (TMDB doesn't expose a per-platform deep link). */
  link: string | null;
}

export async function getWatchProviders(
  tmdbId: number,
  token: string | null,
): Promise<WatchProvidersResponse> {
  return apiFetch(`/films/${tmdbId}/watch-providers`, {
    headers: {
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export interface RatingResponse {
  /** TMDB's average vote out of 10, or `null` when it has no votes yet for
   * this film. */
  vote_average: number | null;
}

export async function getRating(tmdbId: number, token: string | null): Promise<RatingResponse> {
  return apiFetch(`/films/${tmdbId}/rating`, {
    headers: {
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function abandonCurrentRecommendation(
  recommendationSessionId: string,
  token: string | null,
): Promise<void> {
  await apiFetch("/recommend/current/abandon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ recommendation_session_id: recommendationSessionId }),
  });
}
