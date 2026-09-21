import { useEffect } from "react";
import { cn } from "@/lib/utils";

export const TOAST_DURATION_MS = 4000;

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  className?: string;
  variant?: "default" | "error";
}

export function Toast({
  message,
  onDismiss,
  className,
  variant = "default",
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "fixed left-1/2 top-6 z-[60] w-[min( calc(100% - 2rem), 30rem)] -translate-x-1/2 rounded-[var(--radius-lg)] border px-5 py-3.5 text-center text-sm font-medium shadow-[var(--shadow-glass)]",
        variant === "error"
          ? "border-red-400/60 bg-red-950/95 text-red-50"
          : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]",
        className,
      )}
    >
      {message}
    </div>
  );
}
