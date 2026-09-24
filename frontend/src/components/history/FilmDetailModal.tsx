import { Images } from "lucide-react";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import { WatchProvidersBlock } from "@/components/WatchProvidersBlock";
import { formatDaysAgo } from "@/lib/dates";
import type { HistoryEntry } from "@/hooks/useHistory";

interface FilmDetailModalProps {
  entry: HistoryEntry | null;
  onOpenChange: (open: boolean) => void;
}

/** Full film overview opened from a history card. Alternate posters aren't
 * modeled anywhere yet — shown as a static "bientôt disponible" section
 * rather than left out, so the page's final shape is visible ahead of the
 * backend work. */
export function FilmDetailModal({ entry, onOpenChange }: FilmDetailModalProps) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] min-h-[32rem] overflow-y-auto p-5 sm:min-h-[36rem] sm:max-w-3xl sm:p-8"
        overlayClassName="bg-black/20 backdrop-blur-[2px]"
        disableAnimation
      >
        {entry && (
          <>
            <DialogHeader>
              <div className="flex gap-6">
                <FilmPoster
                  posterUrl={entry.posterUrl}
                  alt={entry.title}
                  className="w-36 shrink-0 sm:w-44"
                />
                <div className="flex min-w-0 flex-col justify-center gap-3">
                  <DialogTitle className="text-xl sm:text-2xl">
                    {entry.year !== null
                      ? `${entry.title} (${entry.year})`
                      : entry.title}
                  </DialogTitle>
                  <DialogDescription>
                    {[
                      ...entry.genres,
                      entry.runtime !== null ? `${entry.runtime} min` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </DialogDescription>
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
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-6 text-sm">
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
                  Synopsis
                </h3>
                <p className="text-[var(--text-secondary)]">
                  {entry.overview ?? "Synopsis — bientôt disponible"}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
                  Résumé IA
                </h3>
                <p className="italic text-[var(--text-secondary)]">
                  {entry.aiSummary ?? "Résumé IA — bientôt disponible"}
                </p>
              </section>

              <WatchProvidersBlock tmdbId={entry.tmdbId} />

              <section className="flex items-center gap-2 opacity-50">
                <Images size={16} />
                <span>Autres affiches — bientôt disponible</span>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
