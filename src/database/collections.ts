import { database } from './database'
import type { ConfigurationEntryModel } from './models/configuration-entry.model'
import type { DocumentModel } from './models/document.model'
import type { GameLogsModel } from './models/game-logs.model'
import type { GameModel } from './models/game.model'
import type { KeyModel } from './models/key.model'
import type { MapPoolEntry } from './models/map-pool-entry.model'
import type { OnlinePlayerModel } from './models/online-player.model'
import type { PlayerModel } from './models/player.model'
import type { QueueFriendshipModel } from './models/queue-friendship.model'
import type { QueueMapOptionModel } from './models/queue-map-option.model'
import type { QueueMapVoteModel } from './models/queue-map-vote.model'
import type { QueueSlotModel } from './models/queue-slot.model'
import type { QueueStateModel } from './models/queue-state.model'
import type { SecretModel } from './models/secret.model'
import type { StaticGameServerModel } from './models/static-game-server.model'
import type { TaskModel } from './models/task.model'
import type { StreamModel } from './models/stream.model'
import type { CertificateModel } from './models/certificate.model'

export const collections = {
  certificates: database.collection<CertificateModel>('certificates'),
  configuration: database.collection<ConfigurationEntryModel>('configuration'),
  documents: database.collection<DocumentModel>('documents'),
  gameLogs: database.collection<GameLogsModel>('gamelogs'),
  games: database.collection<GameModel>('games'),
  keys: database.collection<KeyModel>('keys'),
  maps: database.collection<MapPoolEntry>('maps'),
  onlinePlayers: database.collection<OnlinePlayerModel>('onlineplayers'),
  players: database.collection<PlayerModel>('players'),
  queueFriends: database.collection<QueueFriendshipModel>('queue.friends'),
  queueSlots: database.collection<QueueSlotModel>('queue.slots'),
  queueState: database.collection<QueueStateModel>('queue.state'),
  queueMapOptions: database.collection<QueueMapOptionModel>('queue.mapoptions'),
  queueMapVotes: database.collection<QueueMapVoteModel>('queue.mapvotes'),
  secrets: database.collection<SecretModel>('secrets'),
  staticGameServers: database.collection<StaticGameServerModel>('staticgameservers'),
  streams: database.collection<StreamModel>('streams'),
  tasks: database.collection<TaskModel>('tasks'),
}
