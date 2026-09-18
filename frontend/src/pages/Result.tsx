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

export function Result() {
  const location = useLocation();

  if (!isResultLocationState(location.state)) {
    return <Navigate to="/home/question" replace />;
  }

  return <ResultFlowScreen answers={location.state.answers} />;
}

interface ResultFlowScreenProps {
  answers: RecommendRequest;
}

function ResultFlowScreen({ answers }: ResultFlowScreenProps) {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const flow = useResultFlow(answers, session?.access_token ?? null, !authLoading);

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6">
      {flow.phase === "loading" && <LoadingSteps />}

      {flow.phase === "card" && flow.currentFilm && (
        <>
          <FilmCard film={flow.currentFilm} />
          <DecisionButtons onAccept={flow.onAccept} onSkip={flow.onSkip} />
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
          onReset={() => navigate("/home/question", { replace: true })}
        />
      )}

      <Toast message={flow.toastMessage} onDismiss={flow.dismissToast} />
    </div>
  );
}
