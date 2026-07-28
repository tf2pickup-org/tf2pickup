import type { DraftModel } from '../../database/models/draft.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftCandidate } from '../types/draft-candidate'

/**
 * Everyone still waiting to be given a slot, captains included. Captains carry their team so the
 * matching keeps a slot on their own side free for them.
 */
export function remainingCandidates(draft: DraftModel): DraftCandidate[] {
  const picked = new Set(draft.picks.map(pick => pick.player))

  return draft.pool
    .filter(entry => !picked.has(entry.steamId))
    .map(entry => {
      const team = ([Tf2Team.blu, Tf2Team.red] as const).find(
        t => draft.captains[t] === entry.steamId,
      )
      return {
        steamId: entry.steamId,
        gameClasses: entry.gameClasses,
        ...(team && { team }),
      }
    })
}
