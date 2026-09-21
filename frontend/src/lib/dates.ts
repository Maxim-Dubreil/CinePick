/** Formats an ISO date as a day-granularity relative label ("Aujourd'hui",
 * "Hier", "il y a N j"). Kept separate from WatchlistPanel/ProfileSync's
 * `formatRelativeTime` (minute/hour precision, tied to sync freshness
 * coloring) since history dates only ever need day precision. */
export function formatDaysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `il y a ${days} j`;
}
