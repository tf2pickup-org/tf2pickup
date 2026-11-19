import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import { gamemodeConfigs } from '../../gamemodes/configs'

// the pool members who are not in the running draft: the next game's players
export async function playerCounts(queue: Pick<QueueModel, '_id' | 'gamemode'>) {
  const roles = gamemodeConfigs[queue.gamemode].captainRoles ?? []
  return {
    current: await collections.captainPool.countDocuments({ queue: queue._id, locked: false }),
    required: roles.length * 2,
  }
}
