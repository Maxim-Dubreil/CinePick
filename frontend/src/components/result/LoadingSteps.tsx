import { useEffect, useState } from "react";
import { Progress } from "@/components/ui";

// Purely cosmetic: there is exactly one real network call behind this screen
// (POST /recommend), so there's nothing real to report progress on. Fixed
// timing, same pattern as LOADING_DELAY_MS in useQuestionFlow.ts.
export const STEP_DURATION_MS = 400;

const STEPS = [
  "Filtrage de ta watchlist",
  "Sélection des meilleurs films",
  "Prêt",
];

export function LoadingSteps() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) return;
    const timeoutId = window.setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [stepIndex]);

  const progressValue = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <Progress value={progressValue} />
      <p className="text-[11px] tracking-[0.10em] text-text-tertiary uppercase">
        {STEPS[stepIndex]}
      </p>
    </div>
  );
}
