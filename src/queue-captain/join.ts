import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { isEligibleCaptain } from './is-eligible-captain'

export async function join(
  steamId: SteamId64,
  offeredClasses: Tf2ClassName[],
  wantsCaptain: boolean,
): Promise<QueuePlayerModel> {
  return await withQueueLock('captain.join', async () => {
    logger.trace({ steamId, offeredClasses, wantsCaptain }, 'queue-captain.join()')

    if (offeredClasses.length === 0) {
      throw errors.badRequest('must offer at least one class')
    }

    const player = await players.bySteamId(steamId, [
      'hasAcceptedRules',
      'activeGame',
      'steamId',
      'name',
      'avatar.medium',
      'verified',
      'stats',
    ])

    if (!player.hasAcceptedRules) {
      throw errors.badRequest('player has not accepted rules')
    }

    if (player.activeGame) {
      throw errors.badRequest('player has active game')
    }

    const state = await getState()
    if (![QueueState.waiting, QueueState.ready].includes(state)) {
      throw errors.badRequest('invalid queue state')
    }

    if (wantsCaptain && !(await isEligibleCaptain(player))) {
      throw errors.badRequest('player is not eligible to be captain')
    }

    const existing = await collections.queuePlayers.findOne({ steamId })

    let result: QueuePlayerModel
    if (existing) {
      result = (await collections.queuePlayers.findOneAndUpdate(
        { steamId },
        { $set: { offeredClasses, wantsCaptain } },
        { returnDocument: 'after' },
      ))!
    } else {
      result = {
        steamId,
        offeredClasses,
        wantsCaptain,
        joinedAt: new Date(),
        ready: state === QueueState.ready,
      }
      await collections.queuePlayers.insertOne(result)
    }

    const allPlayers = await collections.queuePlayers.find({}).toArray()
    events.emit('queue/players:updated', { players: allPlayers })
    return result
  })
}
