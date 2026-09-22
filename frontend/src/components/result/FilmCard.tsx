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

export function FilmCard({ film }: FilmCardProps) {
  const genres = genreLabels(film.genres);

  return (
    // Same box treatment as the History "film detail" popup
    // (components/history/FilmDetailModal.tsx / ui/dialog.tsx DialogContent):
    // rounded-xl, bg-popover, ring-foreground/10 — deliberately not the
    // translucent --glass-bg Card variant used elsewhere on this screen.
    <div className="flex w-full max-w-5xl flex-col items-stretch gap-8 rounded-xl bg-popover p-8 text-popover-foreground ring-1 ring-foreground/10 sm:flex-row">
      <FilmPoster
        posterUrl={film.poster_url}
        alt={film.title}
        className="mx-auto w-64 shrink-0 sm:mx-0 sm:w-96"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-4xl leading-tight text-wrap-balance text-[var(--text-primary)]">
            {film.title}
          </h2>
          {film.match_score !== null && (
            <Badge variant="accent" className="mt-1 shrink-0">
              {film.match_score}% de match
            </Badge>
          )}
        </div>

        {film.director !== null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Réalisateur
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{film.director}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {film.year !== null && <MetaField label="Année" value={String(film.year)} />}
          {genres.length > 0 && <MetaField label="Genre" value={genres.join(", ")} />}
          {film.runtime !== null && <MetaField label="Durée" value={`${film.runtime} min`} />}
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
      </div>
    </div>
  );
}
