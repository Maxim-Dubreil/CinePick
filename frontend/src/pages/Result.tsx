import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useResultFlow, type ResultFlowStart } from "@/hooks/useResultFlow";
import {
  FilmCard,
  DecisionButtons,
  LoadingSteps,
  AcceptedScreen,
  DeadEndScreen,
} from "@/components/result";
import { Toast } from "@/components/ui";
import {
  getCurrentRecommendation,
  type RecommendCurrentResponse,
  type RecommendRequest,
} from "@/lib/backend/api";

interface FreshLocationState {
  filmCount: number;
  answers: RecommendRequest;
}

function isFreshLocationState(state: unknown): state is FreshLocationState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as FreshLocationState).filmCount === "number" &&
    typeof (state as FreshLocationState).answers === "object" &&
    (state as FreshLocationState).answers !== null
  );
}

interface ResumedLocationState {
  resumed: RecommendCurrentResponse;
}

function isResumedLocationState(state: unknown): state is ResumedLocationState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as ResumedLocationState).resumed === "object" &&
    (state as ResumedLocationState).resumed !== null
  );
}

interface ResultProps {
  /** Called right before navigating back to the home screen after accepting
   * a film, so `useLastAcceptedFilm` (which otherwise only fetches on mount)
   * picks up the newly-recorded decision. */
  onAccepted: () => void;
}

export function Result({ onAccepted }: ResultProps) {
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();

  if (isFreshLocationState(location.state)) {
    return (
      <ResultFlowScreen
        start={{ type: "fresh", answers: location.state.answers }}
        onAccepted={onAccepted}
      />
    );
  }

  if (isResumedLocationState(location.state)) {
    return (
      <ResultFlowScreen
        start={{ type: "resumed", response: location.state.resumed }}
        onAccepted={onAccepted}
      />
    );
  }

  // No usable navigation state at all (reload, direct link, lost state) —
  // check for a pending session before giving up on Questions.
  return (
    <ResumeCheck
      authLoading={authLoading}
      token={session?.access_token ?? null}
      onAccepted={onAccepted}
    />
  );
}

interface ResumeCheckProps {
  authLoading: boolean;
  token: string | null;
  onAccepted: () => void;
}

function ResumeCheck({ authLoading, token, onAccepted }: ResumeCheckProps) {
  const [pending, setPending] = useState<"checking" | "none" | ResultFlowStart>(
    "checking",
  );
  const hasChecked = useRef(false);
  useEffect(() => {
    if (hasChecked.current || authLoading) return;
    hasChecked.current = true;
    getCurrentRecommendation(token)
      .then((response) => {
        setPending(response ? { type: "resumed", response } : "none");
      })
      .catch(() => {
        // Best-effort: same fallback as before this feature existed —
        // no usable state, no way to check, so back to Questions.
        setPending("none");
      });
  }, [authLoading, token]);

  if (pending === "checking") {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center gap-6 px-6"
        aria-live="polite"
      >
        <LoadingSteps />
      </div>
    );
  }

  if (pending === "none") {
    return <Navigate to="/home/question" replace />;
  }

  return <ResultFlowScreen start={pending} onAccepted={onAccepted} />;
}

interface ResultFlowScreenProps {
  start: ResultFlowStart;
  onAccepted: () => void;
}

function ResultFlowScreen({ start, onAccepted }: ResultFlowScreenProps) {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const flow = useResultFlow(
    start,
    session?.access_token ?? null,
    !authLoading,
  );

  // The "accepted" screen can be left through several exits (this button,
  // the topbar logo, "Aujourd'hui") — not just onBackHome below — so the
  // refetch signal is tied to leaving this screen while a film was
  // accepted, not to any single exit's click handler.
  const phaseRef = useRef(flow.phase);
  useEffect(() => {
    phaseRef.current = flow.phase;
  });
  useEffect(() => {
    return () => {
      if (phaseRef.current === "accepted") onAccepted();
    };
  }, [onAccepted]);

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-6 px-6"
      aria-live="polite"
    >
      {flow.phase === "loading" && <LoadingSteps />}

      {flow.phase === "card" && flow.currentFilm && (
        <>
          <FilmCard film={flow.currentFilm} />
          <DecisionButtons
            onAccept={flow.onAccept}
            onSkip={flow.onSkip}
            disabled={flow.deciding}
          />
          {flow.resumed && (
            <button
              onClick={() => {
                void flow.onAbandon().then(() => {
                  navigate("/home/question", { replace: true });
                });
              }}
              disabled={flow.abandoning}
              className="text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            >
              Recommencer
            </button>
          )}
        </>
      )}

      {flow.phase === "accepted" && flow.acceptedFilm && (
        <AcceptedScreen
          film={flow.acceptedFilm}
          onBackHome={() => navigate("/home", { replace: true })}
        />
      )}

      {flow.phase === "dead-end" && flow.deadEndReason && (
        <DeadEndScreen
          reason={flow.deadEndReason}
          detail={flow.deadEndDetail}
          onReset={() => navigate("/home/question", { replace: true })}
        />
      )}

      <Toast
        key={flow.toastId}
        message={flow.toastMessage}
        onDismiss={flow.dismissToast}
      />
    </div>
  );
}
