import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Light theme background */}
      <div className="absolute inset-0 -z-10 dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
      </div>

      {/* Dark theme background */}
      <div className="absolute inset-0 -z-10 hidden dark:block">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      </div>

      {/* Content */}
      <div className="text-center space-y-6 max-w-md">
        {/* Emoji */}
        <div className="text-6xl">🎬</div>

        {/* Title */}
        <h1 className="text-4xl font-bold italic dark:text-white">
          Not Found
        </h1>

        {/* Error message */}
        <p className="text-lg text-gray-600 dark:text-gray-300">
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
