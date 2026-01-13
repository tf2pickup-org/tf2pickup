import { collections } from './collections'
import {
  MongoServerError,
  ObjectId,
  type CreateIndexesOptions,
  type IndexSpecification,
} from 'mongodb'
import { logger } from '../logger'

interface IndexDefinition {
  spec: IndexSpecification
  options?: CreateIndexesOptions
}

const definitions: Partial<Record<keyof typeof collections, IndexDefinition[]>> = {
  players: [{ spec: { steamId: 1 }, options: { unique: true } }],
  games: [
    { spec: { number: 1 }, options: { unique: true } },
    { spec: { logSecret: 1 }, options: { unique: true, sparse: true } },
    { spec: { 'slots.player': 1 } },
    { spec: { 'events.0.at': -1 } },
    { spec: { state: 1 } },
  ],
  gameLogs: [{ spec: { logSecret: 1 }, options: { unique: true, sparse: true } }],
  queueSlots: [
    { spec: { 'player.steamId': 1 }, options: { sparse: true } },
    { spec: { id: 1 }, options: { unique: true } },
  ],
  queueFriends: [{ spec: { source: 1 } }],
  configuration: [{ spec: { key: 1 }, options: { unique: true } }],
  documents: [{ spec: { name: 1 }, options: { unique: true } }],
  announcements: [{ spec: { createdAt: -1 } }],
  tasks: [{ spec: { at: 1 } }],
  discordBotState: [{ spec: { guildId: 1 }, options: { unique: true } }],
  keys: [{ spec: { name: 1 }, options: { unique: true } }],
  secrets: [{ spec: { name: 1 }, options: { unique: true } }],
  maps: [{ spec: { name: 1 }, options: { unique: true } }],
  chatMessages: [{ spec: { at: -1 } }],
  queueMapOptions: [{ spec: { name: 1 }, options: { unique: true } }],
  discordSubstituteNotifications: [
    { spec: { guildId: 1, gameNumber: 1, slotId: 1 }, options: { unique: true } },
  ],
  gamesSubstituteRequests: [{ spec: { gameNumber: 1, slotId: 1 }, options: { unique: true } }],
  pendingSkills: [{ spec: { steamId: 1 }, options: { unique: true } }],
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
            await collection.deleteMany({ _id: { $in: doc.dups } })
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
