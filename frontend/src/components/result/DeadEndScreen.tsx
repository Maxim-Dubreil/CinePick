import { Button } from "@/components/ui";

export type DeadEndReason = "technical" | "no_match";

const MESSAGES: Record<DeadEndReason, string> = {
  technical: "On n'arrive pas à te proposer un film pour l'instant.",
  no_match: "Aucun film ne correspond à tes critères.",
};

interface DeadEndScreenProps {
  reason: DeadEndReason;
  onReset: () => void;
}

export function DeadEndScreen({ reason, onReset }: DeadEndScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <h2 className="max-w-[440px] font-heading text-4xl italic">
        {MESSAGES[reason]}
      </h2>
      <Button
        variant="glass"
        className="mt-3 h-11 rounded-[var(--radius-xl)] px-6"
        onClick={onReset}
      >
        Retour aux Questions
      </Button>
    </div>
  );
}
