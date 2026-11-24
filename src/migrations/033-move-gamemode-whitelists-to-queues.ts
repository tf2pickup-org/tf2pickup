import { collections } from '../database/collections'
import { database } from '../database/database'

// Whitelists used to be set per gamemode too. Each one moves to the queues of its gamemode that
// had no whitelist of their own, so every queue keeps the whitelist it ran with.
export async function up() {
  const entry = await database
    .collection<{ key: string; value: Record<string, string> }>('configuration')
    .findOne({ key: 'games.gamemode_whitelist_ids' })
  if (!entry) {
    return
  }

  for (const [gamemode, whitelistId] of Object.entries(entry.value)) {
    await collections.queues.updateMany(
      { gamemode: gamemode as never, whitelistId: null },
      { $set: { whitelistId } },
    )
  }
  await database.collection('configuration').deleteOne({ _id: entry._id })
}
