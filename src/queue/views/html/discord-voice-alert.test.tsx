import { describe, expect, it, vi } from 'vitest'
import { DiscordVoiceAlert } from './discord-voice-alert'
import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
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

describe('DiscordVoiceAlert', () => {
  it('renders nothing when discord voice is disabled', async () => {
    vi.mocked(configuration.get).mockResolvedValue(VoiceServerType.none)
    const html = await DiscordVoiceAlert({ actor })
    expect(html).toContain('id="discord-voice-alert"')
    expect(html).not.toContain('Link your Discord account')
  })

  it('renders a warning when discord voice is enabled and actor is not linked', async () => {
    vi.mocked(configuration.get).mockResolvedValue(VoiceServerType.discord)
    vi.mocked(collections.players.findOne).mockResolvedValue({ discordProfile: undefined })
    const html = await DiscordVoiceAlert({ actor })
    expect(html).toContain('Link your Discord account')
    expect(html).toContain('href="/settings"')
  })

  it('renders nothing when the actor has linked discord', async () => {
    vi.mocked(configuration.get).mockResolvedValue(VoiceServerType.discord)
    vi.mocked(collections.players.findOne).mockResolvedValue({
      discordProfile: { userId: '123' },
    })
    const html = await DiscordVoiceAlert({ actor })
    expect(html).not.toContain('Link your Discord account')
  })
})
