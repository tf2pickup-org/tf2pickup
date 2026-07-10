import { collections } from '../database/collections'
import { logger } from '../logger'
import { currentGamemode } from '../shared/current-gamemode'

// Phase 3 backfill: the map pool becomes per-gamemode. Existing maps belong to
// the instance's current (single) gamemode.
//
// Idempotent: only untagged maps are touched, so a re-run (or a run on a fresh
// database) is a no-op.

export async function up() {
  const g0 = currentGamemode

  const { modifiedCount } = await collections.maps.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode: g0 } },
  )
  if (modifiedCount > 0) {
    logger.info(`tagged ${modifiedCount} maps with gamemode ${g0}`)
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
