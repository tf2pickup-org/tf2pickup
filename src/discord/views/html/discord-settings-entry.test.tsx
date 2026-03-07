import { describe, expect, it } from 'vitest'
import { DiscordSettingsEntry } from './discord-settings-entry'

describe('DiscordSettingsEntry', () => {
  it('renders a connect link when no discord profile is linked', () => {
    const html = DiscordSettingsEntry({ player: {} })
    expect(html).toContain('href="/discord/auth"')
    expect(html).toContain('Connect your Discord account')
  })

  it('renders a disconnect button when a discord profile is linked', () => {
    const html = DiscordSettingsEntry({
      player: {
        discordProfile: {
          userId: '123',
          username: 'player',
          displayName: 'Player One',
          avatarUrl: null,
        },
      },
    })
    expect(html).toContain('hx-put="/discord/disconnect"')
    expect(html).toContain('Linked as')
  })
})
