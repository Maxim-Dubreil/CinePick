import { ImageOff } from "lucide-react";

export function LastFilmPanel() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 flex flex-col gap-4 h-full min-h-48">
      <p className="text-[10px] font-semibold tracking-widest text-[var(--cp-accent)] uppercase">
        Dernier film
      </p>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-[var(--text-tertiary)]">
          <ImageOff size={24} strokeWidth={1.5} />
          <span className="text-xs">Aucun film regardé</span>
        </div>
      </div>
    </div>
  );
}
