import type { ObjectId } from 'mongodb'

export enum GameEventType {
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

export interface GameCreated {
  event: GameEventType.gameCreated
  at: Date
}

export enum GameEndedReason {
  matchEnded = 'match ended',
  interrupted = 'interrupted',
}

export interface GameEnded {
  event: GameEventType.gameEnded
  at: Date
  reason: GameEndedReason
  actor?: ObjectId
}

export interface GameStarted {
  event: GameEventType.gameStarted
  at: Date
}

export interface GameServerAssigned {
  event: GameEventType.gameServerAssigned
  at: Date
  gameServerName: string
  actor?: ObjectId
}

export interface GameServerInitialized {
  event: GameEventType.gameServerInitialized
  at: Date
}

export type GameEventModel =
  | GameCreated
  | GameStarted
  | GameEnded
  | GameServerAssigned
  | GameServerInitialized
