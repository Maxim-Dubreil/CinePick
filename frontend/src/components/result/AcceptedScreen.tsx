import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import type { RecommendedFilm } from "@/lib/backend/api";

interface AcceptedScreenProps {
  film: RecommendedFilm;
  onBackHome: () => void;
}

export function AcceptedScreen({ film, onBackHome }: AcceptedScreenProps) {
  return (
    <div className="flex h-full animate-in flex-col items-center justify-center gap-5 px-6 text-center fade-in zoom-in-95 duration-500">
      <h2 className="max-w-[440px] font-heading text-4xl italic">
        Bonne séance !
      </h2>
      {film.poster_url && (
        <div className="relative">
          <div className="absolute inset-0 scale-110 rounded-[var(--radius-xl)] bg-[var(--cp-accent)]/25 blur-2xl" />
          <FilmPoster
            posterUrl={film.poster_url}
            alt={film.title}
            className="relative w-52 shadow-[var(--shadow-glass-accent)]"
          />
          <CheckCircle2 className="absolute -right-2 -bottom-2 size-9 rounded-full bg-background text-[var(--success)]" />
        </div>
      )}
      <p className="text-lg text-text-secondary">
        {film.year !== null ? `${film.title} (${film.year})` : film.title}
      </p>
      <Button
        variant="glass"
        className="mt-3 h-11 rounded-[var(--radius-xl)] px-6"
        onClick={onBackHome}
      >
        Retour à l'accueil
      </Button>
    </div>
  );
}
