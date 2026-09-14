import { Spinner } from "@/components/ui/spinner";

interface SyncOverlayProps {
  visible: boolean;
}

export function SyncOverlay({ visible }: SyncOverlayProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-8 text-white" />
        <p className="text-sm font-medium text-white">Synchronisation en cours…</p>
      </div>
    </div>
  );
}
