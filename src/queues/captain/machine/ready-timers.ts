import type { QueueId } from '../../../database/models/queue.model'
import { tasks } from '../../../tasks'
import type { ReadyPhase } from '../types/ready-phase'

export const readyTimers = {
  start: async (queue: QueueId, { token, readyUpDeadline, deadline }: ReadyPhase) => {
    await tasks.schedule(
      'queue/captain:readyUpTimeout',
      Math.max(0, readyUpDeadline.getTime() - Date.now()),
      { queue, token },
    )
    await tasks.schedule(
      'queue/captain:readyStateTimeout',
      Math.max(0, deadline.getTime() - Date.now()),
      { queue, token },
    )
  },
  stop: async (queue: QueueId) => {
    await tasks.cancel('queue/captain:readyUpTimeout', { queue })
    await tasks.cancel('queue/captain:readyStateTimeout', { queue })
  },
} as const
