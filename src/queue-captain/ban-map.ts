import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { DraftModel } from '../database/models/draft.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2Team } from '../shared/types/tf2-team'
import { environment } from '../environment'
import { queueConfigs } from '../queue-auto/configs'
import { getPickOrder } from './get-pick-order'

export async function banMap(captainSteamId: SteamId64, map: string): Promise<DraftModel> {
  return await withQueueLock('captain.banMap', async () => {
    logger.trace({ captainSteamId, map }, 'queue-captain.banMap()')

    const state = await getState()
    if (state !== QueueState.draft) {
      throw errors.badRequest('invalid queue state')
    }

    const draft = await collections.captainDraft.findOne({})
    if (!draft) {
      throw errors.internalServerError('no active draft')
    }

    const config = queueConfigs[environment.QUEUE_CONFIG]
    const pickOrder = getPickOrder(config)
    if (draft.picks.length < pickOrder.length) {
      throw errors.badRequest('picking phase not complete')
    }

    if (draft.selectedMap) {
      throw errors.badRequest('map banning already complete')
    }

    if (draft.mapBans.length >= 2) {
      throw errors.badRequest('all bans already used')
    }

    const banTeam = draft.mapBans.length === 0 ? Tf2Team.blu : Tf2Team.red
    if (draft.captains[banTeam] !== captainSteamId) {
      throw errors.forbidden('not your turn to ban')
    }

    if (!draft.mapOptions.includes(map)) {
      throw errors.badRequest('map not in the pool')
    }

    if (draft.mapBans.some(b => b.map === map)) {
      throw errors.badRequest('map already banned')
    }

    const updatedBans = [...draft.mapBans, { captain: captainSteamId, team: banTeam, map }]
    const remaining = draft.mapOptions.filter(m => !updatedBans.some(b => b.map === m))

    const isLastBan = updatedBans.length === 2
    const selectedMap = isLastBan ? remaining[0]! : undefined

    const timeout = await configuration.get('queue.captain_pick_timeout')
    const updated = (await collections.captainDraft.findOneAndUpdate(
      {},
      {
        $set: {
          mapBans: updatedBans,
          currentTurn: isLastBan
            ? draft.currentTurn
            : banTeam === Tf2Team.blu
              ? Tf2Team.red
              : Tf2Team.blu,
          ...(selectedMap ? { selectedMap } : {}),
          expiresAt: new Date(Date.now() + timeout),
        },
      },
      { returnDocument: 'after' },
    ))!

    events.emit('queue/draft:mapBanMade', {
      captain: captainSteamId,
      map,
      remaining,
    })

    if (selectedMap) {
      events.emit('queue/draft:completed', { selectedMap })
    }

    return updated
  })
}
