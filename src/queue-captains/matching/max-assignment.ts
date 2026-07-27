import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'

export interface Assignment {
  // slot index -> candidate filling it, or null when the slot could not be filled
  slots: (number | null)[]

  // candidate index -> slot they were given, or null when they sit this game out
  candidates: (number | null)[]
}

/**
 * Maximum bipartite matching (Kuhn's algorithm) between team slots and the players who could fill
 * them.
 *
 * Captains are matched first, because unlike everyone else they cannot sit the game out — the
 * pool is allowed to be bigger than the game, but a captain is always in it. Augmenting paths only
 * ever reroute a matched vertex, never unmatch one, so filling the remaining slots afterwards can
 * move a captain to a different slot but can never drop them.
 *
 * At most 18 slots and a couple dozen candidates, so the O(V*E) walk is far cheaper than the
 * database round-trip that feeds it.
 */
export function maxAssignment(slots: TeamSlot[], candidates: DraftCandidate[]): Assignment {
  const slotToCandidate: (number | null)[] = slots.map(() => null)
  const candidateToSlot: (number | null)[] = candidates.map(() => null)

  candidates.forEach((candidate, index) => {
    if (candidate.team !== undefined) {
      claimSlot(index, new Set<number>())
    }
  })

  for (let slot = 0; slot < slots.length; ++slot) {
    if (slotToCandidate[slot] === null) {
      claimCandidate(slot, new Set<number>())
    }
  }

  return { slots: slotToCandidate, candidates: candidateToSlot }

  function claimCandidate(slot: number, visited: Set<number>): boolean {
    for (let candidate = 0; candidate < candidates.length; ++candidate) {
      if (visited.has(candidate) || !canFill(slots[slot]!, candidates[candidate]!)) {
        continue
      }

      visited.add(candidate)
      const takenBy = candidateToSlot[candidate] ?? null
      if (takenBy === null || claimCandidate(takenBy, visited)) {
        slotToCandidate[slot] = candidate
        candidateToSlot[candidate] = slot
        return true
      }
    }

    return false
  }

  function claimSlot(candidate: number, visited: Set<number>): boolean {
    for (let slot = 0; slot < slots.length; ++slot) {
      if (visited.has(slot) || !canFill(slots[slot]!, candidates[candidate]!)) {
        continue
      }

      visited.add(slot)
      const takenBy = slotToCandidate[slot] ?? null
      if (takenBy === null || claimSlot(takenBy, visited)) {
        slotToCandidate[slot] = candidate
        candidateToSlot[candidate] = slot
        return true
      }
    }

    return false
  }
}

function canFill(slot: TeamSlot, candidate: DraftCandidate): boolean {
  return (
    candidate.gameClasses.includes(slot.gameClass) &&
    (candidate.team === undefined || candidate.team === slot.team)
  )
}
