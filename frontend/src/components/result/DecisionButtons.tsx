import { Heart, X } from "lucide-react";
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
        className="gap-2 rounded-full px-7 transition-transform hover:scale-105"
        onClick={onSkip}
        disabled={disabled}
      >
        <X className="size-5" />
        Passer
      </Button>
      <Button
        variant="glass-success"
        size="lg"
        className="gap-2 rounded-full px-7 transition-transform hover:scale-105"
        onClick={onAccept}
        disabled={disabled}
      >
        <Heart className="size-5" />
        Accepter
      </Button>
    </div>
  );
}
