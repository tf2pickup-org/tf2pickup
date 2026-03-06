import { describe, expect, it } from 'vitest'
import { gameToDto } from './game-to-dto'
import type { GameModel, GameNumber } from '../../../database/models/game.model'
import { GameState, GameServerProvider } from '../../../database/models/game.model'
import { GameEventType, GameEndedReason } from '../../../database/models/game-event.model'
import { Tf2Team } from '../../../shared/types/tf2-team'

const createdAt = new Date('2024-01-01T00:00:00.000Z')
const endedAt = new Date('2024-01-01T01:00:00.000Z')

const baseGame: GameModel = {
  number: 1234 as GameNumber,
  map: 'cp_process_final',
  state: GameState.ended,
  slots: [],
  events: [{ event: GameEventType.gameCreated, at: createdAt }],
}

describe('gameToDto()', () => {
  it('maps basic fields', () => {
    const result = gameToDto(baseGame)
    expect(result.id).toBe(1234)
    expect(result.map).toBe('cp_process_final')
    expect(result.state).toBe('ended')
  })

  it('extracts createdAt from first event', () => {
    expect(gameToDto(baseGame).createdAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('returns null for endedAt when game has not ended', () => {
    expect(gameToDto(baseGame).endedAt).toBeNull()
  })

  it('extracts endedAt from gameEnded event', () => {
    const game: GameModel = {
      ...baseGame,
      events: [
        { event: GameEventType.gameCreated, at: createdAt },
        { event: GameEventType.gameEnded, at: endedAt, reason: GameEndedReason.matchEnded },
      ],
    }
    expect(gameToDto(game).endedAt).toBe('2024-01-01T01:00:00.000Z')
  })

  it('returns null for score when not set', () => {
    expect(gameToDto(baseGame).score).toBeNull()
  })

  it('includes score when set', () => {
    const game = { ...baseGame, score: { [Tf2Team.red]: 3, [Tf2Team.blu]: 2 } }
    expect(gameToDto(game).score).toEqual({ red: 3, blu: 2 })
  })

  it('returns null for gameServer when not set', () => {
    expect(gameToDto(baseGame).gameServer).toBeNull()
  })

  it('exposes only name and provider from gameServer', () => {
    const game = {
      ...baseGame,
      gameServer: {
        id: 'gs1',
        provider: GameServerProvider.static,
        name: 'EU #1',
        address: '1.2.3.4',
        port: '27015',
        rcon: { address: '1.2.3.4', port: '27015', password: 'secret' },
      },
    }
    expect(gameToDto(game).gameServer).toEqual({ name: 'EU #1', provider: 'static' })
  })

  it('includes HAL links', () => {
    const result = gameToDto(baseGame)
    expect(result._links.self.href).toBe('/api/v1/games/1234')
    expect(result._links.slots.href).toBe('/api/v1/games/1234/slots')
    expect(result._links.events.href).toBe('/api/v1/games/1234/events')
  })

  it('omits connectString, stvConnectString, logSecret', () => {
    const game = {
      ...baseGame,
      connectString: 'connect 1.2.3.4:27015; password secret',
      stvConnectString: 'connect 1.2.3.4:27020',
      logSecret: 'abc',
    }
    const result = gameToDto(game) as Record<string, unknown>
    expect(result).not.toHaveProperty('connectString')
    expect(result).not.toHaveProperty('stvConnectString')
    expect(result).not.toHaveProperty('logSecret')
  })
})
