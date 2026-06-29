import { useNavigate } from 'react-router-dom'
import { Sparkles, Pencil, Calendar } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from '@/components/ui'

interface ProfileHeroProps {
  user: User
  letterboxdUsername: string | null
}

function formatMemberSince(isoDate: string): string {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
  return `Membre depuis ${formatted}`
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

export function ProfileHero({ user, letterboxdUsername }: ProfileHeroProps) {
  const navigate = useNavigate()
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Utilisateur'
  const initials = getInitials(fullName)

  return (
    <section className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] p-7 flex items-center gap-7">
      <Avatar className="size-24 shrink-0">
        <AvatarImage
          src={(user.user_metadata?.picture as string | undefined) ?? ''}
          alt={fullName}
        />
        <AvatarFallback className="text-3xl font-medium bg-gradient-to-br from-violet-400 to-purple-700 text-white rounded-full size-full flex items-center justify-center">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h1
          className="font-medium italic text-[clamp(28px,4vw,40px)] leading-tight text-[var(--text-primary)] tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {fullName}
        </h1>

        {letterboxdUsername && (
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            @{letterboxdUsername}
          </p>
        )}

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {letterboxdUsername && (
            <Badge variant="letterboxd">
              <LetterboxdDots />
              Letterboxd connecté
            </Badge>
          )}
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Calendar size={14} className="text-[var(--text-tertiary)] shrink-0" />
            {formatMemberSince(user.created_at)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 shrink-0">
        <Button variant="glass-accent" onClick={() => void navigate('/home')}>
          <Sparkles size={15} />
          Nouvelle reco
        </Button>
        {/* TODO: implémenter l'édition du profil */}
        <Button variant="glass" disabled>
          <Pencil size={15} />
          Modifier le profil
        </Button>
      </div>
    </section>
  )
}

function LetterboxdDots() {
  return (
    <svg width="13" height="13" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="14" cy="30" r="9" fill="#00E054" />
      <circle cx="30" cy="30" r="9" fill="#40BCF4" />
      <circle cx="46" cy="30" r="9" fill="#FF8000" />
    </svg>
  )
}
