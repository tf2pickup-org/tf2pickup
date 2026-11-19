import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { getState } from '../../get-state'
import type { Emit } from '../../queue-command'
import { captainRoles } from '../captain-roles'
import { getPool } from '../get-pool'
import { poolReadiness } from '../pool-readiness'
import { decideCaptain } from './decide-captain'
import { toDrafting } from './to-drafting'
import { toReady } from './to-ready'
import { toWaiting } from './to-waiting'

// Must run inside queueCommand(); says whether the queue moved to another state.
export async function step(queue: QueueModel, emit: Emit): Promise<boolean> {
  const [state, pool] = await Promise.all([getState(queue._id), getPool(queue._id)])
  const { full } = poolReadiness(captainRoles(queue.gamemode), pool)
  switch (decideCaptain(state, { full, allReady: pool.every(member => member.ready) })) {
    case null:
      return false
    case QueueState.waiting:
      await toWaiting(queue, emit)
      return true
    case QueueState.ready:
      await toReady(queue, emit, pool)
      return true
    case QueueState.drafting:
      await toDrafting(queue, emit, pool)
      return true
  }
}
