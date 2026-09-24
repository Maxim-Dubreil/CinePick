import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuestionFlow } from "@/hooks/useQuestionFlow";
import type {
  AnswerValue,
  QuestionId,
} from "@/lib/question/types";
import {
  getCurrentRecommendation,
  type RecommendCurrentResponse,
  type RecommendRequest,
} from "@/lib/backend/api";
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

  // A pending recommendation always wins over starting a new one — resuming
  // it is the "point d'entrée décide" rule, checked once before the
  // questionnaire (or its own watchlist fetch) ever renders.
  const [pending, setPending] = useState<"checking" | "none" | RecommendCurrentResponse>(
    "checking",
  );
  const hasChecked = useRef(false);
  useEffect(() => {
    if (hasChecked.current || authLoading) return;
    hasChecked.current = true;
    getCurrentRecommendation(session?.access_token ?? null)
      .then((response) => {
        setPending(response ?? "none");
      })
      .catch(() => {
        // Best-effort: a failed check just means "start fresh", same as
        // before this feature existed — never blocks the questionnaire.
        setPending("none");
      });
  }, [authLoading, session?.access_token]);

  const onComplete = useCallback(
    (filmCount: number, answers: Record<QuestionId, AnswerValue>) => {
      // "subtitles" is a required backend field but no longer has a question
      // of its own (dropped from the flow, see docs/specs/questions.md) — it
      // always carries "no preference" now.
      const request = { ...answers, subtitles: "any" } as unknown as RecommendRequest;
      navigate("/home/result", {
        state: { filmCount, answers: request },
      });
    },
    [navigate],
  );

  const flow = useQuestionFlow({
    token: session?.access_token ?? null,
    ready: !authLoading && pending === "none",
    onComplete,
  });
  const { currentQuestion } = flow;

  if (pending === "checking") {
    return (
      <div className="relative flex h-full flex-col">
        <LoadingOverlay visible />
      </div>
    );
  }

  if (pending !== "none") {
    return <Navigate to="/home/result" state={{ resumed: pending }} replace />;
  }

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
        phase={currentQuestion.phase}
      />

      <div className="flex flex-1 items-start justify-center px-6 pt-[7vh] pb-12">
        <div
          key={flow.step}
          className="flex w-full max-w-[660px] animate-cp-fadein flex-col items-center gap-10"
        >
          <FilmCountChip
            filmCount={flow.filmCount}
            isSoftQuestion={!currentQuestion.hard}
          />
          <FallbackBanner note={flow.fallbackNote} />

          <h2 className="max-w-[600px] text-center font-heading text-[42px] italic">
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

          {flow.showBackButton && (
            // In-flow, not `fixed`: a fixed position stays glued to the
            // viewport bottom regardless of content height, so on a
            // long option list it ends up overlapping ContinueButton
            // instead of sitting below it.
            <button
              onClick={flow.onBack}
              className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            >
              <ChevronLeft size={14} />
              Question précédente
            </button>
          )}
        </div>
      </div>

      <LoadingOverlay visible={flow.loading} />
    </div>
  );
}
