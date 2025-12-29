import { MongoServerError, ObjectId } from 'mongodb'
import { logger } from '../logger'
import { database } from './database'
import { collections } from './collections'
import { databaseIndexes } from './database-indexes'

export async function ensureIndexes(): Promise<void> {
  for (const { collectionName, indexes } of databaseIndexes()) {
    if (indexes.length === 0) {
      continue
    }

    try {
      await database.collection(collectionName).createIndexes(indexes)
      logger.info({ collectionName, count: indexes.length }, 'mongodb indexes ensured')
    } catch (error) {
      if (
        collectionName === collections.gameLogs.collectionName &&
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        await removeDuplicateGameLogs()
        await database.collection(collectionName).createIndexes(indexes)
        logger.info({ collectionName, count: indexes.length }, 'mongodb indexes ensured (after dedupe)')
        continue
      }

      throw error
    }
  }
}

async function removeDuplicateGameLogs() {
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
}

