import EventEmitter from 'events'
import type { SteamId64 } from './shared/types/steam-id-64'
import type { UserMetadata } from './shared/types/user-metadata'
import { logger } from './logger'
import type { QueueSlotModel } from './database/models/queue-slot.model'
import { QueueState } from './database/models/queue-state.model'
import type { GameModel, GameNumber } from './database/models/game.model'
import type { PlayerModel } from './database/models/player.model'
import type { MapPoolEntry } from './database/models/map-pool-entry.model'
import type { StaticGameServerModel } from './database/models/static-game-server.model'
import type { LogMessage } from './log-receiver/parse-log-message'
import type { Tf2Team } from './shared/types/tf2-team'

export interface Events {
  'game:created': {
    game: GameModel
  }
  'game:updated': {
    before: GameModel
    after: GameModel
  }
  'game:gameServerAssigned': {
    game: GameModel
  }
  'game:substituteRequested': {
    game: GameModel
    replacee: SteamId64
    actor?: SteamId64
    reason?: string
  }

  'gamelog:message': {
    message: LogMessage
  }

  'match:started': {
    gameNumber: GameNumber
  }
  'match:roundWon': {
    gameNumber: GameNumber
    winner: Tf2Team
  }
  'match:roundLength': {
    gameNumber: GameNumber
    lengthMs: number
  }
  'match:ended': {
    gameNumber: GameNumber
  }
  'match/player:connected': {
    gameNumber: GameNumber
    steamId: SteamId64
    ipAddress: string
  }
  'match/player:joinedTeam': {
    gameNumber: GameNumber
    steamId: SteamId64
    team: Tf2Team
  }
  'match/player:disconnected': {
    gameNumber: GameNumber
    steamId: SteamId64
  }
  'match/player:said': {
    gameNumber: GameNumber
    steamId: SteamId64
    message: string
  }
  'match/score:reported': {
    gameNumber: GameNumber
    teamName: Tf2Team
    score: number
  }
  'match/score:final': {
    gameNumber: GameNumber
    team: Tf2Team
    score: number
  }
  'match/logs:uploaded': {
    gameNumber: GameNumber
    logsUrl: string
  }
  'match/demo:uploaded': {
    gameNumber: GameNumber
    demoUrl: string
  }

  'player:connected': {
    steamId: SteamId64
    metadata: UserMetadata
  }
  'player:disconnected': {
    steamId: SteamId64
  }
  'player:updated': {
    before: PlayerModel
    after: PlayerModel
  }

  'queue/mapPool:reset': {
    maps: MapPoolEntry[]
  }
  'queue/slots:updated': {
    slots: QueueSlotModel[]
  }
  'queue/state:updated': {
    state: QueueState
  }
  'queue/mapOptions:reset': {
    mapOptions: string[]
  }
  'queue/mapVoteResults:updated': {
    results: Record<string, number>
  }
  'queue/friendship:created': {
    source: SteamId64
    target: SteamId64
  }
  'queue/friendship:updated': {
    source: SteamId64
    target: {
      before: SteamId64
      after: SteamId64
    }
  }
  'queue/friendship:removed': {
    source: SteamId64
    target: SteamId64
  }

  'staticGameServer:added': {
    gameServer: StaticGameServerModel
  }
  'staticGameServer:updated': {
    before: StaticGameServerModel
    after: StaticGameServerModel
  }
}

class TypedEventEmitter extends EventEmitter {
  override emit<K extends keyof Events>(event: K, params: Events[K]): boolean {
    logger.trace(params, event)
    return super.emit(event, params)
  }

  override on<K extends keyof Events>(event: K, listener: (params: Events[K]) => void): this {
    return super.on(event, listener)
  }
}

export const events = new TypedEventEmitter()
