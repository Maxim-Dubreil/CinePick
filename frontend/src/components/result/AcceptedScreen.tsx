import { Button } from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import type { RecommendedFilm } from "@/lib/backend/api";

interface AcceptedScreenProps {
  film: RecommendedFilm;
  onBackHome: () => void;
}

export function AcceptedScreen({ film, onBackHome }: AcceptedScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <h2 className="max-w-[440px] font-heading text-4xl italic">
        Bonne séance !
      </h2>
      <FilmPoster
        posterUrl={film.poster_url}
        alt={film.title}
        className="w-40"
        showPlaceholder={false}
      />
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
