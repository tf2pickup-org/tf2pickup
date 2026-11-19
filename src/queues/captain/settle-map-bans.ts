import { collections } from '../../database/collections'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { tasks } from '../../tasks'
import type { Emit } from '../queue-command'
import { banTurn } from './ban-turn'
import { buildLaunchSnapshot } from './build-launch-snapshot'
import { getPool } from './get-pool'
import { scheduleTurnTimeout } from './schedule-turn-timeout'

export async function settleMapBans(
  queue: QueueModel,
  draft: CaptainDraftModel,
  emit: Emit,
  members?: readonly CaptainPoolModel[],
) {
  const turn = banTurn(draft)
  draft.turn = turn.index
  draft.turnStartedAt = new Date()
  draft.turnDeadline = new Date(draft.turnStartedAt.getTime() + queue.pickTimeout)
  await collections.captainDrafts.updateOne(
    { queue: queue._id, token: draft.token },
    {
      $set: {
        mapOptions: draft.mapOptions,
        bans: draft.bans,
        turn: draft.turn,
        turnStartedAt: draft.turnStartedAt,
        turnDeadline: draft.turnDeadline,
      },
    },
  )
  await tasks.cancel('queue/captain:turnTimeout', { queue: queue._id })
  if (turn.remaining.length === 1) {
    const snapshot = buildLaunchSnapshot(queue, draft, members ?? (await getPool(queue._id)))
    await collections.queueState.updateOne(
      { queue: queue._id },
      { $set: { state: QueueState.launching } },
    )
    emit('queue/state:updated', { queue: queue._id, state: QueueState.launching })
    emit('queue/captain:launching', snapshot)
  } else {
    if (draft.bans.length === 0) {
      await collections.queueState.updateOne(
        { queue: queue._id },
        { $set: { state: QueueState.banningMaps } },
      )
      emit('queue/state:updated', { queue: queue._id, state: QueueState.banningMaps })
    }
    await scheduleTurnTimeout(queue, draft, 'ban')
    emit('queue/captainDraft:turn', {
      queue: queue._id,
      captain: draft[turn.team],
      picks: [],
      deadline: draft.turnDeadline,
      phase: 'ban',
    })
  }
  emit('queue/captainDraft:updated', { queue: queue._id })
}
