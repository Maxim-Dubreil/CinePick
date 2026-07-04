interface FilmCountChipProps {
  filmCount: number;
  isSoftQuestion: boolean;
}

export function FilmCountChip({ filmCount, isSoftQuestion }: FilmCountChipProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--accent-border)] bg-[var(--accent-subtle)] px-4 py-1.5 text-sm font-medium text-[var(--cp-accent)]">
        {filmCount} films disponibles
      </div>
      {isSoftQuestion && (
        <p className="text-[11px] text-text-tertiary">
          Ce choix n'affecte pas le nombre de films
        </p>
      )}
    </div>
  );
}
