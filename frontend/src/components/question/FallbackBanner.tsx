interface FallbackBannerProps {
  note: string | null;
}

export function FallbackBanner({ note }: FallbackBannerProps) {
  if (!note) return null;
  return (
    <div className="max-w-[480px] rounded-xl border border-[var(--warning-border)] bg-[var(--warning-subtle)] px-[18px] py-2.5 text-center text-sm text-[var(--warning)]">
      {note}
    </div>
  );
}
