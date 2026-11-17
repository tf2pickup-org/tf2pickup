import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import type { Emit } from '../auto/queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { captainRoles } from './captain-roles'
import { decideCaptain } from './decide-captain'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'

// must run inside queueCommand(); re-evaluates the pool after it changed
export async function advance(queue: QueueId, emit: Emit) {
  const [state, { gamemode }, pool] = await Promise.all([
    getState(queue),
    get(queue),
    getPool(queue),
  ])
  const { full } = poolReadiness(captainRoles(gamemode), pool)
  const next = decideCaptain(state, { full })
  if (next === null) {
    return
  }

  logger.info({ queue, state: next }, 'queue state changed')
  await collections.queueState.updateOne({ queue }, { $set: { state: next } })
  if (next === QueueState.waiting) {
    await collections.captainPool.updateMany({ queue }, { $set: { ready: false } })
  }
  emit('queue/state:updated', { queue, state: next })
}
