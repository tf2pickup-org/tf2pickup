import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'
import { isFeasible } from './is-feasible'

export interface LegalPick {
  steamId: SteamId64
  gameClass: Tf2ClassName
}

export interface LegalPicksParams {
  // slots still to be filled, across both teams
  openSlots: TeamSlot[]

  // everyone still unassigned, including both captains
  candidates: DraftCandidate[]

  // the team on the clock
  team: Tf2Team
}

/**
 * Every player-and-class a captain is allowed to take this turn.
 *
 * Checking the class alone is not enough: taking the last player who can cover some class leaves
 * the draft with no valid completion, and a captain could otherwise pick their way into a corner.
 * So each candidate pick is provisionally applied and kept only if the rest of both teams can
 * still be filled.
 *
 * Captains are never pickable — they take whatever slot their own team has left over.
 */
export function legalPicks({ openSlots, candidates, team }: LegalPicksParams): LegalPick[] {
  const picks: LegalPick[] = []

  for (const [index, candidate] of candidates.entries()) {
    if (candidate.team !== undefined) {
      continue
    }

    for (const gameClass of new Set(candidate.gameClasses)) {
      const slot = openSlots.findIndex(open => open.team === team && open.gameClass === gameClass)
      if (slot < 0) {
        continue
      }

      const remainingSlots = openSlots.filter((_, open) => open !== slot)
      const remainingCandidates = candidates.filter((_, other) => other !== index)
      if (isFeasible(remainingSlots, remainingCandidates)) {
        picks.push({ steamId: candidate.steamId, gameClass })
      }
    }
  }

  return picks
}
