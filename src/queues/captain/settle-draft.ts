import { collections } from '../../database/collections'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import type { Emit } from '../queue-command'
import { captainRoles } from './captain-roles'
import { currentTurn } from './current-turn'
import { getDraftPosition } from './get-draft-position'
import { cachedLegalPicks } from './cached-legal-picks'
import { applyPick } from './apply-pick'
import { beginMapBans } from './begin-map-bans'
import { scheduleTurnTimeout } from './schedule-turn-timeout'

// Must run inside queueCommand(). Starts the clock of a new turn, commits the picks that have a
// single option, and moves on to the map bans after the last pick; then persists the draft.
export async function settleDraft(
  queue: QueueModel,
  draft: CaptainDraftModel,
  members: readonly CaptainPoolModel[],
  emit: Emit,
) {
  const roles = captainRoles(queue.gamemode)
  const totalPicks = 2 * (roles.length - 1)
  let turnChanged = false

  for (;;) {
    const turn = currentTurn(roles.length, draft.picks.length)
    if (!turn) {
      break
    }

    if (turn.index !== draft.turn || draft.picks.length === 0) {
      draft.turn = turn.index
      draft.turnStartedAt = new Date()
      draft.turnDeadline = new Date(draft.turnStartedAt.getTime() + queue.pickTimeout)
      turnChanged = true
    }

    const legal = cachedLegalPicks(draft, getDraftPosition(roles, draft, members))
    if (legal.length !== 1) {
      if (legal.length === 0) {
        logger.error({ queue: queue._id }, 'captain draft has no legal pick')
      }
      break
    }
    applyPick(draft, legal[0]!, 'forced')
  }

  const finished = draft.picks.length >= totalPicks
  await collections.captainDrafts.updateOne(
    { queue: queue._id },
    {
      $set: {
        picks: draft.picks,
        turn: draft.turn,
        turnStartedAt: draft.turnStartedAt,
        turnDeadline: draft.turnDeadline,
      },
    },
  )

  await tasks.cancel('queue/captain:turnTimeout', { queue: queue._id })
  if (finished) {
    await beginMapBans(queue, draft, members, emit)
  } else {
    await scheduleTurnTimeout(queue, draft)
    const turn = currentTurn(roles.length, draft.picks.length)!
    if (turnChanged) {
      emit('queue/captainDraft:turn', {
        queue: queue._id,
        captain: draft[turn.team],
        picks: turn.remaining,
        deadline: draft.turnDeadline,
      })
    }
  }
  emit('queue/captainDraft:updated', { queue: queue._id })
}
