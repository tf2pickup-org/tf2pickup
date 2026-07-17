import { collections } from '../database/collections'
import { utcDayKey } from './utc-day-key'

export async function recordEloPageRender() {
  await collections.telemetryStats.updateOne(
    { day: utcDayKey(new Date()) },
    { $inc: { eloPageRenders: 1 } },
    { upsert: true },
  )
}
