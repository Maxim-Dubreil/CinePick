import { Button } from "@/components/ui";

interface WatchlistBannerProps {
  onOpenModal: () => void;
}

export function WatchlistBanner({ onOpenModal }: WatchlistBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-subtle)] px-3 py-2 shadow-[var(--shadow-glass)] backdrop-blur-xl">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--warning)] opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--warning)]" />
      </span>
      <span className="text-sm font-medium text-[var(--warning)]">
        Watchlist non configurée
      </span>
      <Button
        variant="glass"
        size="xs"
        onClick={onOpenModal}
        className="border-[var(--warning-border)] bg-[var(--warning-subtle)] text-[var(--warning)] hover:bg-[var(--warning)]/20"
      >
        Configurer
      </Button>
    </div>
  );
}
