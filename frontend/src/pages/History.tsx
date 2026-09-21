import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHistory, HISTORY_PAGE_SIZE } from "@/hooks/useHistory";
import {
  HistoryCard,
  HistoryPagination,
  FilmDetailModal,
  DeleteHistoryModal,
} from "@/components/history";
import { Spinner } from "@/components/ui";
import type { HistoryEntry } from "@/hooks/useHistory";

export function History() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { entries, totalCount, loading, removeEntry } = useHistory(user?.id ?? null, page);

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

  return (
    <div className="max-w-3xl mx-auto px-10 py-11 pb-20 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-2xl font-medium italic text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Votre historique
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {totalCount} film{totalCount > 1 ? "s" : ""}
        </p>
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6 text-cp-accent" />
        </div>
      ) : totalCount === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Pas encore de films — lance ta première reco !
        </p>
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

          <HistoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <FilmDetailModal entry={selected} onOpenChange={(open) => !open && setSelected(null)} />
      <DeleteHistoryModal
        filmTitle={pendingDelete?.title ?? null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete.id)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
