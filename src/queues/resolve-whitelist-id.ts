import { configuration } from '../configuration'
import type { QueueModel } from '../database/models/queue.model'

export async function resolveWhitelistId(
  queue: Pick<QueueModel, 'whitelistId' | 'gamemode'>,
): Promise<string | null> {
  return (
    queue.whitelistId ??
    (await configuration.get('games.gamemode_whitelist_ids'))[queue.gamemode] ??
    (await configuration.get('games.whitelist_id'))
  )
}
