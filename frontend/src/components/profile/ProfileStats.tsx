import { Badge } from '@/components/ui'

interface ProfileStatsProps {
  filmCount: number
}

interface StatCardProps {
  value: string
  label: string
  pending?: boolean
}

function StatCard({ value, label, pending = false }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] px-5 py-[18px] relative overflow-hidden">
      {pending && (
        <span className="absolute top-3 right-3">
          <Badge variant="accent" className="text-[10px] px-2 py-0.5">Bientôt</Badge>
        </span>
      )}
      <p
        className="text-[34px] leading-none font-medium italic text-[var(--text-primary)] font-heading"
      >
        {value}
      </p>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-tertiary)] mt-2">
        {label}
      </p>
    </div>
  )
}

export function ProfileStats({ filmCount }: ProfileStatsProps) {
  // TODO: brancher stats recommandations depuis l'API (count, validated_count, match_rate)
  return (
    <div className="grid grid-cols-4 gap-3.5">
      <StatCard value={String(filmCount)} label="Films watchlist" />
      <StatCard value="—" label="Recommandations" pending />
      <StatCard value="—" label="Films validés" pending />
      <StatCard value="—" label="Taux de match" pending />
    </div>
  )
}
