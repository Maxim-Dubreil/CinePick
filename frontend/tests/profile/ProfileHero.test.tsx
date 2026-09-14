import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { ProfileHero } from '@/components/profile/ProfileHero'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2025-03-15T10:00:00.000Z',
  user_metadata: {
    full_name: 'Camille Devaux',
    picture: 'https://example.com/avatar.jpg',
  },
} as unknown as User

function renderHero(letterboxdUsername: string | null) {
  return render(
    <MemoryRouter>
      <ProfileHero user={mockUser} letterboxdUsername={letterboxdUsername} />
    </MemoryRouter>
  )
}

describe('ProfileHero', () => {
  it('renders the user full name', () => {
    renderHero(null)
    expect(screen.getByText('Camille Devaux')).toBeInTheDocument()
  })

  it('renders the letterboxd handle when provided', () => {
    renderHero('camdevaux')
    expect(screen.getByText('@camdevaux')).toBeInTheDocument()
  })

  it('does not render a handle when letterboxdUsername is null', () => {
    renderHero(null)
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })

  it('renders "Membre depuis" with the correct year', () => {
    renderHero(null)
    expect(screen.getByText(/Membre depuis/)).toBeInTheDocument()
    expect(screen.getByText(/2025/)).toBeInTheDocument()
  })

  it('renders the Letterboxd badge when username is provided', () => {
    renderHero('camdevaux')
    expect(screen.getByText('Letterboxd connecté')).toBeInTheDocument()
  })

  it('does not render the Letterboxd badge when username is null', () => {
    renderHero(null)
    expect(screen.queryByText('Letterboxd connecté')).not.toBeInTheDocument()
  })
})
