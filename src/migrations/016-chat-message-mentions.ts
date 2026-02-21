import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  const result = await collections.chatMessages.updateMany(
    { mentions: { $exists: false } },
    { $set: { mentions: [] } },
  )
  logger.info(`added mentions field to ${result.modifiedCount} chat messages`)
}
