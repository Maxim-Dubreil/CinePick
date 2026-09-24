import type { RecommendationStats } from '@/hooks/useRecommendationStats'
import { Skeleton } from '@/components/ui'

interface ProfileTasteProps {
  stats: RecommendationStats
  loading: boolean
}

export function ProfileTaste({ stats, loading }: ProfileTasteProps) {
  const hasData = stats.acceptedCount > 0
  const hasExtras = stats.topDirector !== null || stats.averageRuntime !== null

  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-glass)] p-6 flex flex-col gap-4">
      <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
        Tes goûts cinéphiles
      </h2>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : !hasData ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-2">
          Disponible après vos premières recommandations
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--text-tertiary)]">
            Genres dominants
          </p>
          {stats.topGenres.map((genre) => (
            <div key={genre.name} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-medium text-[var(--text-secondary)]">
                {genre.name}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--cp-accent)]"
                  style={{ width: `${genre.pct}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs text-[var(--text-secondary)]">
                {genre.pct}%
              </span>
            </div>
          ))}

          <div className="h-px bg-[var(--border-default)] my-1" />

          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--text-tertiary)]">
            Décennies préférées
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topDecades.map((decade) => (
              <span
                key={decade}
                className="h-7 px-3 rounded-full text-xs font-medium bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--cp-accent)] flex items-center"
              >
                {decade}
              </span>
            ))}
          </div>

          {hasExtras && (
            <>
              <div className="h-px bg-[var(--border-default)] my-1" />
              <div className="flex flex-col gap-2">
                {stats.topDirector !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Réalisateur le plus choisi
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {stats.topDirector}
                    </span>
                  </div>
                )}
                {stats.averageRuntime !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">Durée moyenne</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {stats.averageRuntime} min
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
