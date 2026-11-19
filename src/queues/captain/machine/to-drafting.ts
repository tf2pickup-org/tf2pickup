import { nanoid } from 'nanoid'
import { collections } from '../../../database/collections'
import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { errors } from '../../../errors'
import { logger } from '../../../logger'
import { Tf2Team } from '../../../shared/types/tf2-team'
import type { Emit } from '../../queue-command'
import { captainRoles } from '../captain-roles'
import { chooseCaptainPair } from '../choose-captain-pair'
import { captainDraftMetrics } from '../metrics'
import { advanceDraft } from './advance-draft'
import { readyTimers } from './ready-timers'
import { writeState } from './write-state'

// Locks the pool, draws the captains and their teams and starts the first turn.
export async function toDrafting(queue: QueueModel, emit: Emit, pool: readonly CaptainPoolModel[]) {
  await readyTimers.stop(queue._id)
  await collections.captainPool.updateMany({ queue: queue._id }, { $set: { locked: true } })
  await writeState(queue._id, emit, QueueState.drafting)
  emit('queue/captainPool:updated', { queue: queue._id })
  emit('queue/captainDraft:starting', { queue: queue._id })

  const locked = pool.map(member => ({ ...member, locked: true }))
  const pair = chooseCaptainPair(captainRoles(queue.gamemode), locked, Math.random)
  if (!pair) {
    throw errors.internalServerError('a full captain pool has no captain pair')
  }

  const [red, blu] = Math.random() < 0.5 ? pair : ([pair[1], pair[0]] as const)
  const now = new Date()
  const draft: CaptainDraftModel = {
    queue: queue._id,
    token: nanoid(),
    red,
    blu,
    picks: [],
    turn: 0,
    turnStartedAt: now,
    turnDeadline: new Date(now.getTime() + queue.pickTimeout),
    startedAt: now,
    mapOptions: [],
    bans: [],
  }
  await collections.captainDrafts.deleteMany({ queue: queue._id })
  await collections.captainDrafts.insertOne(draft)
  captainDraftMetrics.poolSize.record(locked.length)
  logger.info(
    { queue: queue._id, [Tf2Team.red]: red, [Tf2Team.blu]: blu, pool: locked.length },
    'captain draft started',
  )
  await advanceDraft(queue, draft, emit, locked)
}
