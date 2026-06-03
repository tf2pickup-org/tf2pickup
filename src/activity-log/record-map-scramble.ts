import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function recordMapScramble(actor: SteamId64, maps: string[]): Promise<void> {
  const lastEntry = await collections.activityLog.findOne({}, { sort: { timestamp: -1 } })

  if (lastEntry?.type === 'map scramble' && lastEntry.actor === actor) {
    await collections.activityLog.updateOne(
      { _id: lastEntry._id },
      { $set: { maps, timestamp: new Date() }, $inc: { count: 1 } },
    )
  } else {
    await collections.activityLog.insertOne({
      type: 'map scramble',
      actor,
      maps,
      count: 1,
      timestamp: new Date(),
    })
  }
}
