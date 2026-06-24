import { Film } from "lucide-react";
import { Button } from "@/components/ui";

interface WatchlistBannerProps {
  onOpenModal: () => void;
}

export function WatchlistBanner({ onOpenModal }: WatchlistBannerProps) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Film size={16} className="shrink-0 text-[var(--text-secondary)]" />
        <span className="text-sm text-[var(--text-secondary)]">
          Connectez votre watchlist Letterboxd pour lancer un pick
        </span>
      </div>
      <Button variant="glass-accent" size="sm" onClick={onOpenModal}>
        Configurer
      </Button>
    </div>
  );
}
