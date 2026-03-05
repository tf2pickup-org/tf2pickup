import { describe, expect, it } from 'vitest'
import { gameEventToPublicDto } from './game-event-to-public-dto'
import { GameEventType, GameEndedReason } from '../../../../database/models/game-event.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import type { Tf2Team } from '../../../../shared/types/tf2-team'
import type { Tf2ClassName } from '../../../../shared/types/tf2-class-name'

const at = new Date('2024-01-01T12:00:00.000Z')
const atStr = '2024-01-01T12:00:00.000Z'
const steamId = '76561198012345678' as SteamId64

describe('gameEventToPublicDto()', () => {
  it('returns null for gameServerAssignmentFailed (excluded)', () => {
    expect(
      gameEventToPublicDto({
        event: GameEventType.gameServerAssignmentFailed,
        at,
        reason: 'unavailable',
      }),
    ).toBeNull()
  })

  it('returns null for gameServerReinitializationOrdered (excluded)', () => {
    expect(
      gameEventToPublicDto({ event: GameEventType.gameServerReinitializationOrdered, at }),
    ).toBeNull()
  })

  it('maps gameCreated with type "gameCreated"', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameCreated, at })).toEqual({
      type: 'gameCreated',
      at: atStr,
    })
  })

  it('maps gameStarted', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameStarted, at })).toEqual({
      type: 'gameStarted',
      at: atStr,
    })
  })

  it('maps gameRestarted', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameRestarted, at })).toEqual({
      type: 'gameRestarted',
      at: atStr,
    })
  })

  it('maps gameEnded with reason, without actor', () => {
    const event = {
      event: GameEventType.gameEnded,
      at,
      reason: GameEndedReason.matchEnded,
      actor: steamId,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'gameEnded', at: atStr, reason: 'match ended' })
    expect(result).not.toHaveProperty('actor')
  })

  it('maps gameServerAssigned with gameServerName, without actor', () => {
    const event = {
      event: GameEventType.gameServerAssigned,
      at,
      gameServerName: 'EU #1',
      actor: steamId,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'gameServerAssigned', at: atStr, gameServerName: 'EU #1' })
    expect(result).not.toHaveProperty('actor')
  })

  it('maps gameServerInitialized', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameServerInitialized, at })).toEqual({
      type: 'gameServerInitialized',
      at: atStr,
    })
  })

  it('maps substituteRequested with gameClass only — omits player and actor', () => {
    const event = {
      event: GameEventType.substituteRequested,
      at,
      player: steamId,
      gameClass: 'medic' as Tf2ClassName,
      actor: steamId,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'substituteRequested', at: atStr, gameClass: 'medic' })
    expect(result).not.toHaveProperty('player')
    expect(result).not.toHaveProperty('actor')
  })

  it('maps playerReplaced with gameClass only — omits player steamIds', () => {
    const event = {
      event: GameEventType.playerReplaced,
      at,
      replacee: steamId,
      replacement: steamId,
      gameClass: 'medic' as Tf2ClassName,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'playerReplaced', at: atStr, gameClass: 'medic' })
    expect(result).not.toHaveProperty('replacee')
    expect(result).not.toHaveProperty('replacement')
  })

  it('maps playerJoinedGameServer with player steamId', () => {
    expect(
      gameEventToPublicDto({ event: GameEventType.playerJoinedGameServer, at, player: steamId }),
    ).toEqual({ type: 'playerJoinedGameServer', at: atStr, player: steamId })
  })

  it('maps playerJoinedGameServerTeam with player and team', () => {
    const event = {
      event: GameEventType.playerJoinedGameServerTeam,
      at,
      player: steamId,
      team: 'red' as Tf2Team,
    }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'playerJoinedGameServerTeam',
      at: atStr,
      player: steamId,
      team: 'red',
    })
  })

  it('maps playerLeftGameServer with player steamId', () => {
    expect(
      gameEventToPublicDto({ event: GameEventType.playerLeftGameServer, at, player: steamId }),
    ).toEqual({ type: 'playerLeftGameServer', at: atStr, player: steamId })
  })

  it('maps roundEnded with all fields', () => {
    const event = {
      event: GameEventType.roundEnded,
      at,
      winner: 'red' as Tf2Team,
      lengthMs: 300000,
      score: { red: 1, blu: 0 } as Record<Tf2Team, number>,
    }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'roundEnded',
      at: atStr,
      winner: 'red',
      lengthMs: 300000,
      score: { red: 1, blu: 0 },
    })
  })
})
