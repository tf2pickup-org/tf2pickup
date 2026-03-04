// src/routes/api/v1/dto/player-to-dto.test.ts
import { describe, expect, it } from 'vitest'
import { playerToDto } from './player-to-dto'
import type { PlayerModel } from '../../../../database/models/player.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import type { GameNumber } from '../../../../database/models/game.model'

const basePlayer: PlayerModel = {
  steamId: '76561198012345678' as SteamId64,
  name: 'TestPlayer',
  joinedAt: new Date('2024-01-01T00:00:00.000Z'),
  avatar: { small: 'small.jpg', medium: 'medium.jpg', large: 'large.jpg' },
  roles: [],
  hasAcceptedRules: true,
  cooldownLevel: 0,
  preferences: {},
  stats: { totalGames: 42, gamesByClass: { soldier: 30, scout: 12 } },
}

describe('playerToDto()', () => {
  it('maps basic fields', () => {
    const result = playerToDto(basePlayer)
    expect(result.steamId).toBe('76561198012345678')
    expect(result.name).toBe('TestPlayer')
    expect(result.joinedAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.avatar).toEqual(basePlayer.avatar)
    expect(result.roles).toEqual([])
    expect(result.stats).toEqual({ totalGames: 42, gamesByClass: { soldier: 30, scout: 12 } })
  })

  it('returns null for etf2lProfile when not set', () => {
    const result = playerToDto(basePlayer)
    expect(result.etf2lProfile).toBeNull()
  })

  it('includes etf2lProfile when set', () => {
    const player = { ...basePlayer, etf2lProfile: { id: 1, name: 'p', country: 'PL' } }
    expect(playerToDto(player).etf2lProfile).toEqual({ id: 1, name: 'p', country: 'PL' })
  })

  it('returns null for activeGame when not set', () => {
    expect(playerToDto(basePlayer).activeGame).toBeNull()
  })

  it('includes activeGame when set', () => {
    const player = { ...basePlayer, activeGame: 42 as GameNumber }
    expect(playerToDto(player).activeGame).toBe(42)
  })

  it('includes self and games links', () => {
    const result = playerToDto(basePlayer)
    expect(result._links.self.href).toBe('/api/v1/players/76561198012345678')
    expect(result._links.games.href).toBe('/api/v1/players/76561198012345678/games')
  })

  it('omits sensitive fields (bans, skill, preferences, etc.)', () => {
    const player = {
      ...basePlayer,
      bans: [
        {
          actor: '76561198000000001' as SteamId64,
          start: new Date(),
          end: new Date(),
          reason: 'x',
        },
      ],
      skill: { soldier: 4 },
    }
    const result = playerToDto(player) as Record<string, unknown>
    expect(result).not.toHaveProperty('bans')
    expect(result).not.toHaveProperty('skill')
    expect(result).not.toHaveProperty('preferences')
    expect(result).not.toHaveProperty('hasAcceptedRules')
    expect(result).not.toHaveProperty('cooldownLevel')
  })
})
