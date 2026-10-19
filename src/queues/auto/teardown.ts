import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { tasks } from '../../tasks'
import { queueCommand } from './queue-command'

// drops a disabled queue's runtime state
export async function teardown(queue: QueueId) {
  await queueCommand('teardown', async () => {
    await tasks.cancel('queue:readyUpTimeout', { queue })
    await tasks.cancel('queue:unready', { queue })
    await Promise.all([
      collections.queueSlots.deleteMany({ queue }),
      collections.queueState.deleteMany({ queue }),
      collections.queueMapOptions.deleteMany({ queue }),
      collections.queueMapVotes.deleteMany({ queue }),
      collections.queueFriends.deleteMany({ queue }),
    ])
  })
}
