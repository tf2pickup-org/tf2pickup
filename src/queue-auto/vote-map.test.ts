import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: {
      findOne: vi.fn(),
    },
    queueMapOptions: {
      countDocuments: vi.fn(),
    },
    queueMapVotes: {
      deleteOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    },
  },
}))

vi.mock('../errors', () => ({
  errors: {
    badRequest: (message: string) => new Error(message),
    notFound: (message: string) => new Error(message),
  },
}))

vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../logger', () => ({ logger: { trace: vi.fn() } }))
vi.mock('../utils/with-log-level', () => ({ withLogLevel: (error: Error) => error }))

import { collections } from '../database/collections'
import { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { voteMap } from './vote-map'

const actor = '76561198000000001' as SteamId64

describe('voteMap()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires the player to be in the requested gamemode queue', async () => {
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)

    await expect(voteMap(Gamemode.highlander, actor, 'cp_reckoner_rc6')).rejects.toThrow(
      'player not in this queue',
    )
    expect(collections.queueSlots.findOne).toHaveBeenCalledWith({
      gamemode: Gamemode.highlander,
      'player.steamId': actor,
    })
    expect(collections.queueMapOptions.countDocuments).not.toHaveBeenCalled()
  })
})
