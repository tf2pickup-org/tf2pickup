import type { QueueModel } from '../../database/models/queue.model'
import { captainRoles } from './captain-roles'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'
import type { PoolView } from './types/pool-view'
import { getState } from '../get-state'

export async function getPoolView(queue: Pick<QueueModel, '_id' | 'gamemode'>): Promise<PoolView> {
  const [state, all] = await Promise.all([getState(queue._id), getPool(queue._id)])
  const pool = all.filter(member => !member.locked)
  return { state, members: all, pool, readiness: poolReadiness(captainRoles(queue.gamemode), pool) }
}
