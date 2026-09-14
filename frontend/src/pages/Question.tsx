import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuestionFlow } from "@/hooks/useQuestionFlow";
import {
  QuestionFlowHeader,
  FilmCountChip,
  FallbackBanner,
  OptionChipGroup,
  CustomRegionInput,
  ContinueButton,
  LoadingOverlay,
} from "@/components/question";

export function Question() {
  const navigate = useNavigate();

  const onComplete = useCallback(
    (filmCount: number) => {
      navigate("/home/result", { state: { filmCount } });
    },
    [navigate],
  );

  const flow = useQuestionFlow({ onComplete });
  const { currentQuestion } = flow;

  return (
    <div className="relative flex h-full flex-col">
      <QuestionFlowHeader
        step={flow.step}
        totalSteps={flow.totalSteps}
        showBackButton={flow.showBackButton}
        onBack={flow.onBack}
      />

      <div className="flex flex-1 items-center justify-center px-6 pt-4 pb-12">
        <div
          key={flow.step}
          className="flex w-full max-w-[660px] animate-cp-fadein flex-col items-center gap-6"
        >
          <FilmCountChip
            filmCount={flow.filmCount}
            isSoftQuestion={!currentQuestion.hard}
          />
          <FallbackBanner note={flow.fallbackNote} />

          <h2 className="max-w-[560px] text-center font-heading text-4xl italic">
            {currentQuestion.label}
          </h2>

          <OptionChipGroup
            question={currentQuestion}
            selectedIds={flow.selectedIds}
            onSelectSingle={flow.onSelectSingle}
            onToggleMulti={flow.onToggleMulti}
            onOpenCustomRegion={flow.onOpenCustomRegion}
          />

          {flow.customRegionOpen && currentQuestion.id === "region" && (
            <CustomRegionInput
              value={flow.customRegionValue}
              onChange={flow.onCustomRegionValueChange}
              onSubmit={flow.onCustomRegionSubmit}
            />
          )}

          <ContinueButton
            visible={currentQuestion.multi}
            enabled={flow.hasSelection}
            onClick={flow.onConfirmMulti}
          />
        </div>
      </div>

      <LoadingOverlay visible={flow.loading} />
    </div>
  );
}
