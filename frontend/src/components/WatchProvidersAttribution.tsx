/** Mandatory JustWatch attribution (CIN-103) — TMDB's terms require a
 * reference wherever `watch/providers` data is shown, on every screen, not
 * just once in the app's credits (About has the fuller mention). Kept as
 * light as the requirement allows: tiny and low-opacity. */
export function WatchProvidersAttribution() {
  return (
    <p className="text-[9px] text-[var(--text-tertiary)] opacity-60">
      Source : JustWatch
    </p>
  );
}
