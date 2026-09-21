import type { AnswerValue, AppliedFilter, FilterFilm, QuestionId } from "./types";

/** Must stay in sync with `filtering.py`'s `_SESSION_WINDOW` — a film
 * touched more recently than this is excluded unconditionally, regardless
 * of the "jamais vu" answer. */
const SESSION_WINDOW_MS = 15 * 60 * 1000;

/**
 * Piège région : filtrer sur `origin_country`, jamais sur `original_language`
 * (un film britannique a origin_country GB mais original_language en, comme
 * un film américain) — voir Specs Questions (Linear).
 */
export function buildFilterTest(
  questionId: QuestionId,
  answer: AnswerValue,
): (film: FilterFilm) => boolean {
  if (questionId === "genre") {
    const genres = answer as string[];
    if (genres.includes("none")) return () => true;
    // AND, not OR: picking Comédie + Crime means a film that is both, not
    // either — mirrors filtering.py's `issubset` check.
    return (film) => genres.every((g) => film.genres.includes(g));
  }
  if (questionId === "duration") {
    if (answer === "any") return () => true;
    return (film) => film.duration === null || film.duration === answer;
  }
  if (questionId === "era") {
    if (answer === "any") return () => true;
    return (film) => film.era === null || film.era === answer;
  }
  if (questionId === "region") {
    const regions = answer as string[];
    if (regions.includes("none")) return () => true;
    const countries = regions.filter((r) => r !== "other");
    return (film) => film.origin_country.some((c) => countries.includes(c));
  }
  if (questionId === "seen") {
    const now = Date.now();
    return (film) => {
      if (film.last_proposed_at === null) return true;
      const touchedAt = new Date(film.last_proposed_at).getTime();
      if (now - touchedAt < SESSION_WINDOW_MS) return false;
      return answer === "any";
    };
  }
  return () => true;
}

export function countMatchingFilms(
  films: FilterFilm[],
  filters: AppliedFilter[],
): number {
  return films.filter((film) => filters.every((filter) => filter.test(film)))
    .length;
}
