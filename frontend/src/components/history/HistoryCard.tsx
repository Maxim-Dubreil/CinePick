import { Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { FilmPoster } from "@/components/FilmPoster";
import { formatDaysAgo } from "@/lib/dates";
import type { HistoryEntry } from "@/hooks/useHistory";

interface HistoryCardProps {
  entry: HistoryEntry;
  onOpen: () => void;
  onDelete: () => void;
}

/** One row of the history list: poster, title/status, genre/duration/date,
 * a truncated AI summary, and a delete action. Clicking anywhere but the
 * delete button opens the film's detail overview. */
export function HistoryCard({ entry, onOpen, onDelete }: HistoryCardProps) {
  const metaLine = [
    ...entry.genres,
    entry.runtime !== null ? `${entry.runtime} min` : null,
    formatDaysAgo(entry.decidedAt),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      size="sm"
      className="flex-row items-center gap-4 hover:bg-[var(--hover-glass-bg)] transition-colors"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 min-w-0 items-center gap-4 text-left cursor-pointer"
      >
        <FilmPoster posterUrl={entry.posterUrl} alt={entry.title} className="w-16 shrink-0" />

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-medium text-[var(--text-primary)] truncate">
              {entry.year !== null ? `${entry.title} (${entry.year})` : entry.title}
            </span>
            {entry.decision === "accepted" ? (
              <Badge className="border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]">
                Validé
              </Badge>
            ) : (
              <Badge className="border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]">
                Passé
              </Badge>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] truncate">{metaLine}</p>

          {entry.aiSummary && (
            <p className="text-sm italic truncate text-[var(--text-secondary)]">
              {entry.aiSummary}
            </p>
          )}
        </div>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Supprimer de l'historique"
        onClick={onDelete}
        className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--danger)]"
      >
        <Trash2 size={16} />
      </Button>
    </Card>
  );
}
