import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordVoiceStatus } from './discord-voice-status'
import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import type { GameNumber } from '../../../database/models/game.model'
import { SlotStatus, PlayerConnectionStatus } from '../../../database/models/game-slot.model'
import type { GameSlotId } from '../../../shared/types/game-slot-id'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { VoiceServerType } from '../../../shared/types/voice-server-type'

vi.mock('../../../configuration', () => ({
  configuration: { get: vi.fn() },
}))

vi.mock('../../../database/collections', () => ({
  collections: {
    players: { findOne: vi.fn() },
  },
}))

const actor = '76561198000000001' as SteamId64

const baseGame = {
  number: 42 as GameNumber,
  slots: [
    {
      id: 'red-soldier-0' as GameSlotId,
      player: actor,
      team: Tf2Team.red,
      gameClass: Tf2ClassName.soldier,
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.connected,
    },
  ],
}

describe('DiscordVoiceStatus', () => {
  beforeEach(() => {
    vi.mocked(configuration.get).mockResolvedValue(VoiceServerType.discord)
  })

  it('renders nothing when discord voice is disabled', async () => {
    vi.mocked(configuration.get).mockResolvedValue(VoiceServerType.none)
    const html = await DiscordVoiceStatus({ game: baseGame, actor })
    expect(html).toBe('')
  })

  it('renders linking instructions when actor has no linked discord profile', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({ discordProfile: undefined })
    const html = await DiscordVoiceStatus({ game: baseGame, actor })
    expect(html).toContain('Link your Discord account')
    expect(html).toContain('href="/settings"')
  })

  it('renders mismatch instructions when the linked discord account is unresolved', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({
      discordProfile: { userId: '123' },
    })
    const html = await DiscordVoiceStatus({ game: baseGame, actor })
    expect(html).toContain('could not be matched')
  })

  it('renders fallback instructions when a deep link exists', async () => {
    const html = await DiscordVoiceStatus({
      game: {
        ...baseGame,
        slots: [{ ...baseGame.slots[0], voiceServerUrl: 'https://discord.com/channels/1/2' }],
      },
      actor,
    })
    expect(html).toContain('join your team voice channel manually')
  })
})
