import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { QueueId } from '../../../database/models/queue.model'
import { tasks } from '../../../tasks'

export const turnTimer = {
  start: async (queue: QueueId, draft: CaptainDraftModel, phase: 'pick' | 'ban') => {
    await tasks.schedule(
      'queue/captain:turnTimeout',
      Math.max(0, draft.turnDeadline.getTime() - Date.now()),
      { queue, token: draft.token, turn: draft.turn, ...(phase === 'ban' ? { phase } : {}) },
    )
  },
  stop: async (queue: QueueId) => {
    await tasks.cancel('queue/captain:turnTimeout', { queue })
  },
} as const
