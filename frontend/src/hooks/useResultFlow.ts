import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getRecommendation,
  recordDecision,
  type RecommendedFilm,
  type RecommendRequest,
} from "@/lib/backend/api";
import type { DeadEndReason } from "@/components/result/DeadEndScreen";

// Floor so the cosmetic LoadingSteps animation never gets cut off by a
// fast response — see docs/superpowers/specs/2026-09-17-result-screen-design.md.
export const MIN_LOADING_MS = 900;
const MAX_ATTEMPTS = 2;

const TOAST_NETWORK = "Petit souci réseau — ta dernière décision n'a peut-être pas été enregistrée.";
const TOAST_UNKNOWN_CANDIDATE = "Cette décision n'a pas pu être enregistrée.";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function errorToDeadEndReason(error: unknown): DeadEndReason {
  if (error instanceof ApiError && error.status === 422) {
    return "no_match";
  }
  return "technical";
}

interface ResultFlowState {
  phase: "loading" | "card" | "accepted" | "dead-end";
  candidates: RecommendedFilm[];
  currentIndex: number;
  attempt: number;
  deadEndReason: DeadEndReason | null;
  toastMessage: string | null;
  acceptedFilm: RecommendedFilm | null;
}

export interface UseResultFlowResult {
  phase: ResultFlowState["phase"];
  currentFilm: RecommendedFilm | null;
  deadEndReason: DeadEndReason | null;
  toastMessage: string | null;
  acceptedFilm: RecommendedFilm | null;
  onAccept: () => void;
  onSkip: () => void;
  dismissToast: () => void;
}

export function useResultFlow(
  answers: RecommendRequest,
  token: string | null,
): UseResultFlowResult {
  const [state, setState] = useState<ResultFlowState>({
    phase: "loading",
    candidates: [],
    currentIndex: 0,
    attempt: 1,
    deadEndReason: null,
    toastMessage: null,
    acceptedFilm: null,
  });

  const requestFilm = useCallback(
    async (attempt: number) => {
      setState((s) => ({ ...s, phase: "loading", attempt }));
      try {
        const [response] = await Promise.all([
          getRecommendation(answers, token),
          wait(MIN_LOADING_MS),
        ]);
        setState((s) => ({
          ...s,
          phase: "card",
          candidates: response.candidates,
          currentIndex: 0,
        }));
      } catch (error) {
        setState((s) => ({
          ...s,
          phase: "dead-end",
          deadEndReason: errorToDeadEndReason(error),
        }));
      }
    },
    [answers, token],
  );

  // React 19 StrictMode (see frontend/src/main.tsx) mounts effects twice in
  // dev — without this guard, that would fire two /recommend calls on load.
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void requestFilm(1);
  }, [requestFilm]);

  function recordDecisionSafely(
    filmToRecord: RecommendedFilm,
    decision: "accepted" | "skipped",
  ) {
    recordDecision(
      {
        film_id: filmToRecord.film_id,
        decision,
        match_score: filmToRecord.match_score,
        critique: filmToRecord.critique,
      },
      token,
    ).catch((error: unknown) => {
      const message =
        error instanceof ApiError && error.status === 404
          ? TOAST_UNKNOWN_CANDIDATE
          : TOAST_NETWORK;
      setState((s) => ({ ...s, toastMessage: message }));
    });
  }

  function onAccept() {
    const currentFilm = state.candidates[state.currentIndex];
    recordDecisionSafely(currentFilm, "accepted");
    setState((s) => ({ ...s, phase: "accepted", acceptedFilm: currentFilm }));
  }

  function onSkip() {
    const currentFilm = state.candidates[state.currentIndex];
    recordDecisionSafely(currentFilm, "skipped");

    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.candidates.length) {
      setState((s) => ({ ...s, currentIndex: nextIndex }));
      return;
    }

    if (state.attempt < MAX_ATTEMPTS) {
      void requestFilm(state.attempt + 1);
      return;
    }

    setState((s) => ({ ...s, phase: "dead-end", deadEndReason: "no_match" }));
  }

  function dismissToast() {
    setState((s) => ({ ...s, toastMessage: null }));
  }

  return {
    phase: state.phase,
    currentFilm: state.candidates[state.currentIndex] ?? null,
    deadEndReason: state.deadEndReason,
    toastMessage: state.toastMessage,
    acceptedFilm: state.acceptedFilm,
    onAccept,
    onSkip,
    dismissToast,
  };
}
