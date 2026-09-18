import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui";

interface UnlinkLetterboxdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isUnlinking: boolean;
}

export function UnlinkLetterboxdModal({
  open,
  onOpenChange,
  onConfirm,
  isUnlinking,
}: UnlinkLetterboxdModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm gap-5 p-6 rounded-[var(--radius-xl)] ring-1 ring-[var(--glass-border)] shadow-[var(--shadow-glass-primary)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Délier ton compte Letterboxd ?
          </DialogTitle>
          <DialogDescription>
            Ta watchlist reste sauvegardée mais ne sera plus synchronisée. Tu pourras relier un
            compte Letterboxd plus tard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isUnlinking}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isUnlinking}
          >
            {isUnlinking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Déliage…
              </>
            ) : (
              "Délier"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
