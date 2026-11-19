import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { assertCaptainQueue } from './assert-captain-queue'
import { captainRoles } from './captain-roles'
import { currentTurn } from './current-turn'
import { getDraftPosition } from './get-draft-position'
import { getPool } from './get-pool'
import { isDraftCompletable } from './is-draft-completable'
import { applyPick } from './apply-pick'
import { settleDraft } from './settle-draft'

// The captain on the clock picks a player for a role; everything is re-checked under the lock.
export async function pick(queue: QueueId, actor: SteamId64, player: SteamId64, role: string) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-pick', async emit => {
    if ((await getState(queue)) !== QueueState.drafting) {
      throw withLogLevel(errors.badRequest('no draft is picking right now'), 'debug')
    }

    const draft = await collections.captainDrafts.findOne({ queue })
    if (!draft) {
      throw errors.internalServerError('captain draft unavailable')
    }

    const roles = captainRoles(settings.gamemode)
    const turn = currentTurn(roles.length, draft.picks.length)
    if (!turn || draft[turn.team] !== actor) {
      throw withLogLevel(errors.forbidden('it is not your turn'), 'debug')
    }

    const members = await getPool(queue)
    const position = getDraftPosition(roles, draft, members)
    const candidate = { team: turn.team, player, role }
    if (!isDraftCompletable({ ...position, picks: [...position.picks, candidate] })) {
      throw withLogLevel(errors.badRequest('that pick is not possible'), 'debug')
    }

    applyPick(draft, candidate, 'chosen')
    await settleDraft(settings, draft, members, emit)
  })
}
