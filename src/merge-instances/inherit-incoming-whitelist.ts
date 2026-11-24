import type { QueueModel } from '../database/models/queue.model'

// The incoming instance's global whitelist was in effect for its queues without a whitelist of their
// own. Unless the primary's global whitelist is the same, those queues keep it as their own.
export function inheritIncomingWhitelist<T extends Pick<QueueModel, 'whitelistId'>>(
  queues: T[],
  incomingGlobal: string | null,
  primaryGlobal: string | null,
): T[] {
  if (!incomingGlobal || incomingGlobal === primaryGlobal) {
    return queues
  }
  return queues.map(queue =>
    queue.whitelistId ? queue : { ...queue, whitelistId: incomingGlobal },
  )
}
