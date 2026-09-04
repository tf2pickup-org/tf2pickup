import { collections } from '../database/collections'
import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'

// Multi-gamemode partition, phase 3: the map pool becomes per-gamemode. Every
// existing map belongs to the instance's current (single) gamemode.
//
// Idempotent: only maps missing `gamemode` are tagged, so a re-run (or a run on
// a fresh database) is a no-op.
export async function up() {
  const { modifiedCount } = await collections.maps.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode: defaultGamemode } },
  )
  if (modifiedCount > 0) {
    logger.info(`tagged ${modifiedCount} maps with gamemode ${defaultGamemode}`)
  }

  // The old single-field unique index collides once the same map name can exist
  // in more than one gamemode; ensureIndexes() recreates it scoped by gamemode.
  try {
    await collections.maps.dropIndex('name_1')
    logger.info('dropped obsolete index maps.name_1')
  } catch {
    // index already absent (fresh database or re-run) — nothing to do
  }
}
