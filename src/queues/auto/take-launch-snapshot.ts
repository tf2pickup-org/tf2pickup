import type { QueueId } from '../../database/models/queue.model'
import { get } from '../get'
import type { LaunchSnapshot } from '../types/launch-snapshot'
import { getFriends } from './get-friends'
import { getMapWinner } from './get-map-winner'
import { getSlots } from './get-slots'

// must run inside queueCommand()
export async function takeLaunchSnapshot(queue: QueueId): Promise<LaunchSnapshot> {
  const [settings, slots, map, friends] = await Promise.all([
    get(queue),
    getSlots(queue),
    getMapWinner(queue),
    getFriends(queue),
  ])
  return { queue: settings, slots, map, friends }
}
