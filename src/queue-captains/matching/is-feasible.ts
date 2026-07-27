import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'
import { maxAssignment } from './max-assignment'

/**
 * Can the draft still be completed from here?
 *
 * Two things have to hold: every slot gets filled, and every captain gets a slot. Spare players
 * sitting the game out is fine and expected — the pool is allowed to be bigger than the game — but
 * a captain being squeezed out is not a valid finish.
 */
export function isFeasible(slots: TeamSlot[], candidates: DraftCandidate[]): boolean {
  const assignment = maxAssignment(slots, candidates)

  return (
    assignment.slots.every(candidate => candidate !== null) &&
    candidates.every(
      (candidate, index) => candidate.team === undefined || assignment.candidates[index] !== null,
    )
  )
}
