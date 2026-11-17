import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { captainRoles } from './captain-roles'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'
import { getState } from '../get-state'

export interface PoolView {
  state: QueueState
  // the members the page counts: everybody, but while a draft runs only the next game's sign-ups
  pool: CaptainPoolModel[]
  readiness: ReturnType<typeof poolReadiness>
}

export async function getPoolView(queue: Pick<QueueModel, '_id' | 'gamemode'>): Promise<PoolView> {
  const [state, all] = await Promise.all([getState(queue._id), getPool(queue._id)])
  const pool = all.filter(member => !member.locked)
  return { state, pool, readiness: poolReadiness(captainRoles(queue.gamemode), pool) }
}
