import type { FilmDuration, FilmEra, MockFilm } from "./types";
import { GENRES, OTHER_COUNTRIES, REGIONS } from "./questionnaire";

const DURATIONS: FilmDuration[] = ["lt90", "90-120", "120-150", "150plus"];
const ERAS: FilmEra[] = [
  "silent",
  "golden",
  "newwave",
  "blockbuster",
  "2000s",
  "recent",
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Watchlist mockée en mémoire — temporaire. À remplacer par le vrai fetch de
 * la watchlist enrichie TMDB (Supabase) une fois le backend branché.
 */
export function generateMockFilms(count: number): MockFilm[] {
  const films: MockFilm[] = [];
  for (let i = 0; i < count; i++) {
    const genreCount = Math.random() < 0.6 ? 1 : 2;
    const genres: string[] = [];
    while (genres.length < genreCount) {
      const genre = pick(GENRES);
      if (!genres.includes(genre)) genres.push(genre);
    }
    const country =
      Math.random() < 0.72 ? pick(REGIONS).id : pick(OTHER_COUNTRIES);
    films.push({
      genres,
      duration: pick(DURATIONS),
      era: pick(ERAS),
      country,
      seen: Math.random() < 0.2,
    });
  }
  return films;
}
