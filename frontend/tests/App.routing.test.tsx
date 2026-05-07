import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

interface AppLoaderProps {
  visible: boolean
  onFadeComplete: () => void
}

// Mock the ThemeToggle to avoid complications
vi.mock('@/components/layout', () => ({
  ThemeToggle: () => <div>Theme Toggle</div>,
  AppLoader: ({ visible, onFadeComplete }: AppLoaderProps) => {
    if (!visible) onFadeComplete()
    return null
  },
}))

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ loading: false }),
}))

describe('App Routing', () => {
  const renderWithRouter = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    )
  }

  it('should display Landing page at /', () => {
    renderWithRouter('/')
    // Check for Landing page specific content - the main heading
    const heading = screen.getByRole('heading', { name: /Ce soir, tu trouves/i })
    expect(heading).toBeInTheDocument()
  })

  it('should display NotFound page at /invalid', () => {
    const { container } = renderWithRouter('/invalid')
    expect(screen.getByText('Not Found')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-clapperboard')).toBeInTheDocument()
    expect(screen.getByText('Désolé, cette page n\'existe pas')).toBeInTheDocument()
  })

  it('should display NotFound page for any undefined route', () => {
    renderWithRouter('/some-random-path')
    expect(screen.getByText('Not Found')).toBeInTheDocument()
  })

  it('should have Retourner à l\'accueil button on NotFound page', () => {
    renderWithRouter('/invalid')
    const button = screen.getByRole('button', { name: /Retourner à l'accueil/i })
    expect(button).toBeInTheDocument()
  })

  it('should display Profile page at /home/profile', () => {
    renderWithRouter('/home/profile')
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText(/Page profil/i)).toBeInTheDocument()
  })
})
