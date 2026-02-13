import { database } from './database'
import type { AnnouncementModel } from './models/announcement.model'
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
import type { ChatMessageModel } from './models/chat-message.model'
import type { DiscordBotStateModel } from './models/discord-bot-state.model'
import type { PlayerActionEntryModel } from './models/player-action-entry.model'
import type { DiscordSubstituteNotificationModel } from './models/discord-substitute-notification.model'
import type { SubstituteRequestModel } from './models/substitute-request.model'
import type { FuturePlayerSkillModel } from './models/future-player-skill.model'
import { ensureIndexes } from './ensure-indexes'

export const collections = {
  announcements: database.collection<AnnouncementModel>('announcements'),
  certificates: database.collection<CertificateModel>('certificates'),
  chatMessages: database.collection<ChatMessageModel>('chat.messages'),
  configuration: database.collection<ConfigurationEntryModel>('configuration'),
  discordSubstituteNotifications: database.collection<DiscordSubstituteNotificationModel>(
    'discord.substitutenotifications',
  ),
  discordBotState: database.collection<DiscordBotStateModel>('discord.botstate'),
  documents: database.collection<DocumentModel>('documents'),
  futurePlayerSkills: database.collection<FuturePlayerSkillModel>('futureplayerskills'),
  gameLogs: database.collection<GameLogsModel>('gamelogs'),
  games: database.collection<GameModel>('games'),
  gamesSubstituteRequests: database.collection<SubstituteRequestModel>('games.substituterequests'),
  keys: database.collection<KeyModel>('keys'),
  maps: database.collection<MapPoolEntry>('maps'),
  onlinePlayers: database.collection<OnlinePlayerModel>('onlineplayers'),
  playerActions: database.collection<PlayerActionEntryModel>('playeractions'),
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

await ensureIndexes()
