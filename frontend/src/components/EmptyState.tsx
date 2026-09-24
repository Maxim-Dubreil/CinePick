import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional call to action under the text (e.g. "Lancer un pick"). */
  action?: ReactNode;
}

/** Centered "nothing here yet" block: accent-glow icon, title, one-line hint,
 * optional action. Shared by Home's "Dernier film" panel and Historique. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative flex size-16 items-center justify-center rounded-full bg-[var(--cp-accent)]/10">
        <div className="absolute inset-0 rounded-full bg-[var(--cp-accent)]/20 blur-lg" />
        <Icon size={28} strokeWidth={1.5} className="relative text-[var(--cp-accent)]" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
