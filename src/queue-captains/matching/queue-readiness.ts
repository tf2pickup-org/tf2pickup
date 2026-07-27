import type { QueueConfig } from '../../queue/types/queue-config'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { teamSlots } from '../team-slots'
import type { DraftCandidate } from '../types/draft-candidate'
import { maxAssignment } from './max-assignment'

export interface QueueReadiness {
  // slots a finished game needs — 12 for 6v6, 18 for 9v9
  required: number

  // slots the current pool can actually fill
  fillable: number

  // the classes of the slots left over, i.e. what the queue is still waiting for
  missing: Tf2ClassName[]
}

/**
 * How close the pool is to being able to field two teams.
 *
 * "At least 12 players" needs no separate check: filling 12 slots takes 12 distinct players, so
 * the headcount rule is implied by `fillable === required`.
 *
 * Captains are deliberately left unpinned here. Both teams have the same slots, so any assignment
 * that ignores teams can be rearranged into one that respects a captain's team — swap whoever
 * holds the captain's class on their side with the captain. The other captain can never be in the
 * way, since they are pinned to the opposite team. So a pool that fills every slot without pinning
 * also fills every slot with it, and readiness can ignore who ends up captaining.
 */
export function queueReadiness(pool: DraftCandidate[], config: QueueConfig): QueueReadiness {
  const slots = teamSlots(config)
  const assignment = maxAssignment(slots, pool)
  const missing = slots
    .filter((_, slot) => assignment.slots[slot] === null)
    .map(slot => slot.gameClass)

  return {
    required: slots.length,
    fillable: slots.length - missing.length,
    missing,
  }
}
