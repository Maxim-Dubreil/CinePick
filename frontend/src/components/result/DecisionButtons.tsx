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
      <Button
        variant="glass-danger"
        size="lg"
        onClick={onSkip}
        disabled={disabled}
      >
        Passer
      </Button>
      <Button
        variant="glass-success"
        size="lg"
        onClick={onAccept}
        disabled={disabled}
      >
        Accepter
      </Button>
    </div>
  );
}
