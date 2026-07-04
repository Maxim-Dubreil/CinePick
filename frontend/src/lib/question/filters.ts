import type { AnswerValue, AppliedFilter, MockFilm, QuestionId } from "./types";

/**
 * Piège région : filtrer sur `origin_country`, jamais sur `original_language`
 * (un film britannique a origin_country GB mais original_language en, comme
 * un film américain) — voir Specs Questions (Linear).
 */
export function buildFilterTest(
  questionId: QuestionId,
  answer: AnswerValue,
): (film: MockFilm) => boolean {
  if (questionId === "genre") {
    const genres = answer as string[];
    if (genres.includes("none")) return () => true;
    return (film) => film.genres.some((g) => genres.includes(g));
  }
  if (questionId === "duration") {
    if (answer === "any") return () => true;
    return (film) => film.duration === answer;
  }
  if (questionId === "era") {
    if (answer === "any") return () => true;
    return (film) => film.era === answer;
  }
  if (questionId === "region") {
    const regions = answer as string[];
    if (regions.includes("none")) return () => true;
    const countries = regions.filter((r) => r !== "other");
    return (film) => countries.includes(film.country);
  }
  if (questionId === "seen") {
    if (answer === "any") return () => true;
    return (film) => !film.seen;
  }
  return () => true;
}

export function countMatchingFilms(
  films: MockFilm[],
  filters: AppliedFilter[],
): number {
  return films.filter((film) => filters.every((filter) => filter.test(film)))
    .length;
}
