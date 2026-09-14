import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileStats } from '@/components/profile/ProfileStats'

describe('ProfileStats', () => {
  it('renders the film count', () => {
    render(<ProfileStats filmCount={248} />)
    expect(screen.getByText('248')).toBeInTheDocument()
  })

  it('renders "—" for pending stats', () => {
    render(<ProfileStats filmCount={0} />)
    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(3)
  })

  it('renders all 4 stat labels', () => {
    render(<ProfileStats filmCount={10} />)
    expect(screen.getByText('Films watchlist')).toBeInTheDocument()
    expect(screen.getByText('Recommandations')).toBeInTheDocument()
    expect(screen.getByText('Films validés')).toBeInTheDocument()
    expect(screen.getByText('Taux de match')).toBeInTheDocument()
  })
})
