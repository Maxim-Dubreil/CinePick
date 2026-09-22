import { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useResultFlow } from "@/hooks/useResultFlow";
import {
  FilmCard,
  DecisionButtons,
  LoadingSteps,
  AcceptedScreen,
  DeadEndScreen,
} from "@/components/result";
import { Toast } from "@/components/ui";
import type { RecommendRequest } from "@/lib/backend/api";

interface ResultLocationState {
  filmCount: number;
  answers: RecommendRequest;
}

function isResultLocationState(state: unknown): state is ResultLocationState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as ResultLocationState).filmCount === "number" &&
    typeof (state as ResultLocationState).answers === "object" &&
    (state as ResultLocationState).answers !== null
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

  if (!isResultLocationState(location.state)) {
    return <Navigate to="/home/question" replace />;
  }

  return <ResultFlowScreen answers={location.state.answers} onAccepted={onAccepted} />;
}

interface ResultFlowScreenProps {
  answers: RecommendRequest;
  onAccepted: () => void;
}

function ResultFlowScreen({ answers, onAccepted }: ResultFlowScreenProps) {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const flow = useResultFlow(
    answers,
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
