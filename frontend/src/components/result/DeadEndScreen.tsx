import { Button } from "@/components/ui";

export type DeadEndReason = "technical" | "no_match" | "exhausted";

const MESSAGES: Record<DeadEndReason, string> = {
  technical: "On n'arrive pas à te proposer un film pour l'instant.",
  no_match: "Aucun film ne correspond à tes critères.",
  exhausted: "Tu as vu tous les films qui correspondent à tes critères.",
};

interface DeadEndScreenProps {
  reason: DeadEndReason;
  detail?: string | null;
  onReset: () => void;
}

export function DeadEndScreen({ reason, detail, onReset }: DeadEndScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <h2 className="max-w-[440px] font-heading text-4xl italic">
        {MESSAGES[reason]}
      </h2>
      {detail && (
        <p className="max-w-[440px] break-words font-mono text-xs text-muted-foreground">
          {detail}
        </p>
      )}
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
