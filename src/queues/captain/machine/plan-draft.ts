import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../database/models/queue.model'
import { logger } from '../../../logger'
import { applyPick } from '../apply-pick'
import { banTurn } from '../ban-turn'
import { captainRoles } from '../captain-roles'
import { currentTurn } from '../current-turn'
import { getDraftPosition } from '../get-draft-position'
import { mapOptions } from '../map-options'
import { cachedLegalPicks } from './cached-legal-picks'

export type DraftPlan =
  | { phase: 'pick'; turnChanged: boolean }
  | { phase: 'ban'; first: boolean }
  | { phase: 'launch' }
  | { phase: 'noMaps' }

// Decides where a draft goes after a pick or a ban was applied to it in memory, and brings the
// draft there: commits the picks that have a single option, starts the clock of a new turn and
// draws the map options once the last pick is made. Touches nothing but the draft.
export function planDraft(
  queue: Pick<QueueModel, 'gamemode' | 'pickTimeout' | 'maps'>,
  draft: CaptainDraftModel,
  members: readonly CaptainPoolModel[],
  now = new Date(),
): DraftPlan {
  const roles = captainRoles(queue.gamemode)
  let turnChanged = false
  for (;;) {
    const turn = currentTurn(roles.length, draft.picks.length)
    if (!turn) {
      break
    }

    if (turn.index !== draft.turn || draft.picks.length === 0) {
      startTurn(queue, draft, turn.index, now)
      turnChanged = true
    }

    const legal = cachedLegalPicks(draft, getDraftPosition(roles, draft, members))
    if (legal.length !== 1) {
      if (legal.length === 0) {
        logger.error({ queue: draft.queue }, 'captain draft has no legal pick')
      }
      return { phase: 'pick', turnChanged }
    }
    applyPick(draft, legal[0]!, 'forced')
  }

  if (!draft.mapOptions.length) {
    draft.mapOptions = mapOptions(queue.maps)
    draft.bans = []
    if (!draft.mapOptions.length) {
      return { phase: 'noMaps' }
    }
  }

  const turn = banTurn(draft)
  startTurn(queue, draft, turn.index, now)
  return turn.remaining.length === 1
    ? { phase: 'launch' }
    : { phase: 'ban', first: draft.bans.length === 0 }
}

function startTurn(
  queue: Pick<QueueModel, 'pickTimeout'>,
  draft: CaptainDraftModel,
  turn: number,
  now: Date,
) {
  draft.turn = turn
  draft.turnStartedAt = now
  draft.turnDeadline = new Date(now.getTime() + queue.pickTimeout)
}
