import type { RecommendationStats } from '@/hooks/useRecommendationStats'
import { Skeleton } from '@/components/ui'

interface ProfileStatsProps {
  filmCount: number
  stats: RecommendationStats
  loading: boolean
}

interface StatCardProps {
  value: string
  label: string
  loading?: boolean
}

function StatCard({ value, label, loading }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-glass)] px-5 py-[18px]">
      {loading ? (
        <Skeleton className="h-[34px] w-12" />
      ) : (
        <p
          className="text-[34px] leading-none font-medium italic text-[var(--text-primary)] font-heading"
        >
          {value}
        </p>
      )}
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-tertiary)] mt-2">
        {label}
      </p>
    </div>
  )
}

export function ProfileStats({ filmCount, stats, loading }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-3.5">
      <StatCard value={String(filmCount)} label="Films watchlist" />
      <StatCard value={String(stats.totalCount)} label="Recommandations" loading={loading} />
      <StatCard value={String(stats.acceptedCount)} label="Films validés" loading={loading} />
      <StatCard
        value={stats.matchRate === null ? '—' : `${stats.matchRate}%`}
        label="Taux de match"
        loading={loading}
      />
    </div>
  )
}
