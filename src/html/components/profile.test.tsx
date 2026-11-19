import { describe, it, expect, vi } from 'vitest'

vi.mock('../bundle', () => ({ bundle: vi.fn().mockResolvedValue('/bundle.js') }))
vi.mock('../../shared/player-avatar-url', () => ({ playerAvatarUrl: () => '/avatar.png' }))

import { Profile } from './profile'
import type { SteamId64 } from '../../shared/types/steam-id-64'

describe('Profile', () => {
  it('marks the avatar as decorative since the name is shown next to it', async () => {
    const html = await Profile({
      steamId: '76561198000000000' as SteamId64,
      name: 'Dogwood',
      avatar: { medium: '' },
    })

    expect(html).not.toContain('{name}')
    expect(html).toMatch(/<img[^>]*\balt=""/)
  })
})
