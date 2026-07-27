import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { getState } from '../queue/get-state'

/**
 * Switching modes throws away whichever queue is currently running, so it is only allowed when
 * nobody stands to lose their place.
 */
export async function canChangeMode(): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  if ((await getState()) !== QueueState.waiting) {
    return { allowed: false, reason: 'A game is being launched right now' }
  }

  const [queued, pooled] = await Promise.all([
    collections.queueSlots.countDocuments({ player: { $ne: null } }),
    collections.queueCaptainsPool.countDocuments(),
  ])
  const total = queued + pooled
  if (total > 0) {
    return {
      allowed: false,
      reason: `${total} ${total === 1 ? 'player is' : 'players are'} queued — wait for the queue to empty`,
    }
  }

  return { allowed: true }
}
