import { Clapperboard } from "lucide-react";
import { FilmPoster } from "@/components/FilmPoster";
import type { UseLastAcceptedFilmResult } from "@/hooks/useLastAcceptedFilm";

type LastFilmPanelProps = Pick<UseLastAcceptedFilmResult, "film" | "loading">;

export function LastFilmPanel({ film, loading }: LastFilmPanelProps) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 flex flex-col gap-4 h-full min-h-48">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Dernier film
      </p>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[var(--text-tertiary)]">Chargement…</span>
        </div>
      ) : film ? (
        <div className="flex-1 flex items-start gap-4 min-h-0">
          <FilmPoster
            posterUrl={film.posterUrl}
            alt={film.title}
            className="h-48 w-auto shrink-0"
          />
          <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)]">{film.title}</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {[
                film.director ?? "Réalisateur inconnu",
                film.year,
                film.runtime !== null ? `${film.runtime} min` : null,
                film.genres.length > 0 ? film.genres.join(", ") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {film.overview && (
              <p className="text-xs text-[var(--text-tertiary)]">{film.overview}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative flex items-center justify-center size-16 rounded-full bg-[var(--cp-accent)]/10">
              <div className="absolute inset-0 rounded-full bg-[var(--cp-accent)]/20 blur-lg" />
              <Clapperboard size={28} strokeWidth={1.5} className="relative text-[var(--cp-accent)]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Aucune séance pour l'instant
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Ton premier film accepté atterrira ici
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
