/** TMDB genre ids mapped to their French display label — shared between the
 * onboarding questionnaire and any film display (home, result). */
export const GENRES = [
  { id: "28", label: "Action" },
  { id: "12", label: "Aventure" },
  { id: "16", label: "Animation" },
  { id: "35", label: "Comédie" },
  { id: "80", label: "Crime" },
  { id: "99", label: "Documentaire" },
  { id: "18", label: "Drame" },
  { id: "10751", label: "Familial" },
  { id: "14", label: "Fantastique" },
  { id: "36", label: "Histoire" },
  { id: "27", label: "Horreur" },
  { id: "10402", label: "Musique" },
  { id: "9648", label: "Mystère" },
  { id: "10749", label: "Romance" },
  { id: "878", label: "Science-Fiction" },
  { id: "53", label: "Thriller" },
  { id: "10752", label: "Guerre" },
  { id: "37", label: "Western" },
] as const;

/** Human-readable labels for a list of TMDB genre ids, dropping unknown ids. */
export function genreLabels(ids: readonly string[]): string[] {
  const labels: string[] = [];
  for (const id of ids) {
    const genre = GENRES.find((g) => g.id === id);
    if (genre) labels.push(genre.label);
  }
  return labels;
}
