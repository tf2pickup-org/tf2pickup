import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import { getState } from '../get-state'
import type { Emit } from '../queue-command'
import { decide } from './decide'
import { enterState } from './enter-state'

// Must run inside queueCommand(); says whether the queue moved to another state.
export async function step({ _id: queue }: QueueModel, emit: Emit): Promise<boolean> {
  const [state, players, ready, slots] = await Promise.all([
    getState(queue),
    collections.queueSlots.countDocuments({ queue, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue, ready: { $eq: true } }),
    collections.queueSlots.countDocuments({ queue }),
  ])
  const next = decide(state, { players, ready, slots })
  if (next === null) {
    return false
  }

  await enterState(queue, next, emit)
  return true
}
