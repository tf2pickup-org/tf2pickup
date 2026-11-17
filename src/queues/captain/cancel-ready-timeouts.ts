import type { QueueId } from '../../database/models/queue.model'
import { tasks } from '../../tasks'

// Call inside queueCommand, on every ready-up exit (including teardown).
export async function cancelReadyTimeouts(queue: QueueId) {
  await tasks.cancel('queue/captain:readyUpTimeout', { queue })
  await tasks.cancel('queue/captain:readyStateTimeout', { queue })
}
