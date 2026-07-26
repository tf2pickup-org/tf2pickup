import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPlayerOgImage } from './build-player-og-image'
import { PlayerRole } from '../database/models/player.model'

// environment validates required vars at import; mock it so the test needs no .env (e.g. in CI)
vi.mock('../environment', () => ({
  environment: {
    WEBSITE_URL: 'https://tf2pickup.test',
    THUMBNAIL_SERVICE_URL: 'https://thumbnails.test',
    WEBSITE_BRANDING: undefined,
  },
}))

function isPng(buffer: Buffer) {
  return buffer.subarray(1, 4).toString() === 'PNG'
}

const avatar = {
  small: 'https://example.com/s.jpg',
  medium: 'https://example.com/m.jpg',
  large: 'https://example.com/l.jpg',
}

describe('buildPlayerOgImage', () => {
  beforeEach(() => {
    // avoid hitting the network (background / avatar) in tests
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no network'))
  })

  it('renders a png for a player', async () => {
    const image = await buildPlayerOgImage({
      name: 'm0re',
      joinedAt: new Date('2021-03-01'),
      avatar,
      roles: [],
      stats: { totalGames: 142, gamesByClass: {} },
    })
    expect(Buffer.isBuffer(image)).toBe(true)
    expect(isPng(image)).toBe(true)
  })

  it('renders a png for an admin player', async () => {
    const image = await buildPlayerOgImage({
      name: 'admin guy',
      joinedAt: new Date('2019-01-01'),
      avatar,
      roles: [PlayerRole.admin],
      stats: { totalGames: 0, gamesByClass: {} },
    })
    expect(isPng(image)).toBe(true)
  })
})
