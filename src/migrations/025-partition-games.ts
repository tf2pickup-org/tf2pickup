import { collections } from '../database/collections'
import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'

// Multi-gamemode partition, phase 1: games gain a `gamemode` discriminator.
// Every existing game is attributed to the gamemode this single-gamemode instance
// has been running (defaultGamemode).
//
// Idempotent: only games missing `gamemode` are tagged, so a re-run (or a run on
// a fresh database) is a no-op.
export async function up() {
  const { modifiedCount } = await collections.games.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode: defaultGamemode } },
  )
  if (modifiedCount > 0) {
    logger.info(`tagged ${modifiedCount} games with gamemode ${defaultGamemode}`)
  }
}
