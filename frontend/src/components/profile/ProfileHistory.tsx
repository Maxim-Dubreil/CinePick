import { Button } from '@/components/ui'

export function ProfileHistory(): JSX.Element {
  // TODO: brancher historique recommandations depuis l'API
  // Données attendues : { id: string, title: string, genre: string, mood: string, duration_min: number, status: 'validated' | 'skipped' }[]
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium italic text-[22px] text-[var(--text-primary)]">
          Recommandations récentes
        </h2>
        <Button variant="glass" size="sm" disabled>
          Tout voir
        </Button>
      </div>
      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
        Vos recommandations apparaîtront ici
      </p>
    </div>
  )
}
