import type { GameSlotModel } from './game-slot.model'
import type { GameCreated, GameEventModel } from './game-event.model'
import type { Tf2Team } from '../../shared/types/tf2-team'

declare const _gameNumber: unique symbol
export type GameNumber = number & { [_gameNumber]: never }

export enum GameState {
  // the game has been created and is awaiting to be assigned a gameserver
  created = 'created',

  // the game has been assigned a gameserver and it is being configured
  configuring = 'configuring',

  // the gameserver is fully configured and is waiting for the match to start
  launching = 'launching',

  // the match is in progress
  started = 'started',

  // the match has ended
  ended = 'ended',

  // the match has been interrupted by an admin (or another factor)
  interrupted = 'interrupted',
}

export enum GameServerProvider {
  static = 'static',
  servemeTf = 'serveme.tf',
}

export interface GameServer {
  id: string
  provider: GameServerProvider
  name: string
  address: string
  port: string

  // if logSecret is undefined, a random one will be assigned automatically
  logSecret?: string

  rcon: {
    address: string
    port: string
    password: string
  }
}

export interface GameModel {
  number: GameNumber
  map: string
  state: GameState

  slots: GameSlotModel[]
  events: [GameCreated, ...GameEventModel[]]
  gameServer?: GameServer

  logsUrl?: string
  demoUrl?: string
  score?: Record<Tf2Team, number>

  logSecret?: string
  connectString?: string
  stvConnectString?: string
}
