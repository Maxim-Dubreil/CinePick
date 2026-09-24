import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import type { UserProfile } from "@/hooks/useProfile";
import { formatRelativeTime, getSyncAge, syncAgeColor } from "@/lib/syncAge";

interface WatchlistPanelProps {
  profile: UserProfile;
  isSyncing: boolean;
  onResync: () => void;
}

export function WatchlistPanel({
  profile,
  isSyncing,
  onResync,
}: WatchlistPanelProps) {
  const age = getSyncAge(profile.last_sync);

  return (
    <div className="h-full rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 flex flex-col gap-5">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Ta watchlist
      </p>

      {profile.letterboxd_username && (
        <p className="text-sm text-[var(--text-secondary)] -mt-2">
          @{profile.letterboxd_username}
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-5xl font-medium leading-none text-[var(--cp-accent)]">
          {profile.film_count}
        </span>
        <span className="text-[11px] tracking-widest text-[var(--text-secondary)] uppercase mt-1">
          Films
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-5">
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
    </div>
  );
}
