import { Clapperboard } from "lucide-react";
import { FilmPoster } from "@/components/FilmPoster";
import type { UseLastAcceptedFilmResult } from "@/hooks/useLastAcceptedFilm";

type LastFilmPanelProps = Pick<UseLastAcceptedFilmResult, "film" | "loading">;

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-right text-xs font-medium text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export function LastFilmPanel({ film, loading }: LastFilmPanelProps) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--accent-border)] bg-[var(--accent-subtle)] p-6 flex flex-col gap-4 min-h-48">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Dernier film
      </p>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[var(--text-tertiary)]">Chargement…</span>
        </div>
      ) : film ? (
        <div className="flex items-start gap-6 min-h-0">
          <FilmPoster
            posterUrl={film.posterUrl}
            alt={film.title}
            className="h-[300px] w-auto shrink-0"
          />
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <h3
              className="text-2xl italic text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {film.title}
            </h3>

            <div className="flex flex-col gap-2">
              <MetaRow
                label="Réalisateur"
                value={film.director ?? "Inconnu"}
              />
              {film.year !== null && (
                <MetaRow label="Année" value={String(film.year)} />
              )}
              {film.runtime !== null && (
                <MetaRow label="Durée" value={`${film.runtime} min`} />
              )}
              {film.genres.length > 0 && (
                <MetaRow label="Genres" value={film.genres.join(", ")} />
              )}
            </div>

            {film.overview && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                  {film.overview}
                </p>
              </>
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
