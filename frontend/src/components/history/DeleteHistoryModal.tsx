import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui";

interface DeleteHistoryModalProps {
  filmTitle: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteHistoryModal({
  filmTitle,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteHistoryModalProps) {
  return (
    <Dialog open={filmTitle !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm gap-5 p-6 rounded-[var(--radius-xl)] ring-1 ring-foreground/10 shadow-[var(--shadow-glass)]"
        overlayClassName="bg-black/20 backdrop-blur-[2px]"
        disableAnimation
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Supprimer {filmTitle} de l&apos;historique ?
          </DialogTitle>
          <DialogDescription>
            Suppression définitive : le film pourra à nouveau t&apos;être proposé dans de
            futures recommandations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Suppression…
              </>
            ) : (
              "Supprimer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
