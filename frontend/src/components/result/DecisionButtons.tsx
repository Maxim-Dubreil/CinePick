import { Button } from "@/components/ui";

interface DecisionButtonsProps {
  onAccept: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function DecisionButtons({
  onAccept,
  onSkip,
  disabled = false,
}: DecisionButtonsProps) {
  return (
    <div className="flex gap-4">
      <Button variant="outline" size="lg" onClick={onSkip} disabled={disabled}>
        Passer
      </Button>
      <Button
        variant="glass-accent"
        size="lg"
        onClick={onAccept}
        disabled={disabled}
      >
        Accepter
      </Button>
    </div>
  );
}
