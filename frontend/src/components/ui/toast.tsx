import { useEffect } from "react";
import { cn } from "@/lib/utils";

export const TOAST_DURATION_MS = 4000;

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  className?: string;
}

export function Toast({ message, onDismiss, className }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-glass)]",
        className,
      )}
    >
      {message}
    </div>
  );
}
