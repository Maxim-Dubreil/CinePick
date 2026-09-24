import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui";
import type { UseLastAcceptedFilmResult } from "@/hooks/useLastAcceptedFilm";
import { LastFilmDetails, POSTER_HEIGHT_CLASS } from "./LastFilmDetails";

type LastFilmPanelProps = Pick<UseLastAcceptedFilmResult, "film" | "loading">;

/** Mirrors `LastFilmDetails`' blocks (poster + button, title, scores,
 * critique) so the skeleton -> content swap barely moves. */
function LastFilmSkeleton() {
  return (
    <div className="flex items-start gap-5 min-h-0">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <Skeleton className={`${POSTER_HEIGHT_CLASS} w-[160px] rounded-[var(--radius-lg)]`} />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-12 w-40" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function LastFilmEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState
        icon={Clapperboard}
        title="Aucune séance pour l'instant"
        description="Ton premier film accepté atterrira ici"
      />
    </div>
  );
}

/** Home dashboard's "Dernier film" box: the most recently accepted film, or
 * an empty state before the first one. */
export function LastFilmPanel({ film, loading }: LastFilmPanelProps) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--accent-border)] bg-[var(--accent-subtle)] p-6 flex flex-col gap-4 min-h-48">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Dernier film
      </p>

      {loading ? <LastFilmSkeleton /> : film ? <LastFilmDetails film={film} /> : <LastFilmEmpty />}
    </div>
  );
}
