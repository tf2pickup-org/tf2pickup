import EventEmitter from 'events'
import type { SteamId64 } from './shared/types/steam-id-64'
import type { UserMetadata } from './shared/types/user-metadata'
import { logger } from './logger'
import type { QueueSlotModel } from './database/models/queue-slot.model'
import { QueueState } from './database/models/queue-state.model'
import type { GameModel } from './database/models/game.model'
import type { PlayerModel } from './database/models/player.model'

export interface Events {
  'game:created': {
    game: GameModel
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
}

class TypedEventEmitter extends EventEmitter {
  override emit<K extends keyof Events>(event: K, params: Events[K]): boolean {
    logger.trace(`${event}`)
    return super.emit(event, params)
  }

  override on<K extends keyof Events>(event: K, listener: (params: Events[K]) => void): this {
    return super.on(event, listener)
  }
}

export const events = new TypedEventEmitter()
