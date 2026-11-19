import { collections } from '../database/collections'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export interface Membership {
  queue: QueueId
  launchMode: QueueModel['launchMode']
  ready: boolean
}

// The queue engine keeps a player in at most one queue, whatever its launch mode.
export async function membership(steamId: SteamId64): Promise<Membership | null> {
  const [slot, member] = await Promise.all([
    collections.queueSlots.findOne({ 'player.steamId': steamId }),
    collections.captainPool.findOne({ 'player.steamId': steamId }),
  ])
  if (slot) {
    return { queue: slot.queue, launchMode: 'auto', ready: slot.ready }
  }
  if (member) {
    return { queue: member.queue, launchMode: 'captain', ready: member.ready }
  }
  return null
}
