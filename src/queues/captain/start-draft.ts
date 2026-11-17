import { collections } from '../../database/collections'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { Emit } from '../auto/queue-command'
import { captainRoles } from './captain-roles'
import { chooseCaptainPair } from './choose-captain-pair'
import { legalPicksCache } from './legal-picks-cache'
import { draftPoolSize } from './metrics'
import { newDraftToken, settleDraft } from './settle-draft'

// Must run inside queueCommand(), once the pool is locked: draws the captains and their teams and
// starts the first turn.
export async function startDraft(
  queue: QueueModel,
  members: readonly CaptainPoolModel[],
  emit: Emit,
) {
  const roles = captainRoles(queue.gamemode)
  const locked = members.filter(member => member.locked)
  const pair = chooseCaptainPair(roles, locked, Math.random)
  if (!pair) {
    throw errors.internalServerError('a full captain pool has no captain pair')
  }

  const [red, blu] = Math.random() < 0.5 ? pair : ([pair[1], pair[0]] as const)
  const now = new Date()
  const draft: CaptainDraftModel = {
    queue: queue._id,
    token: newDraftToken(),
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
  legalPicksCache.delete(queue._id.toHexString())
  await collections.captainDrafts.deleteMany({ queue: queue._id })
  await collections.captainDrafts.insertOne(draft)
  draftPoolSize.record(locked.length)
  logger.info(
    { queue: queue._id, [Tf2Team.red]: red, [Tf2Team.blu]: blu, pool: locked.length },
    'captain draft started',
  )
  await settleDraft(queue, draft, members, emit)
}
