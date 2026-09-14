import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserProfile } from '@/hooks/useProfile'
import { ProfileSync } from '@/components/profile/ProfileSync'

const profileWithLB: UserProfile = {
  letterboxd_username: 'camdevaux',
  last_sync: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1h ago
  film_count: 248,
}

const profileWithoutLB: UserProfile = {
  letterboxd_username: null,
  last_sync: null,
  film_count: 0,
}

describe('ProfileSync', () => {
  it('shows unconfigured state when letterboxd_username is null', () => {
    render(
      <ProfileSync
        profile={profileWithoutLB}
        isSyncing={false}
        onResync={vi.fn()}
        onOpenModal={vi.fn()}
      />
    )
    expect(screen.getByText(/Aucun compte Letterboxd/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Configurer/i })).toBeInTheDocument()
  })

  it('shows unconfigured state when profile is null', () => {
    render(
      <ProfileSync
        profile={null}
        isSyncing={false}
        onResync={vi.fn()}
        onOpenModal={vi.fn()}
      />
    )
    expect(screen.getByText(/Aucun compte Letterboxd/i)).toBeInTheDocument()
  })

  it('shows sync info when letterboxd_username is set', () => {
    render(
      <ProfileSync
        profile={profileWithLB}
        isSyncing={false}
        onResync={vi.fn()}
        onOpenModal={vi.fn()}
      />
    )
    expect(screen.getByText('@camdevaux')).toBeInTheDocument()
    expect(screen.getByText('248')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Resynchroniser/i })).toBeInTheDocument()
  })

  it('calls onOpenModal when Configurer is clicked', async () => {
    const onOpenModal = vi.fn()
    render(
      <ProfileSync
        profile={profileWithoutLB}
        isSyncing={false}
        onResync={vi.fn()}
        onOpenModal={onOpenModal}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Configurer/i }))
    expect(onOpenModal).toHaveBeenCalledOnce()
  })

  it('calls onResync when Resynchroniser is clicked', async () => {
    const onResync = vi.fn()
    render(
      <ProfileSync
        profile={profileWithLB}
        isSyncing={false}
        onResync={onResync}
        onOpenModal={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Resynchroniser/i }))
    expect(onResync).toHaveBeenCalledOnce()
  })

  it('disables resync button while syncing', () => {
    render(
      <ProfileSync
        profile={profileWithLB}
        isSyncing={true}
        onResync={vi.fn()}
        onOpenModal={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /Resynchroniser/i })).toBeDisabled()
  })
})
