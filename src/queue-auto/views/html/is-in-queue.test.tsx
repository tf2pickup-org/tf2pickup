import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn(),
    },
  },
}))

import { collections } from '../../../database/collections'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { IsInQueue } from './is-in-queue'

const actor = '76561198000000001' as SteamId64

describe('IsInQueue()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checks membership only in the requested gamemode', async () => {
    vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(1)

    await expect(IsInQueue({ gamemode: Gamemode.highlander, actor })).resolves.toContain(
      'value="true"',
    )
    expect(collections.queueSlots.countDocuments).toHaveBeenCalledWith({
      gamemode: Gamemode.highlander,
      'player.steamId': actor,
    })
  })

  it('does not query queue slots for an anonymous viewer', async () => {
    await expect(IsInQueue({ gamemode: Gamemode.highlander, actor: undefined })).resolves.toContain(
      'value="false"',
    )
    expect(collections.queueSlots.countDocuments).not.toHaveBeenCalled()
  })
})
