import { collections } from '../../../database/collections'
import type { QueueId } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { logger } from '../../../logger'
import type { Emit } from '../../queue-command'
import type { ReadyPhase } from '../types/ready-phase'

// Entering any state but ready drops captainReady and last.
// Upserts, so reset() can create the state of a queue that was just enabled.
export async function writeState(
  queue: QueueId,
  emit: Emit,
  ...[state, captainReady]: [QueueState.ready, ReadyPhase] | [Exclude<QueueState, QueueState.ready>]
) {
  logger.info({ queue, state }, 'captain queue state changed')
  await collections.queueState.updateOne(
    { queue },
    captainReady
      ? { $set: { state, captainReady } }
      : { $set: { state }, $unset: { captainReady: 1, last: 1 } },
    { upsert: true },
  )
  emit('queue/state:updated', { queue, state })
}
