import { collections } from '../database/collections'
import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'

// Multi-gamemode partition, phase 2: the queue collections gain a `gamemode`
// discriminator so a single instance can run several independent queues. Every
// existing document belongs to the instance's current (single) gamemode.
//
// Idempotent: only documents missing `gamemode` are tagged, so a re-run (or a
// run on a fresh database) is a no-op.

const queueCollections = [
  collections.queueSlots,
  collections.queueState,
  collections.queueMapOptions,
  collections.queueMapVotes,
  collections.queueFriends,
] as const

// Old single-field indexes collide once the same slot id / map name / source can
// exist in more than one gamemode; ensureIndexes() recreates them scoped by
// gamemode.
const obsoleteIndexes = [
  { collection: collections.queueSlots, name: 'id_1' },
  { collection: collections.queueMapOptions, name: 'name_1' },
  { collection: collections.queueFriends, name: 'source_1' },
] as const

export async function up() {
  for (const collection of queueCollections) {
    const { modifiedCount } = await collection.updateMany(
      { gamemode: { $exists: false } },
      { $set: { gamemode: defaultGamemode } },
    )
    if (modifiedCount > 0) {
      logger.info(
        `tagged ${modifiedCount} ${collection.collectionName} docs with gamemode ${defaultGamemode}`,
      )
    }
  }

  for (const { collection, name } of obsoleteIndexes) {
    try {
      await collection.dropIndex(name)
      logger.info(`dropped obsolete index ${collection.collectionName}.${name}`)
    } catch {
      // index already absent (fresh database or re-run) — nothing to do
    }
  }
}
