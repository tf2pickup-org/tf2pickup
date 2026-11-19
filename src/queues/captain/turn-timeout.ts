import { sample } from 'es-toolkit'
import { applyMapBan } from './apply-map-ban'
import { banTurn } from './ban-turn'
import { settleMapBans } from './settle-map-bans'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'
import { captainRoles } from './captain-roles'
import { currentTurn } from './current-turn'
import { getDraftPosition } from './get-draft-position'
import { getPool } from './get-pool'
import { applyPick } from './apply-pick'
import { settleDraft } from './settle-draft'
import { timeoutPick } from './timeout-pick'

// The captain ran out of time: the rest of the turn is picked for them, longest-waiting first.
export async function turnTimeout(
  queue: QueueId,
  token: string,
  turnIndex: number,
  phase: 'pick' | 'ban' = 'pick',
) {
  await queueCommand('captain-turn-timeout', async emit => {
    const [settings, state, draft] = await Promise.all([
      get(queue),
      collections.queueState.findOne({ queue }),
      collections.captainDrafts.findOne({ queue }),
    ])
    // a timer that was already claimed when its turn ended must not touch the next one
    if (
      settings.launchMode !== 'captain' ||
      state?.state !== (phase === 'ban' ? QueueState.banningMaps : QueueState.drafting) ||
      draft?.token !== token ||
      draft.turn !== turnIndex
    ) {
      return
    }

    if (phase === 'ban') {
      const remaining = banTurn(draft).remaining
      if (remaining.length === 1) {
        await settleMapBans(settings, draft, emit)
        return
      }
      const map = sample(remaining)
      if (!map) return
      applyMapBan(draft, map, 'timedOut')
      await settleMapBans(settings, draft, emit)
      return
    }

    const roles = captainRoles(settings.gamemode)
    const members = await getPool(queue)
    const remaining = currentTurn(roles.length, draft.picks.length)?.remaining.length ?? 0
    for (let i = 0; i < remaining; i++) {
      const pick = timeoutPick(getDraftPosition(roles, draft, members))
      if (!pick) {
        break
      }
      applyPick(draft, pick, 'timedOut')
    }
    await settleDraft(settings, draft, members, emit)
  })
}
