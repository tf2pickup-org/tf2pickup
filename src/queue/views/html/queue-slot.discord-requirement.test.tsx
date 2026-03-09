import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueSlot } from './queue-slot'
import { collections } from '../../../database/collections'
import { configuration } from '../../../configuration'
import { meetsSkillThreshold } from '../../meets-skill-threshold'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { VoiceServerType } from '../../../shared/types/voice-server-type'
import type { QueueSlotId } from '../../types/queue-slot-id'

vi.mock('../../../database/collections', () => ({
  collections: {
    players: { findOne: vi.fn() },
    queueSlots: { findOne: vi.fn() },
    queueFriends: { findOne: vi.fn() },
  },
}))

vi.mock('../../../configuration', () => ({
  configuration: { get: vi.fn() },
}))

vi.mock('../../meets-skill-threshold', () => ({
  meetsSkillThreshold: vi.fn(),
}))

const actor = '76561198000000001' as SteamId64

const emptySlot = {
  id: 'soldier-0' as QueueSlotId,
  gameClass: Tf2ClassName.soldier,
  player: null,
  ready: false,
}

describe('QueueSlot discord requirement', () => {
  beforeEach(() => {
    vi.mocked(meetsSkillThreshold).mockResolvedValue(true)
    vi.mocked(configuration.get).mockImplementation(async key => {
      if (key === 'games.voice_server_type') {
        return VoiceServerType.discord
      }

      if (key === 'queue.require_player_verification') {
        return false
      }

      throw new Error(`unexpected config key ${String(key)}`)
    })
  })

  it('locks join when discord voice is enabled and actor is not linked', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({
      bans: [],
      activeGame: undefined,
      skill: undefined,
      verified: true,
      discordProfile: undefined,
    })

    const html = await QueueSlot({ slot: emptySlot, actor })
    expect(html).toContain('disabled')
    expect(html).toContain('Link your Discord account in settings to join the queue')
  })

  it('keeps join enabled when discord voice is enabled and actor is linked', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({
      bans: [],
      activeGame: undefined,
      skill: undefined,
      verified: true,
      discordProfile: { userId: '123' },
    })

    const html = await QueueSlot({ slot: emptySlot, actor })
    expect(html).toContain('join-queue-button')
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('Link your Discord account in settings to join the queue')
  })
})
