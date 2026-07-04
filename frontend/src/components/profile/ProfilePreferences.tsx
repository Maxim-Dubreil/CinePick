import { Badge } from '@/components/ui'

export function ProfilePreferences() {
  // TODO: brancher préférences soirée depuis l'API
  // Données attendues : { include_long: boolean, prefer_unseen: boolean, subtitles_vost: boolean, preferred_duration: '<90' | '90-120' | 'any' }
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
          Préférences soirée
        </h2>
        <Badge variant="accent">Bientôt</Badge>
      </div>

      <div className="opacity-50 pointer-events-none flex flex-col gap-0">
        {[
          'Inclure les films > 2h30',
          'Privilégier les films non vus',
          'Sous-titres VOST par défaut',
        ].map((label, i) => (
          <div
            key={label}
            className="flex items-center justify-between py-3 border-t border-[var(--border-subtle)] first:border-t-0 first:pt-0"
          >
            <span className="text-sm text-[var(--text-secondary)]">{label}</span>
            <ToggleVisual on={i !== 0} />
          </div>
        ))}
      </div>

      <div className="h-px bg-[var(--border-default)]" />

      <div className="opacity-50 pointer-events-none flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--text-disabled)]">
          Durée idéale
        </p>
        <div className="flex flex-wrap gap-2">
          {['< 1h30', '1h30 – 2h', 'Peu importe'].map((label, i) => (
            <span
              key={label}
              className={`h-7 px-3 rounded-full text-xs font-medium flex items-center border ${
                i === 1
                  ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--cp-accent)]'
                  : 'bg-[var(--glass-bg)] border-[var(--border-default)] text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToggleVisual({ on }: { on: boolean }) {
  return (
    <div
      className={`w-[38px] h-[22px] rounded-full relative border ${
        on
          ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)]'
          : 'bg-[rgba(255,255,255,0.06)] border-[var(--border-default)]'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 size-4 rounded-full transition-all ${
          on ? 'left-[19px] bg-[var(--cp-accent)]' : 'left-[3px] bg-[rgba(255,255,255,0.40)]'
        }`}
      />
    </div>
  )
}
