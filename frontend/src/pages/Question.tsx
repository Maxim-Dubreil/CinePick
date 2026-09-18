import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuestionFlow } from "@/hooks/useQuestionFlow";
import type {
  AnswerValue,
  QuestionId,
} from "@/lib/question/types";
import type { RecommendRequest } from "@/lib/backend/api";
import { Button } from "@/components/ui";
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
  const { session, loading: authLoading } = useAuth();

  const onComplete = useCallback(
    (filmCount: number, answers: Record<QuestionId, AnswerValue>) => {
      navigate("/home/result", {
        state: { filmCount, answers: answers as unknown as RecommendRequest },
      });
    },
    [navigate],
  );

  const flow = useQuestionFlow({
    token: session?.access_token ?? null,
    ready: !authLoading,
    onComplete,
  });
  const { currentQuestion } = flow;

  if (flow.watchlistStatus === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="max-w-[440px] font-heading text-4xl italic">
          Impossible de récupérer ta watchlist pour l'instant.
        </h2>
        <Button
          variant="glass"
          className="mt-3 h-11 rounded-[var(--radius-xl)] px-6"
          onClick={flow.retryWatchlistFetch}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  if (flow.watchlistStatus === "loading") {
    return (
      <div className="relative flex h-full flex-col">
        <LoadingOverlay visible />
      </div>
    );
  }

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
