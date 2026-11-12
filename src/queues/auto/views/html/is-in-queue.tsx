import { collections } from '../../../../database/collections'
import type { QueueId } from '../../../../database/models/queue.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'

export async function IsInQueue(props: { queue: QueueId; actor?: SteamId64 | undefined }) {
  const queues = props.actor
    ? await collections.queueSlots.distinct('queue', { 'player.steamId': props.actor })
    : []
  const isInCurrentQueue = queues.some(queue => queue.equals(props.queue))
  return (
    <>
      <input type="hidden" id="isInCurrentQueue" value={isInCurrentQueue.toString()} />
      <input type="hidden" id="isInAnyQueue" value={(queues.length > 0).toString()} />
    </>
  )
}
