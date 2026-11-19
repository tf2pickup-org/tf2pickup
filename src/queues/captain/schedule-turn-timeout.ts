import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { QueueModel } from '../../database/models/queue.model'
import { tasks } from '../../tasks'

export async function scheduleTurnTimeout(
  queue: QueueModel,
  draft: CaptainDraftModel,
  phase: 'pick' | 'ban' = 'pick',
) {
  await tasks.schedule(
    'queue/captain:turnTimeout',
    Math.max(0, draft.turnDeadline.getTime() - Date.now()),
    {
      queue: queue._id,
      token: draft.token,
      turn: draft.turn,
      ...(phase === 'ban' ? { phase } : {}),
    },
  )
}
