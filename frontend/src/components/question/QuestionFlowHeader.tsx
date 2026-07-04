import { ChevronLeft } from "lucide-react";
import { Button, Progress } from "@/components/ui";

interface QuestionFlowHeaderProps {
  step: number;
  totalSteps: number;
  showBackButton: boolean;
  onBack: () => void;
}

export function QuestionFlowHeader({
  step,
  totalSteps,
  showBackButton,
  onBack,
}: QuestionFlowHeaderProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-6">
      <div className="flex items-center gap-3.5 justify-self-start">
        {showBackButton && (
          <Button
            variant="glass"
            size="icon"
            className="rounded-full"
            onClick={onBack}
            aria-label="Retour"
          >
            <ChevronLeft size={16} />
          </Button>
        )}
        <span
          className="font-heading text-base font-medium tracking-[0.04em] text-text-primary"
        >
          CinePick
        </span>
      </div>

      <div className="flex w-80 max-w-[44vw] flex-col items-center gap-2">
        <span className="text-[11px] font-medium tracking-[0.10em] text-text-tertiary uppercase">
          Question {Math.min(step + 1, totalSteps)}/{totalSteps}
        </span>
        <Progress
          value={(step / totalSteps) * 100}
          className="h-[5px] w-full bg-[var(--border-default)]"
          indicatorClassName="bg-[linear-gradient(90deg,#7c3aed,#c4b5fd)]"
        />
      </div>

      <div />
    </div>
  );
}
