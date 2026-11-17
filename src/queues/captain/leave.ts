import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { advance } from './advance'
import { assertCaptainQueue } from './assert-captain-queue'

// Used by the unchanged ready-up dialog's "No, I can't play now" action.
export async function leave(queue: QueueId, steamId: SteamId64) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-leave', async emit => {
    const state = await getState(queue)
    const member = await collections.captainPool.findOne({ queue, 'player.steamId': steamId })
    if (!member) throw errors.badRequest('player not in the captain pool')
    if (member.locked) throw errors.badRequest('you are locked into the current draft')
    await collections.captainPool.deleteOne({ queue, 'player.steamId': steamId })
    logger.info({ queue, steamId }, 'captain pool left')
    emit('queue/captainPool:left', { queue, player: steamId })
    emit('queue/captainPool:updated', { queue })
    await advance(queue, emit, { state, settings })
  })
  await preReady.cancel(steamId)
}
