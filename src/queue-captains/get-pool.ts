import { collections } from '../database/collections'
import type { CaptainsPoolEntryModel } from '../database/models/captains-pool-entry.model'

// oldest first — the pool doubles as a waiting list, and auto-picks favour whoever has waited longest
export async function getPool(): Promise<CaptainsPoolEntryModel[]> {
  return await collections.queueCaptainsPool.find().sort({ joinedAt: 1 }).toArray()
}
