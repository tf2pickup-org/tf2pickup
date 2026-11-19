import type { QueueModel } from '../../database/models/queue.model'
import { getState } from '../get-state'
import type { Emit } from '../queue-command'
import { captainRoles } from './captain-roles'
import { decideCaptain } from './decide-captain'
import { enterState } from './enter-state'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'

// Must run inside queueCommand(); says whether the queue moved to another state.
export async function step(queue: QueueModel, emit: Emit): Promise<boolean> {
  const [state, pool] = await Promise.all([getState(queue._id), getPool(queue._id)])
  const { full } = poolReadiness(captainRoles(queue.gamemode), pool)
  const next = decideCaptain(state, { full, allReady: pool.every(member => member.ready) })
  if (next === null) {
    return false
  }

  await enterState(queue, next, emit, pool)
  return true
}
