import { database } from './database'
import type { ConfigurationEntryModel } from './models/configuration-entry.model'
import type { DocumentModel } from './models/document.model'
import type { GameLogsModel } from './models/game-logs.model'
import type { GameModel } from './models/game.model'
import type { KeyModel } from './models/key.model'
import type { MapPoolEntry } from './models/map-pool-entry.model'
import type { OnlinePlayerModel } from './models/online-player.model'
import type { PlayerModel } from './models/player.model'
import type { PlayerBansModel } from './models/player-bans.model'
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
import type { ChatMessageModel } from './models/chat-message.model'
import type { DiscordBotStateModel } from './models/discord-bot-state.model'
import type { PlayerActionEntryModel } from './models/player-action-entry.model'
import type { DiscordSubstituteNotificationModel } from './models/discord-substitute-notification.model'
import { logger } from '../logger'
import type { ObjectId } from 'mongodb'

export const collections = {
  certificates: database.collection<CertificateModel>('certificates'),
  chatMessages: database.collection<ChatMessageModel>('chat.messages'),
  configuration: database.collection<ConfigurationEntryModel>('configuration'),
  discordSubstituteNotifications: database.collection<DiscordSubstituteNotificationModel>(
    'discord.substitutenotifications',
  ),
  discordBotState: database.collection<DiscordBotStateModel>('discord.botstate'),
  documents: database.collection<DocumentModel>('documents'),
  gameLogs: database.collection<GameLogsModel>('gamelogs'),
  games: database.collection<GameModel>('games'),
  keys: database.collection<KeyModel>('keys'),
  maps: database.collection<MapPoolEntry>('maps'),
  onlinePlayers: database.collection<OnlinePlayerModel>('onlineplayers'),
  playerActions: database.collection<PlayerActionEntryModel>('playeractions'),
  playerBans: database.collection<PlayerBansModel>('playerbans'),
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

try {
  await collections.gameLogs.createIndex({ logSecret: 1 }, { unique: true, sparse: true })
  logger.info('gamelogs index created successfully')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (error) {
  // remove duplicates
  for await (const doc of collections.gameLogs.aggregate<{
    _id: ObjectId
    dups: ObjectId[]
    count: number
  }>([
    {
      $group: {
        _id: { logSecret: '$logSecret' },
        dups: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ])) {
    doc.dups.shift()
    await collections.gameLogs.deleteMany({ _id: { $in: doc.dups } })
  }

  await collections.gameLogs.createIndex({ logSecret: 1 }, { unique: true, sparse: true })
  logger.info('gamelogs index created successfully')
}

try {
  await collections.playerBans.createIndex({ steamId: 1 }, { unique: true })
  logger.info('playerbans index created successfully')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (error) {
  logger.warn({ error }, 'playerbans index creation failed')
}
