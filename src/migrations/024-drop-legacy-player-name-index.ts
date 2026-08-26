import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  try {
    await collections.players.dropIndex('name_1')
    logger.info('dropped legacy unique index players.name_1')
  } catch (error) {
    if (error instanceof MongoServerError && error.codeName === 'IndexNotFound') {
      logger.info('legacy index players.name_1 not present, nothing to drop')
      return
    }
    throw error
  }
}
