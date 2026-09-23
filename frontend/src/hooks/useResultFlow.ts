import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonCurrentRecommendation,
  ApiError,
  getRecommendation,
  recordDecision,
  type RecommendCurrentResponse,
  type RecommendedFilm,
  type RecommendRequest,
} from "@/lib/backend/api";
import type { DeadEndReason } from "@/components/result/DeadEndScreen";

// Floor so the cosmetic LoadingSteps animation never gets cut off by a
// fast response — see docs/superpowers/specs/2026-09-17-result-screen-design.md.
export const MIN_LOADING_MS = 900;
const MAX_ATTEMPTS = 2;

const TOAST_NETWORK =
  "Petit souci réseau — ta dernière décision n'a peut-être pas été enregistrée.";
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

function errorToDevDetail(error: unknown): string | null {
  if (!import.meta.env.DEV) return null;
  if (error instanceof ApiError) return `[${error.status}] ${error.message}`;
  return String(error);
}

/** A fresh flow POSTs /recommend on mount; a resumed one hydrates directly
 * from an already-fetched GET /recommend/current response — no AI call. */
export type ResultFlowStart =
  | { type: "fresh"; answers: RecommendRequest }
  | { type: "resumed"; response: RecommendCurrentResponse };

interface ResultFlowState {
  phase: "loading" | "card" | "accepted" | "dead-end";
  candidates: RecommendedFilm[];
  currentIndex: number;
  attempt: number;
  deadEndReason: DeadEndReason | null;
  deadEndDetail: string | null;
  toastMessage: string | null;
  toastId: number;
  acceptedFilm: RecommendedFilm | null;
  deciding: boolean;
  recommendationSessionId: string | null;
  abandoning: boolean;
}

export interface UseResultFlowResult {
  phase: ResultFlowState["phase"];
  currentFilm: RecommendedFilm | null;
  deadEndReason: DeadEndReason | null;
  deadEndDetail: string | null;
  toastMessage: string | null;
  toastId: number;
  acceptedFilm: RecommendedFilm | null;
  deciding: boolean;
  recommendationSessionId: string | null;
  resumed: boolean;
  abandoning: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onAbandon: () => Promise<void>;
  dismissToast: () => void;
}

