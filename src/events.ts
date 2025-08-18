import EventEmitter from 'events'
import type { SteamId64 } from './shared/types/steam-id-64'
import type { UserMetadata } from './shared/types/user-metadata'
import { logger } from './logger'
import type { QueueSlotModel } from './database/models/queue-slot.model'
import { QueueState } from './database/models/queue-state.model'
import type { GameModel, GameNumber } from './database/models/game.model'
import type { PlayerBan, PlayerModel } from './database/models/player.model'
import type { MapPoolEntry } from './database/models/map-pool-entry.model'
import type { StaticGameServerModel } from './database/models/static-game-server.model'
import type { LogMessage } from './log-receiver/parse-log-message'
import type { Tf2Team } from './shared/types/tf2-team'
import type { StreamModel } from './database/models/stream.model'
import type { Bot } from './shared/types/bot'
import type { PlayerConnectionStatus } from './database/models/game-slot.model'
import type { Configuration } from './database/models/configuration-entry.model'
import type { MumbleClientStatus } from './mumble/status'
import type { ChatMessageModel } from './database/models/chat-message.model'
import type { GameSlotId } from './shared/types/game-slot-id'

export interface Events {
  'chat:messageSent': {
    message: ChatMessageModel
  }

  'configuration:updated': {
    key: keyof Configuration
  }

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
  'game:gameServerReinitializationRequested': {
    game: GameModel
  }
  'game:gameServerInitialized': {
    game: GameModel
  }
  'game:substituteRequested': {
    game: GameModel
    replacee: SteamId64
    slotId: GameSlotId
    actor: SteamId64 | Bot
    reason?: string
  }
  'game:playerReplaced': {
    game: GameModel
    replacee: SteamId64
    replacement: SteamId64
    slotId: GameSlotId
  }
  'game:playerConnectionStatusUpdated': {
    game: GameModel
    player: SteamId64
    playerConnectionStatus: PlayerConnectionStatus
  }
  'game:ended': {
    game: GameModel
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

  'mumble/connectionStatusChanged': {
    status: MumbleClientStatus
  }

  'player:connected': {
    steamId: SteamId64
    metadata: UserMetadata
  }
  'player:disconnected': {
    steamId: SteamId64
  }
  'player:created': {
    steamId: SteamId64
  }
  'player:updated': {
    before: PlayerModel
    after: PlayerModel
    adminId?: SteamId64 | undefined
  }
  'player/ban:added': {
    player: SteamId64
    ban: PlayerBan
  }
  'player/ban:revoked': {
    player: SteamId64
    ban: PlayerBan
    admin: SteamId64
  }

  'queue:playerKicked': {
    player: SteamId64
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

  'twitch.tv/streams:updated': {
    streams: StreamModel[]
  }
}

class TypedEventEmitter extends EventEmitter {
  override emit<K extends keyof Events>(event: K, params: Events[K]): boolean {
    logger.trace({ params }, event)
    return super.emit(event, params)
  }

  override on<K extends keyof Events>(event: K, listener: (params: Events[K]) => void): this {
    return super.on(event, listener)
  }
}

export const events = new TypedEventEmitter()
