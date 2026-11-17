import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import type { Emit } from '../auto/queue-command'
import { getState } from '../get-state'
import { advance } from './advance'

// Takes the player out of every captain pool but the given queue's, as joining another queue
// does. A player locked into a draft, or readied up, can't leave. Must run inside queueCommand().
export async function leavePools(steamId: SteamId64, emit: Emit, except?: QueueId) {
  const entries = await collections.captainPool
    .find({ 'player.steamId': steamId, ...(except ? { queue: { $ne: except } } : {}) })
    .toArray()
  for (const { queue, locked, ready } of entries) {
    if (locked || (ready && (await getState(queue)) === QueueState.ready)) {
      throw withLogLevel(errors.badRequest('you are locked into another queue'), 'debug')
    }
  }

  for (const { queue } of entries) {
    await collections.captainPool.deleteOne({ queue, 'player.steamId': steamId })
    emit('queue/captainPool:updated', { queue })
    emit('queue/captainPool:left', { queue, player: steamId })
    await advance(queue, emit)
  }
}
