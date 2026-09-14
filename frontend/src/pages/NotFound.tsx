import { useNavigate } from 'react-router-dom'
import { Clapperboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppBackground } from '@/components/layout/AppBackground'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <AppBackground />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <Clapperboard size={64} style={{ color: 'var(--cp-accent)' }} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1
          className="text-4xl font-bold italic"
          style={{ color: 'var(--text-primary)' }}
        >
          Not Found
        </h1>

        {/* Error message */}
        <p
          className="text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Désolé, cette page n'existe pas
        </p>

        {/* Button */}
        <Button
          onClick={() => navigate('/')}
          className="mt-8"
        >
          Retourner à l'accueil
        </Button>
      </div>
    </div>
  )
}
