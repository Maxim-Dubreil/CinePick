import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { FilmCard } from "@/components/result/FilmCard";
import { formatDaysAgo } from "@/lib/dates";
import type { HistoryEntry } from "@/hooks/useHistory";

interface FilmDetailModalProps {
  entry: HistoryEntry | null;
  onOpenChange: (open: boolean) => void;
}

/** Full film overview opened from a history card — the Result screen's
 * `FilmCard`, plus the decision badge and when it was made. */
export function FilmDetailModal({ entry, onOpenChange }: FilmDetailModalProps) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      {/* The dialog box itself is invisible: FilmCard already draws the same
          rounded popover box. max-h + overflow-y-auto keeps it reachable on
          short viewports. No backdrop-blur on the overlay: a full-viewport
          backdrop-filter made the open visibly stutter. */}
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-transparent p-0 ring-0 sm:max-w-5xl"
        overlayClassName="bg-black/40"
        disableAnimation
      >
        {entry && (
          <>
            {/* FilmCard renders the visible title; Radix still needs these
                for the dialog's accessible name/description. */}
            <DialogTitle className="sr-only">{entry.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Détails du film {entry.title}
            </DialogDescription>
            <FilmCard
              // Top padding leaves room for the dialog's close button, which
              // would otherwise sit on the title / match badge.
              className="pt-12 sm:pt-12"
              film={{
                tmdb_id: entry.tmdbId,
                title: entry.title,
                poster_url: entry.posterUrl,
                year: entry.year,
                runtime: entry.runtime,
                overview: entry.overview,
                genres: entry.genreIds,
                director: entry.director,
                actors: entry.actors,
                match_score: entry.matchScore,
                critique: entry.aiSummary,
              }}
              status={
                <div className="flex items-center gap-2">
                  {entry.decision === "accepted" ? (
                    <Badge className="border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]">
                      Validé
                    </Badge>
                  ) : (
                    <Badge className="border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]">
                      Passé
                    </Badge>
                  )}
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDaysAgo(entry.decidedAt)}
                  </span>
                </div>
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
