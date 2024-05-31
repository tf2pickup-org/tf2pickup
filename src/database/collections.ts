import { database } from './database'
import type { ConfigurationEntryModel } from './models/configuration-entry.model'
import type { GameModel } from './models/game.model'
import type { OnlinePlayerModel } from './models/online-player.model'
import type { PlayerModel } from './models/player.model'
import type { QueueSlotModel } from './models/queue-slot.model'
import type { QueueStateModel } from './models/queue-state.model'

export const collections = {
  configuration: database.collection<ConfigurationEntryModel>('configuration'),
  games: database.collection<GameModel>('games'),
  onlinePlayers: database.collection<OnlinePlayerModel>('onlineplayers'),
  players: database.collection<PlayerModel>('players'),
  queueSlots: database.collection<QueueSlotModel>('queue.slots'),
  queueState: database.collection<QueueStateModel>('queue.state'),
}
