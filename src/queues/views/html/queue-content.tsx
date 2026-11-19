import type { QueueModel } from '../../../database/models/queue.model'
import { CaptainQueueContent } from '../../captain/views/html/captain-queue-content'
import { AutoQueueContent } from '../../auto/views/html/auto-queue-content'

// The part of the queue page that belongs to one queue; the rest (chat, online players…) is
// shared by all of them and stays in place when switching queues. Its children are laid out by the
// page's grid.
export async function QueueContent(props: { queue: QueueModel }) {
  return props.queue.launchMode === 'captain' ? (
    <CaptainQueueContent queue={props.queue} />
  ) : (
    <AutoQueueContent queue={props.queue} />
  )
}
