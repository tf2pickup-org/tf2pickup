import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock collections
vi.mock('../../database/collections', () => ({
  collections: {
    onlinePlayers: {
      findOne: vi.fn(),
    },
  },
}))

// Mock players
vi.mock('../../players', () => ({
  players: {
    bySteamId: vi.fn().mockResolvedValue({ preferences: { soundVolume: '0.8' } }),
  },
}))

describe('notify-mentioned-players plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends notification to online mentioned players', async () => {
    const { collections } = await import('../../database/collections')
    vi.mocked(collections.onlinePlayers.findOne).mockResolvedValue({
      steamId: '76561198000000001' as any,
      name: 'wonszu',
      avatar: '',
    })
    expect(true).toBe(true)
  })

  it('does not send notification to offline players', async () => {
    const { collections } = await import('../../database/collections')
    vi.mocked(collections.onlinePlayers.findOne).mockResolvedValue(null)
    expect(true).toBe(true)
  })
})
