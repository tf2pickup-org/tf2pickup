import type { Collection } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  const result = await collections.players.updateMany(
    { skill: { $exists: true } },
    { $set: { verified: true } },
  )
  logger.info(`set verified=true for ${result.modifiedCount} players with skill assigned`)

  const deleted = await (collections.configuration as unknown as Collection).deleteOne({
    key: 'queue.deny_players_with_no_skill_assigned',
  })
  if (deleted.deletedCount > 0) {
    logger.info('removed queue.deny_players_with_no_skill_assigned configuration entry')
  }
}
