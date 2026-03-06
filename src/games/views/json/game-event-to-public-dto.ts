import { GameEventType, type GameEventModel } from '../../../database/models/game-event.model'

export function gameEventToPublicDto(event: GameEventModel) {
  const at = event.at.toISOString()

  switch (event.event) {
    case GameEventType.gameCreated:
      return { type: 'gameCreated', at }

    case GameEventType.gameStarted:
      return { type: 'gameStarted', at }

    case GameEventType.gameRestarted:
      return { type: 'gameRestarted', at }

    case GameEventType.gameEnded:
      return { type: 'gameEnded', at, reason: event.reason }

    case GameEventType.gameServerAssigned:
      return { type: 'gameServerAssigned', at, gameServerName: event.gameServerName }

    case GameEventType.gameServerInitialized:
      return { type: 'gameServerInitialized', at }

    case GameEventType.substituteRequested:
      return { type: 'substituteRequested', at, gameClass: event.gameClass }

    case GameEventType.playerReplaced:
      return { type: 'playerReplaced', at, gameClass: event.gameClass }

    case GameEventType.playerJoinedGameServer:
      return { type: 'playerJoinedGameServer', at, player: event.player }

    case GameEventType.playerJoinedGameServerTeam:
      return { type: 'playerJoinedGameServerTeam', at, player: event.player, team: event.team }

    case GameEventType.playerLeftGameServer:
      return { type: 'playerLeftGameServer', at, player: event.player }

    case GameEventType.roundEnded:
      return {
        type: 'roundEnded',
        at,
        winner: event.winner,
        lengthMs: event.lengthMs,
        score: event.score,
      }

    case GameEventType.gameServerAssignmentFailed:
    case GameEventType.gameServerReinitializationOrdered:
      return null
  }
}
