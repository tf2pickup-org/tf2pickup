import { nanoid } from 'nanoid'
import { collections } from '../../database/collections'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import type { Emit } from '../auto/queue-command'
import { captainRoles } from './captain-roles'
import { currentTurn } from './current-turn'
import { getDraftPosition } from './get-draft-position'
import { legalPicks } from './legal-picks'
import { draftTurnCount } from './metrics'
import type { DraftPick } from './types/draft-pick'

// Applies a pick to the draft held in memory; settleDraft() persists it.
export function applyPick(
  draft: CaptainDraftModel,
  pick: DraftPick,
  how: CaptainDraftModel['picks'][number]['how'],
) {
  draft.picks.push({ ...pick, at: new Date(), how })
  draftTurnCount.add(1, {
    phase: 'pick',
    how: how === 'timedOut' ? 'timed_out' : how,
  })
  logger.info(
    { queue: draft.queue, team: pick.team, steamId: pick.player, role: pick.role, how },
    'captain draft pick',
  )
}

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

    const legal = legalPicks(getDraftPosition(roles, draft, members))
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
    await collections.queueState.updateOne(
      { queue: queue._id },
      { $set: { state: QueueState.banningMaps } },
    )
    logger.info({ queue: queue._id }, 'captain queue state changed')
    emit('queue/state:updated', { queue: queue._id, state: QueueState.banningMaps })
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

export async function scheduleTurnTimeout(queue: QueueModel, draft: CaptainDraftModel) {
  await tasks.schedule(
    'queue/captain:turnTimeout',
    Math.max(0, draft.turnDeadline.getTime() - Date.now()),
    { queue: queue._id, token: draft.token, turn: draft.turn },
  )
}

export function newDraftToken() {
  return nanoid()
}
