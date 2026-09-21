import { Button } from "@/components/ui";

interface DecisionButtonsProps {
  onAccept: () => void;
  onSkip: () => void;
}

export function DecisionButtons({ onAccept, onSkip }: DecisionButtonsProps) {
  return (
    <div className="flex gap-4">
      <Button variant="glass-danger" size="lg" onClick={onSkip}>
        Passer
      </Button>
      <Button variant="glass-success" size="lg" onClick={onAccept}>
        Accepter
      </Button>
    </div>
  );
}
