import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import type { RecommendedFilm } from "@/lib/backend/api";

interface FilmCardProps {
  film: RecommendedFilm;
}

export function FilmCard({ film }: FilmCardProps) {
  const showAiBlock = film.match_score !== null || film.critique !== null;

  return (
    <Card className="w-full max-w-xs items-center text-center">
      <FilmPoster posterUrl={film.poster_url} alt={film.title} className="w-full" />
      <CardHeader>
        <CardTitle>
          {film.year !== null ? `${film.title} (${film.year})` : film.title}
        </CardTitle>
        {film.director && <CardDescription>{film.director}</CardDescription>}
      </CardHeader>
      {showAiBlock && (
        <CardContent className="flex flex-col items-center gap-2">
          {film.match_score !== null && (
            <Badge variant="accent">{film.match_score}% de match</Badge>
          )}
          {film.critique !== null && (
            <p className="text-sm italic text-[var(--text-secondary)]">
              {film.critique}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
