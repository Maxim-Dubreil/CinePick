import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clapperboard, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHistory, HISTORY_PAGE_SIZE } from "@/hooks/useHistory";
import {
  HistoryCard,
  HistoryCardSkeleton,
  HistoryPagination,
  FilmDetailModal,
  DeleteHistoryModal,
} from "@/components/history";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui";
import type { HistoryEntry } from "@/hooks/useHistory";

export function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { entries, totalCount, loading, removeEntry, clearHistory } = useHistory(
    user?.id ?? null,
    page,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));

  // Deleting the last entry on a page leaves it empty — step back rather
  // than show it blank. `entries.length` here is the pre-deletion count.
  const handleDelete = async (id: string) => {
    const wasLastOnPage = entries.length === 1;
    setIsDeleting(true);
    await removeEntry(id);
    setIsDeleting(false);
    setPendingDelete(null);
    if (wasLastOnPage && page > 1) {
      setPage((current) => current - 1);
    }
  };

  // The page scrolls inside AppLayout's <main>, not the window, so
  // window.scrollTo would do nothing — bring the header back into view instead.
  const goToPage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    await clearHistory();
    setIsDeleting(false);
    setConfirmClearAll(false);
    setPage(1);
  };

  return (
    <div ref={topRef} className="max-w-3xl mx-auto px-10 py-11 pb-20 flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium italic text-[var(--text-primary)]">
            Votre historique
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {totalCount} film{totalCount > 1 ? "s" : ""}
          </p>
        </div>
        {/* Deliberately low-key: a destructive, rarely-used action shouldn't
            compete with the list. The modal is the real safeguard. */}
        {!loading && totalCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="flex items-center gap-1.5 rounded-sm text-xs text-[var(--text-tertiary)] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-accent)]"
          >
            Tout effacer
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: HISTORY_PAGE_SIZE }).map((_, i) => (
            <HistoryCardSkeleton key={i} />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="py-14">
          <EmptyState
            icon={Clapperboard}
            title="Pas encore de films"
            description="Lance ta première reco pour commencer ton historique"
            action={
              <Button
                variant="glass-primary"
                size="sm"
                className="mt-1 gap-2 rounded-[var(--radius-xl)]"
                onClick={() => navigate("/home/question")}
              >
                <Clapperboard size={14} />
                Lancer un pick
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onOpen={() => setSelected(entry)}
                onDelete={() => setPendingDelete(entry)}
              />
            ))}
          </div>

          <HistoryPagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}

      <FilmDetailModal entry={selected} onOpenChange={(open) => !open && setSelected(null)} />
      <DeleteHistoryModal
        open={pendingDelete !== null}
        title={`Supprimer ${pendingDelete?.title ?? ""} de l'historique ?`}
        description="Suppression définitive : le film pourra à nouveau t'être proposé dans de futures recommandations."
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete.id)}
        isDeleting={isDeleting}
      />
      <DeleteHistoryModal
        open={confirmClearAll}
        title="Effacer tout l'historique ?"
        description={`Suppression définitive de ${totalCount} film${totalCount > 1 ? "s" : ""} : ils pourront à nouveau t'être proposés dans de futures recommandations.`}
        onOpenChange={setConfirmClearAll}
        onConfirm={() => void handleClearAll()}
        isDeleting={isDeleting}
      />
    </div>
  );
}
