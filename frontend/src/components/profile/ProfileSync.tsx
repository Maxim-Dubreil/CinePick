import type { ReactNode } from 'react'
import { RefreshCw, Link } from 'lucide-react'
import { Button, Skeleton } from '@/components/ui'
import type { UserProfile } from '@/hooks/useProfile'
import { formatRelativeTime, getSyncAge, syncAgeColor } from '@/lib/syncAge'

interface ProfileSyncProps {
  profile: UserProfile | null
  loading: boolean
  isSyncing: boolean
  onResync: () => void
  onOpenModal: () => void
}

export function ProfileSync({ profile, loading, isSyncing, onResync, onOpenModal }: ProfileSyncProps) {
  const hasLetterboxd = Boolean(profile?.letterboxd_username)
  const age = getSyncAge(profile?.last_sync ?? null)

  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] shadow-[var(--shadow-glass-accent)] p-6 flex flex-col gap-4">
      <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
        Synchronisation
      </h2>

      {loading ? (
        <div className="flex flex-col gap-0">
          <Skeleton className="h-9 w-full mb-2.5" />
          <Skeleton className="h-9 w-full mb-2.5" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : !hasLetterboxd ? (
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
          <Button variant="ghost" size="sm" className="w-full" onClick={onOpenModal}>
            Changer de compte
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
