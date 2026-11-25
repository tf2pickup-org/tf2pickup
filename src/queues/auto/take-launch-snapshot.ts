import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { get } from '../get'
import type { LaunchSnapshot } from '../types/launch-snapshot'
import { getFriends } from './get-friends'
import { getMapWinner } from './get-map-winner'
import { getSlots } from './get-slots'

// must run inside queueCommand()
export async function takeLaunchSnapshot(
  queue: QueueId,
): Promise<Extract<LaunchSnapshot, { friends: unknown }>> {
  const [settings, state, slots, map, friends] = await Promise.all([
    get(queue),
    collections.queueState.findOne({ queue }),
    getSlots(queue),
    getMapWinner(queue),
    getFriends(queue),
  ])
  if (!state?.launchToken) throw errors.internalServerError('invalid queue state: no launch token')
  return { queue: settings, token: state.launchToken, slots, map, friends }
}
