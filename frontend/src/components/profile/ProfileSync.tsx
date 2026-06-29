import type { ReactNode } from 'react'
import { RefreshCw, Link } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import type { UserProfile } from '@/lib/backend/api'

interface ProfileSyncProps {
  profile: UserProfile | null
  isSyncing: boolean
  onResync: () => void
  onOpenModal: () => void
}

type SyncAge = 'fresh' | 'stale' | 'old' | 'critical'

function getSyncAge(lastSync: string | null): SyncAge {
  if (!lastSync) return 'critical'
  const diffHours = (Date.now() - new Date(lastSync).getTime()) / 3_600_000
  if (diffHours < 48) return 'fresh'
  if (diffHours < 168) return 'stale'
  if (diffHours < 720) return 'old'
  return 'critical'
}

function formatRelativeTime(lastSync: string | null): string {
  if (!lastSync) return 'Jamais synchronisé'
  const diffMs = Date.now() - new Date(lastSync).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  const months = Math.floor(days / 30)
  return `il y a ${months} mois`
}

const syncAgeColor: Record<SyncAge, string> = {
  fresh: 'text-[var(--success)]',
  stale: 'text-[var(--warning)]',
  old: 'text-orange-500',
  critical: 'text-[var(--danger)]',
}

export function ProfileSync({ profile, isSyncing, onResync, onOpenModal }: ProfileSyncProps) {
  const hasLetterboxd = Boolean(profile?.letterboxd_username)
  const age = getSyncAge(profile?.last_sync ?? null)

  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] backdrop-blur-xl shadow-[var(--shadow-glass-accent)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
          Synchronisation
        </h2>
        {hasLetterboxd && (
          <Badge variant="warning">{formatRelativeTime(profile?.last_sync ?? null)}</Badge>
        )}
      </div>

      {!hasLetterboxd ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun compte Letterboxd configuré.
          </p>
          <Button variant="glass-accent" className="w-full" onClick={onOpenModal}>
            <Link size={15} />
            Configurer
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-0">
            <SyncRow label="Compte lié" value={`@${profile!.letterboxd_username}`} />
            <SyncRow label="Dernière sync">
              <span className={`text-sm font-medium ${syncAgeColor[age]}`}>
                {formatRelativeTime(profile?.last_sync ?? null)}
              </span>
            </SyncRow>
            <SyncRow label="Films importés" value={String(profile!.film_count)} />
          </div>
          <Button
            variant="glass-accent"
            className="w-full"
            onClick={onResync}
            disabled={isSyncing}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            Resynchroniser maintenant
          </Button>
        </>
      )}
    </div>
  )
}

interface SyncRowProps {
  label: string
  value?: string
  children?: ReactNode
}

function SyncRow({ label, value, children }: SyncRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border-subtle)] first:border-t-0 first:pt-0">
      <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
      {children ?? (
        <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
      )}
    </div>
  )
}
