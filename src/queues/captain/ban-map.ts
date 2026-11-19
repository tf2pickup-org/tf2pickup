import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { applyMapBan } from './apply-map-ban'
import { assertCaptainQueue } from './assert-captain-queue'
import { banTurn } from './ban-turn'
import { settleMapBans } from './settle-map-bans'

export async function banMap(queue: QueueId, actor: SteamId64, map: string) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-ban-map', async emit => {
    if ((await getState(queue)) !== QueueState.banningMaps)
      throw errors.badRequest('no map ban is running')
    const draft = await collections.captainDrafts.findOne({ queue })
    if (!draft) throw errors.internalServerError('captain draft unavailable')
    const turn = banTurn(draft)
    if (turn.remaining.length <= 1) throw errors.badRequest('map bans are complete')
    if (draft[turn.team] !== actor) throw errors.forbidden('it is not your ban')
    if (!turn.remaining.includes(map)) throw errors.badRequest('that map cannot be banned')
    applyMapBan(draft, map, 'chosen')
    await settleMapBans(settings, draft, emit)
  })
}
