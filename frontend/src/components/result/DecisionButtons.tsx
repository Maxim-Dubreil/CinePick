import { Button } from "@/components/ui";

interface DecisionButtonsProps {
  onAccept: () => void;
  onSkip: () => void;
}

export function DecisionButtons({ onAccept, onSkip }: DecisionButtonsProps) {
  return (
    <div className="flex gap-4">
      <Button variant="outline" size="lg" onClick={onSkip}>
        Passer
      </Button>
      <Button variant="glass-accent" size="lg" onClick={onAccept}>
        Accepter
      </Button>
    </div>
  );
}
