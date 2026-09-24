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
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

/** Confirmation before a permanent history deletion — one film or the whole
 * history, worded by the caller. */
export function DeleteHistoryModal({
  open,
  title,
  description,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm gap-5 p-6 rounded-[var(--radius-xl)] ring-1 ring-foreground/10 shadow-[var(--shadow-glass)]"
        overlayClassName="bg-black/20 backdrop-blur-[2px]"
        disableAnimation
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
