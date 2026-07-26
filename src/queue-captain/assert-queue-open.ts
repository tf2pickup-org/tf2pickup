import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'

/**
 * Queue membership may only change while the roster is not yet frozen. Once the
 * draft starts, picked players are referenced by the draft document, so letting
 * them walk out produces a game slot for somebody who is no longer queued.
 *
 * Involuntary removal (kick) deliberately does not go through this - see
 * update-queue-state's draft integrity check, which abandons the draft instead.
 */
export function assertQueueOpen(state: QueueState): void {
  if (![QueueState.waiting, QueueState.ready].includes(state)) {
    throw errors.badRequest('invalid queue state')
  }
}
