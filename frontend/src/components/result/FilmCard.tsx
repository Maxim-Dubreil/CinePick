import { useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import { WatchProvidersBlock } from "@/components/WatchProvidersBlock";
import { genreLabels } from "@/lib/genres";
import { formatRating } from "@/lib/rating";
import { cn } from "@/lib/utils";
import type { RecommendedFilm } from "@/lib/backend/api";
import { useAuth } from "@/hooks/useAuth";
import { useRating } from "@/hooks/useRating";
import { useWatchProviders } from "@/hooks/useWatchProviders";

/** How long the card holds itself back waiting for watch providers/rating
 * before showing anyway (each block then keeps its own skeleton, or hides
 * itself, until TMDB answers). */
const PROVIDERS_MAX_WAIT_MS = 1000;

// Same box treatment as ui/dialog.tsx DialogContent (rounded-xl, bg-popover,
// ring-foreground/10) — deliberately not the translucent --glass-bg Card
// variant used elsewhere on Result. Smaller poster and padding below `sm` so
// the card doesn't turn into a long scroll on phones.
const CARD_BOX =
  "flex w-full max-w-5xl flex-col items-stretch gap-6 rounded-xl bg-popover p-5 text-popover-foreground ring-1 ring-foreground/10 sm:flex-row sm:gap-8 sm:p-8";

/** The subset of a film `FilmCard` renders — a full `RecommendedFilm` on
 * Result, rebuilt from a `HistoryEntry` in the history detail popup. */
export type FilmCardFilm = Pick<
  RecommendedFilm,
  | "tmdb_id"
  | "title"
  | "poster_url"
  | "year"
  | "runtime"
  | "overview"
  | "genres"
  | "director"
  | "actors"
  | "match_score"
  | "critique"
>;

interface FilmCardProps {
  film: FilmCardFilm;
  /** Extra line under the title (e.g. history's decision badge + date). */
  status?: ReactNode;
  className?: string;
  /** Fires with `false` while the skeleton is shown, `true` once the real
   * card is — Result uses it to keep the decision buttons disabled so a
   * film can't be accepted/skipped before it's visible. */
  onReadyChange?: (ready: boolean) => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </h3>
  );
}

/** Same label treatment as `MetaField`, but the value stands out (amber
 * star, bold) — a rating reads differently from plain facts like year or
 * runtime. */
function RatingField({ voteAverage }: { voteAverage: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        Note TMDB
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-[var(--warning)]">
        <Star className="size-3.5 fill-current" />
        {formatRating(voteAverage)}/10
      </span>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-sm text-[var(--text-secondary)]">{value}</span>
    </div>
  );
}

/** Mirrors the card's layout so the skeleton -> card swap barely moves. */
function FilmCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(CARD_BOX, className)}>
      <Skeleton className="mx-auto aspect-[2/3] w-40 shrink-0 self-start rounded-[var(--radius-lg)] sm:mx-0 sm:w-96" />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
        </div>
      </div>
    </div>
  );
}

/** Full film overview: poster, title, director, meta, synopsis, AI critique
 * and where to watch. Shared by Result and the history detail popup.
 *
 * Watch providers are fetched here rather than inside the streaming block so
 * the whole card appears in one paint once they're in — capped at
 * `PROVIDERS_MAX_WAIT_MS` so a slow TMDB never leaves it stuck on the
 * skeleton (see frontend/CLAUDE.md, "Page-level reveal"). */
export function FilmCard({ film, status, className, onReadyChange }: FilmCardProps) {
  const genres = genreLabels(film.genres);
  const { session } = useAuth();
  const watchProviders = useWatchProviders(film.tmdb_id, session?.access_token ?? null);
  const rating = useRating(film.tmdb_id, session?.access_token ?? null);

  // Tagged with the film it fired for, so moving to another film (Result's
  // "Passer", reopening the history popup) starts a fresh wait.
  const [timedOutFor, setTimedOutFor] = useState<number | null>(null);
  useEffect(() => {
    if (film.tmdb_id === null) return;
    const tmdbId = film.tmdb_id;
    const timer = setTimeout(() => setTimedOutFor(tmdbId), PROVIDERS_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [film.tmdb_id]);

  const ready = (!watchProviders.loading && !rating.loading) || timedOutFor === film.tmdb_id;
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  if (!ready) {
    return <FilmCardSkeleton className={className} />;
  }

  return (
    <div className={cn(CARD_BOX, className)}>
      <FilmPoster
        posterUrl={film.poster_url}
        alt={film.title}
        className="mx-auto w-40 shrink-0 self-start sm:mx-0 sm:w-96"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-3xl leading-tight sm:text-4xl text-wrap-balance text-[var(--text-primary)]">
            {film.title}
          </h2>
          {film.match_score !== null && (
            <Badge variant="accent" className="mt-1 shrink-0">
              {film.match_score}% de match
            </Badge>
          )}
        </div>

        {status}

        {film.director !== null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Réalisateur
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{film.director}</p>
          </div>
        )}

        {film.actors.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Avec
            </span>
            <p className="text-sm text-[var(--text-secondary)]">{film.actors.join(", ")}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {film.year !== null && <MetaField label="Année" value={String(film.year)} />}
          {genres.length > 0 && <MetaField label="Genre" value={genres.join(", ")} />}
          {film.runtime !== null && <MetaField label="Durée" value={`${film.runtime} min`} />}
          {rating.loading ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Note TMDB
              </span>
              <Skeleton className="h-5 w-12" />
            </div>
          ) : (
            rating.voteAverage !== null && <RatingField voteAverage={rating.voteAverage} />
          )}
        </div>

        {film.overview !== null && (
          <div className="flex flex-col gap-1">
            <SectionLabel>Synopsis</SectionLabel>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {film.overview}
            </p>
          </div>
        )}

        {film.critique !== null && (
          <div className="flex flex-col gap-1">
            <SectionLabel>Pourquoi ce film ?</SectionLabel>
            <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
              {film.critique}
            </p>
          </div>
        )}

        <WatchProvidersBlock tmdbId={film.tmdb_id} watchProviders={watchProviders} />
      </div>
    </div>
  );
}
