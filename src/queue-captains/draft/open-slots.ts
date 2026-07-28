import type { DraftModel } from '../../database/models/draft.model'
import type { QueueConfig } from '../../queue/types/queue-config'
import { teamSlots } from '../team-slots'
import type { TeamSlot } from '../types/team-slot'

// Slots nobody has been picked for yet, derived from the picks rather than stored, so the draft
// document can never disagree with itself.
export function openSlots(draft: DraftModel, config: QueueConfig): TeamSlot[] {
  const remaining = teamSlots(config)

  for (const pick of draft.picks) {
    const index = remaining.findIndex(
      slot => slot.team === pick.team && slot.gameClass === pick.gameClass,
    )
    if (index >= 0) {
      remaining.splice(index, 1)
    }
  }

  return remaining
}
