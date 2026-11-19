import type { QueueModel } from '../../database/models/queue.model'
import { captainRoles } from './captain-roles'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'
import type { PoolView } from './types/pool-view'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { getDraftView } from './get-draft-view'

export async function getPoolView(queue: Pick<QueueModel, '_id' | 'gamemode'>): Promise<PoolView> {
  const [runtime, all, draft] = await Promise.all([
    collections.queueState.findOne({ queue: queue._id }),
    getPool(queue._id),
    collections.captainDrafts.findOne({ queue: queue._id }),
  ])
  if (!runtime) throw errors.internalServerError('queue state unavailable')
  const drafting =
    runtime.state === QueueState.drafting ||
    runtime.state === QueueState.banningMaps ||
    runtime.state === QueueState.launching
  const pool = all.filter(member => !member.locked)
  return {
    state: runtime.state,
    readyPhase: runtime.captainReady,
    members: all,
    pool,
    readiness: poolReadiness(captainRoles(queue.gamemode), pool),
    draft: drafting && draft ? getDraftView(queue.gamemode, runtime.state, draft, all) : undefined,
  }
}
