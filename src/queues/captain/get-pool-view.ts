import type { QueueModel } from '../../database/models/queue.model'
import { captainRoles } from './captain-roles'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'
import type { PoolView } from './types/pool-view'
import { collections } from '../../database/collections'
import { errors } from '../../errors'

export async function getPoolView(queue: Pick<QueueModel, '_id' | 'gamemode'>): Promise<PoolView> {
  const [runtime, all] = await Promise.all([
    collections.queueState.findOne({ queue: queue._id }),
    getPool(queue._id),
  ])
  if (!runtime) throw errors.internalServerError('queue state unavailable')
  const pool = all.filter(member => !member.locked)
  return {
    state: runtime.state,
    readyPhase: runtime.captainReady,
    members: all,
    pool,
    readiness: poolReadiness(captainRoles(queue.gamemode), pool),
  }
}
