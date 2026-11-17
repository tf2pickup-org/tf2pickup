import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import { gamemodeConfigs } from '../gamemodes/configs'

export async function playerCounts(queue: Pick<QueueModel, '_id' | 'gamemode' | 'launchMode'>) {
  if (queue.launchMode === 'captain') {
    // ponytail: the captain pool is not built yet, so nobody is signed up
    const roles = gamemodeConfigs[queue.gamemode].captainRoles ?? []
    return { current: 0, required: roles.length * 2 }
  }

  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: queue._id, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: queue._id }),
  ])
  return { current, required }
}
