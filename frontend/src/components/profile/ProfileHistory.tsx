import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@/components/ui'
import { FilmPoster } from '@/components/FilmPoster'
import type { HistoryEntry } from '@/hooks/useHistory'

export const RECENT_COUNT = 4

interface ProfileHistoryProps {
  entries: HistoryEntry[]
  loading: boolean
}

/** Takes `entries`/`loading` as props rather than calling `useHistory` itself — the page
 * aggregates every section's loading into one `pageLoading` so the whole profile reveals
 * in a single paint instead of section-by-section (see frontend/CLAUDE.md "Page-level
 * reveal"). */
export function ProfileHistory({ entries, loading }: ProfileHistoryProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-glass)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
          Recommandations récentes
        </h2>
        <Button variant="glass" size="sm" onClick={() => navigate('/history')}>
          Tout voir
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: RECENT_COUNT }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
          Vos recommandations apparaîtront ici
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {entries.map((entry) => (
            <div key={entry.id} title={entry.title} className="relative">
              <FilmPoster
                posterUrl={entry.posterUrl}
                alt={entry.title}
                className="w-full transition-transform hover:scale-[1.03]"
              />
              <span
                className={`absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm ${
                  entry.decision === 'accepted' ? 'bg-[var(--success)]/85' : 'bg-[var(--danger)]/85'
                }`}
              >
                {entry.decision === 'accepted' ? 'Validé' : 'Passé'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
