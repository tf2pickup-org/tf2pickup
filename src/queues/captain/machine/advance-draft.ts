import { collections } from '../../../database/collections'
import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { logger } from '../../../logger'
import type { Emit } from '../../queue-command'
import { banTurn } from '../ban-turn'
import { buildLaunchSnapshot } from '../build-launch-snapshot'
import { captainRoles } from '../captain-roles'
import { currentTurn } from '../current-turn'
import { getPool } from '../get-pool'
import { captainDraftMetrics } from '../metrics'
import { planDraft } from './plan-draft'
import { toWaiting } from './to-waiting'
import { turnTimer } from './turn-timer'
import { writeState } from './write-state'

// Takes a draft that just had a pick or a ban applied in memory on to its next turn or phase.
export async function advanceDraft(
  queue: QueueModel,
  draft: CaptainDraftModel,
  emit: Emit,
  members?: readonly CaptainPoolModel[],
) {
  const pool = members ?? (await getPool(queue._id))
  const plan = planDraft(queue, draft, pool)
  if (plan.phase === 'noMaps') {
    logger.error({ queue: queue._id }, 'captain draft has no maps available')
    captainDraftMetrics.aborted.add(1, { reason: 'launch_failed' })
    await toWaiting(queue, emit, { draft, failed: true })
    emit('queue/captainDraft:failed', { queue: queue._id, message: 'No maps available' })
    return
  }

  await collections.captainDrafts.updateOne(
    { queue: queue._id, token: draft.token },
    {
      $set: {
        picks: draft.picks,
        mapOptions: draft.mapOptions,
        bans: draft.bans,
        turn: draft.turn,
        turnStartedAt: draft.turnStartedAt,
        turnDeadline: draft.turnDeadline,
      },
    },
  )
  await turnTimer.stop(queue._id)
  switch (plan.phase) {
    case 'pick': {
      await turnTimer.start(queue._id, draft, 'pick')
      const turn = currentTurn(captainRoles(queue.gamemode).length, draft.picks.length)!
      if (plan.turnChanged) {
        emit('queue/captainDraft:turn', {
          queue: queue._id,
          captain: draft[turn.team],
          picks: turn.remaining,
          deadline: draft.turnDeadline,
        })
      }
      break
    }

    case 'ban': {
      if (plan.first) {
        await writeState(queue._id, emit, QueueState.banningMaps)
      }
      await turnTimer.start(queue._id, draft, 'ban')
      emit('queue/captainDraft:turn', {
        queue: queue._id,
        captain: draft[banTurn(draft).team],
        picks: [],
        deadline: draft.turnDeadline,
        phase: 'ban',
      })
      break
    }

    case 'launch':
      await writeState(queue._id, emit, QueueState.launching)
      emit('queue/captain:launching', buildLaunchSnapshot(queue, draft, pool))
      break
  }
  emit('queue/captainDraft:updated', { queue: queue._id })
}
