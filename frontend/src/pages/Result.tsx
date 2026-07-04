import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";

interface ResultLocationState {
  filmCount: number;
}

function isResultLocationState(state: unknown): state is ResultLocationState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as ResultLocationState).filmCount === "number"
  );
}

const CANDIDATE_LABELS = ["1er choix IA", "2ème candidat", "3ème candidat"];
const CANDIDATE_GRADIENTS = [
  "linear-gradient(160deg, rgba(196,181,253,0.22), rgba(91,33,182,0.35))",
  "linear-gradient(160deg, rgba(124,58,237,0.18), rgba(10,26,46,0.5))",
  "linear-gradient(160deg, rgba(76,29,149,0.2), rgba(5,5,14,0.6))",
];

export function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  if (!isResultLocationState(location.state)) {
    return <Navigate to="/home/question" replace />;
  }

  const { filmCount } = location.state;
  const hasResults = filmCount > 0;
  const candidateCount = Math.min(3, filmCount);

  const heading = !hasResults
    ? "Aucun film ne correspond à tes critères ce soir."
    : candidateCount === 1
      ? "Un film pour ce soir."
      : candidateCount === 2
        ? "Deux films pour ce soir."
        : "Trois films pour ce soir.";

  const countLabel = hasResults
    ? filmCount === 1
      ? "9/9 — 1 film correspond"
      : `9/9 — ${filmCount} films correspondent`
    : "9/9";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <p
        className={
          hasResults
            ? "text-[11px] tracking-[0.10em] text-text-tertiary uppercase"
            : "text-[11px] tracking-[0.10em] text-[rgba(224,112,112,0.6)] uppercase"
        }
      >
        {countLabel}
      </p>
      <h2 className="max-w-[520px] font-heading text-4xl italic">{heading}</h2>

      {hasResults ? (
        <>
          <p className="max-w-[440px] text-sm text-text-secondary">
            L'IA a choisi ces candidats dans ta watchlist filtrée. L'écran
            Résultat (carte + swipe) est la prochaine étape à prototyper.
          </p>
          <div className="mt-2 flex gap-5">
            {Array.from({ length: candidateCount }).map((_, index) => (
              <div key={index} className="flex w-40 flex-col gap-2.5">
                <div
                  className="aspect-[2/3] rounded-[var(--radius-lg)] border border-[var(--glass-border)] shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                  style={{ background: CANDIDATE_GRADIENTS[index] }}
                />
                <p className="text-center text-[11px] text-text-tertiary">
                  {candidateCount === 1 ? "1er choix IA" : CANDIDATE_LABELS[index]}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="max-w-[420px] text-sm text-text-secondary">
          Essaie d'élargir un peu tes réponses — genre, durée ou époque — pour
          retrouver des films dans ta watchlist.
        </p>
      )}

      <Button
        variant="glass"
        className="mt-3 h-11 rounded-[var(--radius-xl)] px-6"
        onClick={() => navigate("/home/question", { replace: true })}
      >
        Recommencer
      </Button>
    </div>
  );
}
