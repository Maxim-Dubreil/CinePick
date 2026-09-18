import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { RecommendedFilm } from "@/lib/backend/api";

interface FilmCardProps {
  film: RecommendedFilm;
}

export function FilmCard({ film }: FilmCardProps) {
  const showAiBlock = film.match_score !== null || film.critique !== null;

  return (
    <Card className="w-full max-w-xs items-center text-center">
      {film.poster_url ? (
        <img
          src={film.poster_url}
          alt={film.title}
          className="aspect-[2/3] w-full rounded-[var(--radius-lg)] object-cover"
        />
      ) : (
        <div className="aspect-[2/3] w-full rounded-[var(--radius-lg)] bg-[var(--glass-bg)]" />
      )}
      <CardHeader>
        <CardTitle>
          {film.year !== null ? `${film.title} (${film.year})` : film.title}
        </CardTitle>
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
