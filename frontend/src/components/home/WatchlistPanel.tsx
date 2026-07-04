import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import type { UserProfile } from "@/hooks/useProfile";

interface WatchlistPanelProps {
  profile: UserProfile;
  isSyncing: boolean;
  onResync: () => void;
}

type SyncAge = "fresh" | "stale" | "old" | "critical";

function getSyncAge(lastSync: string | null): SyncAge {
  if (!lastSync) return "critical";
  const diffHours = (Date.now() - new Date(lastSync).getTime()) / 3_600_000;
  if (diffHours < 48) return "fresh";
  if (diffHours < 168) return "stale"; // 2–7 j
  if (diffHours < 720) return "old"; // 7–30 j
  return "critical";
}

const syncAgeColor: Record<SyncAge, string> = {
  fresh: "text-[var(--success)]",
  stale: "text-[var(--warning)]",
  old: "text-orange-500",
  critical: "text-[var(--danger)]",
};

function formatRelativeTime(lastSync: string | null): string {
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

export function WatchlistPanel({
  profile,
  isSyncing,
  onResync,
}: WatchlistPanelProps) {
  const age = getSyncAge(profile.last_sync);

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 flex flex-col gap-5">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Ta watchlist
      </p>

      {profile.letterboxd_username && (
        <p className="text-sm text-[var(--text-secondary)] -mt-2">
          @{profile.letterboxd_username}
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        <span
          className="text-5xl font-medium leading-none text-[var(--cp-accent)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {profile.film_count}
        </span>
        <span className="text-[11px] tracking-widest text-[var(--text-secondary)] uppercase mt-1">
          Films
        </span>
      </div>

      <div className="h-px bg-[var(--border)]" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] tracking-widest text-[var(--text-tertiary)] uppercase whitespace-nowrap">
          Dernière sync
        </span>
        <span className={`text-sm font-medium ${syncAgeColor[age]}`}>
          {formatRelativeTime(profile.last_sync)}
        </span>
      </div>

      <Button
        variant="glass"
        size="sm"
        className="gap-2 w-full"
        onClick={onResync}
        disabled={isSyncing}
      >
        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
        Synchroniser maintenant
      </Button>
    </div>
  );
}
