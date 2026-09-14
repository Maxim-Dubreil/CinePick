import { Loader2Icon } from "lucide-react";

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/55 backdrop-blur-xl">
      <Loader2Icon className="size-7 animate-spin text-[var(--cp-accent)]" />
      <div className="flex gap-1.5">
        <span className="size-1.5 animate-cp-dot rounded-full bg-[var(--cp-accent)] [animation-delay:0s]" />
        <span className="size-1.5 animate-cp-dot rounded-full bg-[var(--cp-accent)] [animation-delay:0.15s]" />
        <span className="size-1.5 animate-cp-dot rounded-full bg-[var(--cp-accent)] [animation-delay:0.3s]" />
      </div>
      <p className="text-[11px] tracking-[0.10em] text-text-tertiary uppercase">
        On cogite…
      </p>
    </div>
  );
}
