import { Badge } from '@/components/ui'

export function ProfileTaste(): JSX.Element {
  // TODO: brancher analyse genres/décennies depuis l'API
  // Données attendues : { genres: { name: string, pct: number }[], decades: string[] }
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
          Tes goûts cinéphiles
        </h2>
        <Badge variant="accent">Bientôt</Badge>
      </div>
      <div className="opacity-50 pointer-events-none flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--text-disabled)]">
          Genres dominants
        </p>
        {['Thriller', 'Drame', 'Science-fiction'].map((genre) => (
          <div key={genre} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium text-[var(--text-secondary)]">
              {genre}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]" />
            <span className="w-9 text-right text-xs text-[var(--text-disabled)]">—</span>
          </div>
        ))}
        <div className="h-px bg-[var(--border-default)] my-1" />
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--text-disabled)]">
          Décennies préférées
        </p>
        <div className="flex flex-wrap gap-2">
          {['1970s', '1990s', '2010s'].map((decade) => (
            <span
              key={decade}
              className="h-7 px-3 rounded-full text-xs font-medium bg-[var(--glass-bg)] border border-[var(--border-default)] text-[var(--text-disabled)] flex items-center"
            >
              {decade}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-[var(--text-tertiary)] text-center py-2">
        Disponible après vos premières recommandations
      </p>
    </div>
  )
}
