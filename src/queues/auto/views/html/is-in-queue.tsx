import type { QueueId } from '../../../../database/models/queue.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { membership } from '../../../membership'

export async function IsInQueue(props: { queue: QueueId; actor?: SteamId64 | undefined }) {
  const current = props.actor ? await membership(props.actor) : null
  const isInCurrentQueue = current?.queue.equals(props.queue) ?? false
  return (
    <>
      <input type="hidden" id="isInCurrentQueue" value={isInCurrentQueue.toString()} />
      <input type="hidden" id="isInAnyQueue" value={(current !== null).toString()} />
    </>
  )
}
