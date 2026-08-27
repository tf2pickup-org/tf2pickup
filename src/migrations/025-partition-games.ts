import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'

// Every game played so far was played in the single gamemode the instance ran.
export async function up() {
  const { modifiedCount } = await collections.games.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode: environment.QUEUE_CONFIG } },
  )
  logger.info(`tagged ${modifiedCount} games with gamemode ${environment.QUEUE_CONFIG}`)
}
