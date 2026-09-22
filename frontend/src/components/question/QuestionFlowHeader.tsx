import { Link } from "react-router-dom";
import { Progress } from "@/components/ui";
import type { QuestionPhase } from "@/lib/question/types";

interface QuestionFlowHeaderProps {
  step: number;
  totalSteps: number;
  phase: QuestionPhase;
}

export function QuestionFlowHeader({
  step,
  totalSteps,
  phase,
}: QuestionFlowHeaderProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-6">
      <div className="justify-self-start">
        <Link
          to="/home"
          className="font-heading text-base font-medium tracking-[0.04em] text-text-primary hover:opacity-80 transition-opacity"
        >
          CinePick
        </Link>
      </div>

      <div className="flex w-80 max-w-[44vw] flex-col items-center gap-2">
        <span className="text-[11px] font-medium tracking-[0.10em] text-text-tertiary uppercase">
          {phase} · {Math.min(step + 1, totalSteps)}/{totalSteps}
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
