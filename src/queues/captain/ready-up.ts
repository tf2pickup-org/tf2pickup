import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { assertCaptainQueue } from './assert-captain-queue'

export async function readyUp(queue: QueueId, steamId: SteamId64) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-ready-up', async emit => {
    const state = await getState(queue)
    if (state !== QueueState.ready) throw errors.badRequest('wrong queue state')
    const member = await collections.captainPool.findOneAndUpdate(
      { queue, 'player.steamId': steamId, locked: false },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )
    if (!member) throw errors.badRequest('player not in the captain pool')
    emit('queue/captainPool:updated', { queue })
  })
  await preReady.start(steamId)
}
