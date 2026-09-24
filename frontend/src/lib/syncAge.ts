/** How stale a Letterboxd sync is, bucketed for color-coding. */
export type SyncAge = "fresh" | "stale" | "old" | "critical";

/** Buckets `lastSync` (ISO timestamp) by age: < 2 days fresh, < 7 days
 * stale, < 30 days old, otherwise (or never synced) critical. */
export function getSyncAge(lastSync: string | null): SyncAge {
  if (!lastSync) return "critical";
  const diffHours = (Date.now() - new Date(lastSync).getTime()) / 3_600_000;
  if (diffHours < 48) return "fresh";
  if (diffHours < 168) return "stale";
  if (diffHours < 720) return "old";
  return "critical";
}

/** Text color class for each `SyncAge` bucket. */
export const syncAgeColor: Record<SyncAge, string> = {
  fresh: "text-[var(--success)]",
  stale: "text-[var(--warning)]",
  old: "text-orange-500",
  critical: "text-[var(--danger)]",
};

/** French relative time since `lastSync` ("il y a 5 min", "il y a 3 j"),
 * or "Jamais synchronisé" when there's no sync yet. */
export function formatRelativeTime(lastSync: string | null): string {
  if (!lastSync) return "Jamais synchronisé";
  const diffMs = Date.now() - new Date(lastSync).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}
