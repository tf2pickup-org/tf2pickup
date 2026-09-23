import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueMapVotes: {
      findOne: vi.fn(),
    },
  },
}))

import { collections } from '../database/collections'
import { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVote } from './get-map-vote'

const actor = '76561198000000001' as SteamId64

describe('getMapVote()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets the player vote only from the requested gamemode', async () => {
    vi.mocked(collections.queueMapVotes.findOne).mockResolvedValue({
      gamemode: Gamemode.sixes,
      player: actor,
      map: 'cp_process',
    })

    await expect(getMapVote(Gamemode.sixes, actor)).resolves.toBe('cp_process')
    expect(collections.queueMapVotes.findOne).toHaveBeenCalledWith({
      gamemode: Gamemode.sixes,
      player: actor,
    })
  })

  it('does not query votes for an anonymous viewer', async () => {
    await expect(getMapVote(Gamemode.sixes, undefined)).resolves.toBeUndefined()
    expect(collections.queueMapVotes.findOne).not.toHaveBeenCalled()
  })
})
