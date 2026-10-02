import { collections } from './collections'
import {
  MongoServerError,
  ObjectId,
  type CreateIndexesOptions,
  type IndexSpecification,
} from 'mongodb'
import { logger } from '../logger'
import { Gamemode } from '../shared/types/gamemode'

interface IndexDefinition {
  spec: IndexSpecification
  options?: CreateIndexesOptions
}

const definitions: Partial<Record<keyof typeof collections, IndexDefinition[]>> = {
  activityLog: [
    { spec: { timestamp: -1 } },
    { spec: { type: 1, timestamp: -1 } },
    { spec: { player: 1, timestamp: -1 } },
    { spec: { actor: 1, timestamp: -1 } },
  ],
  players: [
    { spec: { steamId: 1 }, options: { unique: true } },
    // Covers the player list query (steamId + name, no _id) so it runs index-only.
    { spec: { steamId: 1, name: 1 } },
    { spec: { 'stats.totalGames': -1 } },
    ...Object.values(Gamemode).map(gamemode => ({
      spec: { [`stats.gamesByClass.${gamemode}.medic`]: -1 },
    })),
    { spec: { avatarLastSyncedAt: 1 } },
    // Sparse: preReadyUntil is $unset once the pre-ready lapses, so this only
    // ever holds the handful of players pre-readied right now.
    { spec: { preReadyUntil: 1 }, options: { sparse: true } },
  ],
  games: [
    { spec: { number: 1 }, options: { unique: true } },
    { spec: { logSecret: 1 }, options: { unique: true, sparse: true } },
    { spec: { 'slots.player': 1 } },
    { spec: { 'events.0.at': -1 } },
    { spec: { state: 1 } },
  ],
  gameLogs: [{ spec: { logSecret: 1 }, options: { unique: true, sparse: true } }],
  queues: [{ spec: { slug: 1 }, options: { unique: true } }, { spec: { position: 1 } }],
  queueSlots: [
    { spec: { 'player.steamId': 1 }, options: { sparse: true } },
    { spec: { queue: 1, id: 1 }, options: { unique: true } },
  ],
  queueState: [{ spec: { queue: 1 }, options: { unique: true } }],
  queueFriends: [{ spec: { queue: 1, source: 1 }, options: { unique: true } }],
  queueMapVotes: [{ spec: { queue: 1, player: 1 }, options: { unique: true } }],
  configuration: [{ spec: { key: 1 }, options: { unique: true } }],
  documents: [{ spec: { name: 1 }, options: { unique: true } }],
  announcements: [{ spec: { createdAt: -1 } }],
  tasks: [{ spec: { at: 1 } }, { spec: { name: 1 } }],
  discordBotState: [{ spec: { guildId: 1 }, options: { unique: true } }],
  keys: [{ spec: { name: 1 }, options: { unique: true } }],
  secrets: [{ spec: { name: 1 }, options: { unique: true } }],
  telemetryStats: [{ spec: { day: 1 }, options: { unique: true } }],
  chatMessages: [{ spec: { at: -1 } }],
  queueMapOptions: [{ spec: { queue: 1, name: 1 }, options: { unique: true } }],
  discordSubstituteNotifications: [
    { spec: { guildId: 1, gameNumber: 1, slotId: 1 }, options: { unique: true } },
  ],
  gamesSubstituteRequests: [{ spec: { gameNumber: 1, slotId: 1 }, options: { unique: true } }],
  gamesDeferredKicks: [
    { spec: { gameNumber: 1, slotId: 1 }, options: { unique: true } },
    { spec: { gameNumber: 1, replacement: 1 } },
  ],
  gamesRoundProgress: [{ spec: { gameNumber: 1 }, options: { unique: true } }],
  futurePlayerSkills: [{ spec: { steamId: 1, gamemode: 1 }, options: { unique: true } }],
  pendingImports: [{ spec: { actor: 1 }, options: { unique: true } }],
  logsTfLogs: [
    { spec: { logId: 1 }, options: { unique: true } },
    { spec: { gameNumber: 1 }, options: { unique: true } },
  ],
  playerActions: [
    { spec: { timestamp: -1 } },
    { spec: { player: 1, timestamp: -1 } },
    { spec: { action: 1, timestamp: -1 } },
    { spec: { ipAddress: 1, timestamp: -1 } },
  ],
}

export async function ensureIndexes() {
  logger.info('ensuring indexes...')
  const promises = Object.entries(definitions).map(async ([collectionName, indexes]) => {
    const collection = collections[collectionName as keyof typeof collections]
    for (const { spec, options } of indexes) {
      try {
        await collection.createIndex(spec, options)
      } catch (error) {
        if (
          collectionName === 'gameLogs' &&
          error instanceof MongoServerError &&
          error.code === 11000
        ) {
          logger.warn('duplicate game logs found, removing...')
          // remove duplicates
          for await (const doc of collection.aggregate<{
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
          await collection.createIndex(spec, options)
          logger.info('gamelogs index created successfully after removing duplicates')
        } else {
          logger.error(error)
        }
      }
    }
  })

  await Promise.all(promises)
  logger.info('indexes ensured')
}
