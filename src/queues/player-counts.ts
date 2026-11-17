import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import { gamemodeConfigs } from '../gamemodes/configs'

export async function playerCounts(queue: Pick<QueueModel, '_id' | 'gamemode' | 'launchMode'>) {
  if (queue.launchMode === 'captain') {
    // the pool members who are not in the running draft: the next game's players
    const roles = gamemodeConfigs[queue.gamemode].captainRoles ?? []
    return {
      current: await collections.captainPool.countDocuments({ queue: queue._id, locked: false }),
      required: roles.length * 2,
    }
  }

  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: queue._id, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: queue._id }),
  ])
  return { current, required }
}
