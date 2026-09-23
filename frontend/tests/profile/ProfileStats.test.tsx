import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileStats } from '@/components/profile/ProfileStats'
import type { RecommendationStats } from '@/hooks/useRecommendationStats'

const stats: RecommendationStats = {
  totalCount: 12,
  acceptedCount: 5,
  matchRate: 87,
  topGenres: [],
  topDecades: [],
  topDirector: null,
  averageRuntime: null,
}

describe('ProfileStats', () => {
  it('renders the film count', () => {
    render(<ProfileStats filmCount={248} stats={stats} loading={false} />)
    expect(screen.getByText('248')).toBeInTheDocument()
  })

  it('renders "—" for pending stats', () => {
    render(<ProfileStats filmCount={0} stats={stats} loading />)
    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(3)
  })

  it('renders all 4 stat labels', () => {
    render(<ProfileStats filmCount={10} stats={stats} loading={false} />)
    expect(screen.getByText('Films watchlist')).toBeInTheDocument()
    expect(screen.getByText('Recommandations')).toBeInTheDocument()
    expect(screen.getByText('Films validés')).toBeInTheDocument()
    expect(screen.getByText('Taux de match')).toBeInTheDocument()
  })
})
