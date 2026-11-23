import type { QueueModel } from '../database/models/queue.model'

export function queueLabel(
  queue: Pick<QueueModel, 'name' | 'launchMode'> & { requireVerification?: boolean | undefined },
) {
  return [queue.requireVerification && '🔒', queue.launchMode === 'captain' && '👑', queue.name]
    .filter(Boolean)
    .join(' ')
}
