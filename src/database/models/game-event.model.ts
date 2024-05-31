import type { ObjectId } from 'mongodb'

export enum GameEvent {
  gameCreated = 'created',
  gameStarted = 'started',
  gameEnded = 'ended',

  gameServerAssigned = 'game server assigned',
  gameServerInitialized = 'game server initialized',

  substituteRequested = 'substitute requested',
  playerReplaced = 'player replaced',

  playerJoinedGameServer = 'player joined game server',
  playerJoinedGameServerTeam = 'player joined game server team',
  playerLeftGameServer = 'player left game server',

  roundEnded = 'round ended',
}

export interface GameEventModel {
  at: Date
  event: GameEvent
}

export interface GameCreated extends GameEventModel {
  event: GameEvent.gameCreated
}

export enum GameEndedReason {
  matchEnded = 'match ended',
  interrupted = 'interrupted',
}

export interface GameEnded extends GameEventModel {
  event: GameEvent.gameEnded
  reason: GameEndedReason
  actor?: ObjectId
}
