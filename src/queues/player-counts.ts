import type { QueueModel } from '../database/models/queue.model'
import { playerCounts as autoPlayerCounts } from './auto/player-counts'
import { playerCounts as captainPlayerCounts } from './captain/player-counts'

// read side, so views don't import the engines
const byLaunchMode = { auto: autoPlayerCounts, captain: captainPlayerCounts }

export async function playerCounts(queue: Pick<QueueModel, '_id' | 'gamemode' | 'launchMode'>) {
  return await byLaunchMode[queue.launchMode](queue)
}
