import { Badge } from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import { genreLabels } from "@/lib/genres";
import type { RecommendedFilm } from "@/lib/backend/api";

interface FilmCardProps {
  film: RecommendedFilm;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </h3>
  );
}

export function FilmCard({ film }: FilmCardProps) {
  const meta = [
    ...genreLabels(film.genres),
    film.director,
    film.runtime !== null ? `${film.runtime} min` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    // Same box treatment as the History "film detail" popup
    // (components/history/FilmDetailModal.tsx / ui/dialog.tsx DialogContent):
    // rounded-xl, bg-popover, ring-foreground/10 — deliberately not the
    // translucent --glass-bg Card variant used elsewhere on this screen.
    <div className="flex w-full max-w-4xl flex-col items-stretch gap-6 rounded-xl bg-popover p-6 text-popover-foreground ring-1 ring-foreground/10 sm:flex-row">
      <FilmPoster
        posterUrl={film.poster_url}
        alt={film.title}
        className="mx-auto w-56 shrink-0 sm:mx-0 sm:w-80"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-3xl leading-tight text-wrap-balance text-[var(--text-primary)]">
            {film.year !== null ? `${film.title} (${film.year})` : film.title}
          </h2>
          {film.match_score !== null && (
            <Badge variant="accent" className="mt-1 shrink-0">
              {film.match_score}% de match
            </Badge>
          )}
        </div>

        {meta.length > 0 && (
          <p className="text-sm text-[var(--text-tertiary)]">{meta.join(" · ")}</p>
        )}

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
            <SectionLabel>Recommandation IA</SectionLabel>
            <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
              {film.critique}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
