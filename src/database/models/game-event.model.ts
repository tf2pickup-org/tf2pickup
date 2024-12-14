import type { Tf2Team } from '../../shared/types/tf2-team'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'

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
  tooManySubstituteRequests = 'too many substitute requests',
}

export interface GameEnded {
  event: GameEventType.gameEnded
  at: Date
  reason: GameEndedReason
  actor?: SteamId64 | Bot
}

export interface GameStarted {
  event: GameEventType.gameStarted
  at: Date
}

export interface GameServerAssigned {
  event: GameEventType.gameServerAssigned
  at: Date
  gameServerName: string
  actor?: SteamId64 | Bot
}

export interface GameServerInitialized {
  event: GameEventType.gameServerInitialized
  at: Date
}

export interface PlayerJoinedGameServer {
  event: GameEventType.playerJoinedGameServer
  at: Date
  player: SteamId64
}

export interface PlayerJoinedGameServerTeam {
  event: GameEventType.playerJoinedGameServerTeam
  at: Date
  player: SteamId64
  team: Tf2Team
}

export interface PlayerLeftGameServer {
  event: GameEventType.playerLeftGameServer
  at: Date
  player: SteamId64
}

export interface SubstituteRequested {
  event: GameEventType.substituteRequested
  at: Date
  player: SteamId64
  gameClass: Tf2ClassName
  actor: SteamId64 | Bot
  reason?: string | undefined
}

export interface PlayerReplaced {
  event: GameEventType.playerReplaced
  at: Date
  replacee: SteamId64
  replacement: SteamId64
}

export interface RoundEnded {
  event: GameEventType.roundEnded
  at: Date
  winner: Tf2Team
  lengthMs: number
  score: Record<Tf2Team, number>
}

export type GameEventModel =
  | GameCreated
  | GameStarted
  | GameEnded
  | GameServerAssigned
  | GameServerInitialized
  | PlayerJoinedGameServer
  | PlayerJoinedGameServerTeam
  | PlayerLeftGameServer
  | SubstituteRequested
  | PlayerReplaced
  | RoundEnded
