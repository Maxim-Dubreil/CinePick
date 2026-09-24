/** TMDB `vote_average` (out of 10) in French locale, 1 decimal — e.g.
 * 7.84 -> "7,8". Callers add their own "/10" suffix when they want one. */
export function formatRating(voteAverage: number): string {
  return voteAverage.toFixed(1).replace(".", ",");
}
