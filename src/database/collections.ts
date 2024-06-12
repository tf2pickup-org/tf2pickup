import { database } from './database'
import type { ConfigurationEntryModel } from './models/configuration-entry.model'
import type { DocumentModel } from './models/document.model'
import type { GameModel } from './models/game.model'
import type { MapPoolEntry } from './models/map-pool-entry.model'
import type { OnlinePlayerModel } from './models/online-player.model'
import type { PlayerModel } from './models/player.model'
import type { QueueMapOptionModel } from './models/queue-map-option.model'
import type { QueueMapVoteModel } from './models/queue-map-vote.model'
import type { QueueSlotModel } from './models/queue-slot.model'
import type { QueueStateModel } from './models/queue-state.model'
import type { StaticGameServerModel } from './models/static-game-server.model'

export const collections = {
  configuration: database.collection<ConfigurationEntryModel>('configuration'),
  documents: database.collection<DocumentModel>('documents'),
  games: database.collection<GameModel>('games'),
  maps: database.collection<MapPoolEntry>('maps'),
  onlinePlayers: database.collection<OnlinePlayerModel>('onlineplayers'),
  players: database.collection<PlayerModel>('players'),
  queueSlots: database.collection<QueueSlotModel>('queue.slots'),
  queueState: database.collection<QueueStateModel>('queue.state'),
  queueMapOptions: database.collection<QueueMapOptionModel>('queue.mapoptions'),
  queueMapVotes: database.collection<QueueMapVoteModel>('queue.mapvotes'),
  staticGameServers: database.collection<StaticGameServerModel>('staticgameservers'),
}
