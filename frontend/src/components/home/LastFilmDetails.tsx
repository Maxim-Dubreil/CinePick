import { useState } from "react";
import { Star } from "lucide-react";
import { FilmPoster } from "@/components/FilmPoster";
import { FilmDetailModal } from "@/components/history/FilmDetailModal";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useRating } from "@/hooks/useRating";
import type { HistoryEntry } from "@/hooks/useHistory";
import { formatRating } from "@/lib/rating";
import { WatchProvidersCompact } from "./WatchProvidersCompact";

/** Poster height — shared with `LastFilmPanel`'s skeleton so the swap
 * doesn't move. */
export const POSTER_HEIGHT_CLASS = "h-[240px]";

/** The one-line facts under the title, skipping unknown values; genres
 * capped at 2 to keep it on a single line in the narrow panel. */
function filmFacts(film: HistoryEntry): string[] {
  return [
    film.director,
    film.year !== null ? String(film.year) : null,
    film.runtime !== null ? `${film.runtime} min` : null,
    film.genres.slice(0, 2).join(", ") || null,
  ].filter((fact): fact is string => fact !== null);
}

/** AI match score (the panel's key number — same big heading-font treatment
 * as WatchlistPanel's film count) next to the TMDB rating. */
function LastFilmScores({ film }: { film: HistoryEntry }) {
  const { session } = useAuth();
  const rating = useRating(film.tmdbId, session?.access_token ?? null);

  return (
    <div className="flex items-end gap-6">
      {film.matchScore !== null && (
        <div className="flex flex-col">
          <span className="font-heading text-4xl font-medium leading-none text-[var(--cp-accent)]">
            {film.matchScore}%
          </span>
          <span className="mt-1 text-xs text-[var(--text-tertiary)]">de match</span>
        </div>
      )}
      {rating.loading ? (
        <Skeleton className="h-10 w-16" />
      ) : (
        rating.voteAverage !== null && (
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-lg font-semibold leading-none text-[var(--warning)]">
              <Star className="size-4 fill-current" />
              {formatRating(rating.voteAverage)}
            </span>
            <span className="mt-1 text-xs text-[var(--text-tertiary)]">sur TMDB</span>
          </div>
        )
      )}
    </div>
  );
}

/** Dashboard glance at the last accepted film — not a full film sheet:
 * facts line, scores, the AI's reason clamped to 3 lines, and compact watch
 * providers. Kept compact on purpose, since WatchlistPanel stretches to this
 * row's height. "Voir plus" opens the history's full `FilmCard` popup. */
export function LastFilmDetails({ film }: { film: HistoryEntry }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const facts = filmFacts(film);

  return (
    <div className="flex items-start gap-5 min-h-0">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <FilmPoster
          posterUrl={film.posterUrl}
          alt={film.title}
          className={`${POSTER_HEIGHT_CLASS} w-auto`}
        />
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="rounded-sm text-xs text-[var(--cp-accent)] underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-accent)]"
        >
          Voir plus
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-2xl leading-tight text-wrap-balance text-[var(--text-primary)]">
            {film.title}
          </h3>
          {facts.length > 0 && (
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-[var(--text-secondary)]">
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </p>
          )}
        </div>

        <LastFilmScores film={film} />

        {film.aiSummary !== null && (
          <p className="line-clamp-3 text-sm italic leading-relaxed text-[var(--text-secondary)]">
            {film.aiSummary}
          </p>
        )}

        <WatchProvidersCompact tmdbId={film.tmdbId} />
      </div>

      <FilmDetailModal
        entry={detailOpen ? film : null}
        onOpenChange={(open) => {
          if (!open) setDetailOpen(false);
        }}
      />
    </div>
  );
}
