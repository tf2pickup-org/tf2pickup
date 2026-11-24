import { configuration } from '../configuration'
import type { QueueModel } from '../database/models/queue.model'

export async function resolveWhitelistId(
  queue: Pick<QueueModel, 'whitelistId'>,
): Promise<string | null> {
  return queue.whitelistId ?? (await configuration.get('games.whitelist_id'))
}
