import { Link2 } from "lucide-react";
import { Button } from "@/components/ui";

interface WatchlistOnboardingProps {
  onOpenModal: () => void;
}

export function WatchlistOnboarding({ onOpenModal }: WatchlistOnboardingProps) {
  return (
    <section className="mx-auto flex max-w-[460px] flex-col items-center gap-[18px] px-8 pt-2 text-center">
      <h2 className="text-[22px] font-semibold text-text-primary">
        Connecte ta watchlist Letterboxd
      </h2>
      <p className="text-sm leading-relaxed text-text-secondary">
        On a besoin de savoir quels films tu as déjà mis de côté pour te
        proposer le bon ce soir.
      </p>
      <Button
        variant="glass-primary"
        size="lg"
        className="mt-1 h-[46px] gap-[10px] rounded-[var(--radius-xl)] px-7 text-[15px]"
        onClick={onOpenModal}
      >
        <Link2 size={17} />
        Connecter Letterboxd
      </Button>
    </section>
  );
}