export function useResultFlow(
  start: ResultFlowStart,
  token: string | null,
  ready: boolean,
): UseResultFlowResult {
  const [state, setState] = useState<ResultFlowState>({
    phase: "loading",
    candidates: [],
    currentIndex: 0,
    attempt: 1,
    deadEndReason: null,
    deadEndDetail: null,
    toastMessage: null,
    toastId: 0,
    acceptedFilm: null,
    deciding: false,
    recommendationSessionId: null,
    abandoning: false,
  });

  // The answers that produced (or would retry) this session — a resumed
  // start carries them from its original /recommend call, since the front
  // never went through Questions this time to have them any other way.
  const answers = start.type === "fresh" ? start.answers : start.response.answers;

  const requestFilm = useCallback(
    async (attempt: number) => {
      setState((s) => ({ ...s, phase: "loading", attempt }));
      try {
        const [response] = await Promise.all([
          getRecommendation(answers, token),
          wait(MIN_LOADING_MS),
        ]);
        if (response.candidates.length === 0) {
          setState((s) => ({
            ...s,
            phase: "dead-end",
            deadEndReason: "no_match",
          }));
          return;
        }
        setState((s) => ({
          ...s,
          phase: "card",
          candidates: response.candidates,
          currentIndex: 0,
          recommendationSessionId: response.recommendation_session_id,
        }));
      } catch (error) {
        setState((s) => ({
          ...s,
          phase: "dead-end",
          deadEndReason: errorToDeadEndReason(error),
          deadEndDetail: errorToDevDetail(error),
        }));
      }
    },
    [answers, token],
  );

  // React 19 StrictMode (see frontend/src/main.tsx) mounts effects twice in
  // dev — without this guard, that would fire two /recommend calls on load.
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current || !ready) return;
    hasStarted.current = true;
    // A resumed start already has its candidates (GET /recommend/current
    // fetched them) — hydrate directly, no AI call. 0 candidates can't
    // happen here: the backend 404s that case instead of returning it.
    if (start.type === "resumed") {
      const { response } = start;
      setState((s) => ({
        ...s,
        phase: "card",
        candidates: response.candidates,
        currentIndex: 0,
        recommendationSessionId: response.recommendation_session_id,
      }));
      return;
    }
    void requestFilm(1);
  }, [requestFilm, ready, start]);

  function recordDecisionSafely(
    filmToRecord: RecommendedFilm,
    decision: "accepted" | "skipped",
  ) {
    recordDecision(
      {
        film_id: filmToRecord.film_id,
        recommendation_session_id: state.recommendationSessionId ?? "",
        decision,
      },
      token,
    )
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError && error.status === 404
            ? TOAST_UNKNOWN_CANDIDATE
            : TOAST_NETWORK;
        setState((s) => ({
          ...s,
          toastMessage: message,
          toastId: s.toastId + 1,
        }));
      })
      .finally(() => {
        setState((s) => ({ ...s, deciding: false }));
      });
  }

  function onAccept() {
    const currentFilm = state.candidates[state.currentIndex];
    if (!currentFilm || state.deciding) return;
    setState((s) => ({ ...s, deciding: true }));

    // Awaited (unlike skip's fire-and-forget): the "accepted" phase can be
    // left through several exits (the back-home button, the topbar logo,
    // "Aujourd'hui"), so the decision must be persisted before that screen
    // is even shown — otherwise the home screen's "dernier film" refetch
    // can win the race and still read the previous accepted film.
    recordDecision(
      {
        film_id: currentFilm.film_id,
        recommendation_session_id: state.recommendationSessionId ?? "",
        decision: "accepted",
      },
      token,
    )
      .then(() => {
        setState((s) => ({
          ...s,
          deciding: false,
          phase: "accepted",
          acceptedFilm: currentFilm,
        }));
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError && error.status === 404
            ? TOAST_UNKNOWN_CANDIDATE
            : TOAST_NETWORK;
        setState((s) => ({
          ...s,
          deciding: false,
          toastMessage: message,
          toastId: s.toastId + 1,
        }));
      });
  }

  function onSkip() {
    const currentFilm = state.candidates[state.currentIndex];
    if (!currentFilm || state.deciding) return;
    setState((s) => ({ ...s, deciding: true }));
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

  const dismissToast = useCallback(() => {
    setState((s) => ({ ...s, toastMessage: null }));
  }, []);

  // "Recommencer" on a resumed session: clears the still-pending candidates
  // server-side (marked skipped) so /recommend/current stops returning
  // them. Best-effort — a failure here just means a toast, the caller
  // navigates to Questions regardless (see Result.tsx).
  async function onAbandon(): Promise<void> {
    const sessionId = state.recommendationSessionId;
    if (state.abandoning || !sessionId) return;
    setState((s) => ({ ...s, abandoning: true }));
    try {
      await abandonCurrentRecommendation(sessionId, token);
    } catch {
      setState((s) => ({
        ...s,
        toastMessage: TOAST_NETWORK,
        toastId: s.toastId + 1,
      }));
    } finally {
      setState((s) => ({ ...s, abandoning: false }));
    }
  }

  return {
    phase: state.phase,
    currentFilm: state.candidates[state.currentIndex] ?? null,
    deadEndReason: state.deadEndReason,
    deadEndDetail: state.deadEndDetail,
    toastMessage: state.toastMessage,
    toastId: state.toastId,
    acceptedFilm: state.acceptedFilm,
    deciding: state.deciding,
    recommendationSessionId: state.recommendationSessionId,
    resumed: start.type === "resumed",
    abandoning: state.abandoning,
    onAccept,
    onSkip,
    onAbandon,
    dismissToast,
  };
}
