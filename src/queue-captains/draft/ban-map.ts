import { collections } from '../../database/collections'
import { DraftState, type DraftModel } from '../../database/models/draft.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { withQueueLock } from '../../queue/with-queue-lock'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { banOrder } from './ban-order'
import { getCurrent } from './get-current'
import { remainingMaps } from './remaining-maps'
import { resolveTurns } from './resolve-turns'

export async function banMap(actor: SteamId64, map: string): Promise<DraftModel> {
  return await withQueueLock('captains:ban-map', async () => {
    logger.trace({ actor, map }, 'queueCaptains.banMap()')

    const draft = await getCurrent()
    if (draft?.state !== DraftState.banningMaps) {
      throw withLogLevel(errors.badRequest('not banning maps right now'), 'debug')
    }

    const team = banOrder(draft.mapOptions)[draft.mapBans.length]
    if (team === undefined) {
      throw withLogLevel(errors.badRequest('there is nothing left to ban'), 'debug')
    }

    if (draft.captains[team] !== actor) {
      throw withLogLevel(errors.forbidden('it is not your ban'), 'debug')
    }

    if (!remainingMaps(draft).includes(map)) {
      throw withLogLevel(errors.badRequest('that map is not on the table'), 'debug')
    }

    const withBan = await collections.queueCaptainsDrafts.findOneAndUpdate(
      // the ban count guards against two bans racing into the same turn
      { id: draft.id, [`mapBans.${draft.mapBans.length}`]: { $exists: false } },
      { $push: { mapBans: { team, map, at: new Date() } } },
      { returnDocument: 'after' },
    )
    if (!withBan) {
      throw withLogLevel(errors.conflict('that ban has already been made'), 'debug')
    }

    return await resolveTurns(withBan)
  })
}
