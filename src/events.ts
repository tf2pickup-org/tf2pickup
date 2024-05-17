import EventEmitter from 'events'
import { SteamId64 } from './shared/types/steam-id-64'
import { UserMetadata } from './shared/types/user-metadata'
import { logger } from './logger'
import { QueueSlotModel } from './database/models/queue-slot.model'
import { QueueState } from './database/models/queue-state.model'

export interface Events {
  'player:connected': {
    steamId: SteamId64
    metadata: UserMetadata
  }
  'player:disconnected': {
    steamId: SteamId64
  }

  'queue/slots:updated': {
    slots: QueueSlotModel[]
  }
  'queue/state:updated': {
    state: QueueState
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
