import { isEqual } from 'es-toolkit'
import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import {
  queueConfigurationSchema,
  type QueueConfiguration,
  type QueueId,
  type QueueModel,
} from '../database/models/queue.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { get } from './get'

/**
 * @throws {ZodError}
 */
export async function update(
  id: QueueId,
  changes: Partial<QueueConfiguration>,
  actor: SteamId64 | 'bot',
): Promise<QueueModel> {
  // validate only the given settings; a partial schema would fill the others with defaults
  const mask = Object.fromEntries(Object.keys(changes).map(key => [key, true])) as Partial<
    Record<keyof QueueConfiguration, true>
  >
  const parsed = queueConfigurationSchema.pick(mask).parse(changes) as Partial<QueueConfiguration>
  const before = await get(id)
  await collections.queues.updateOne({ _id: id }, { $set: parsed })

  for (const [key, value] of Object.entries(parsed)) {
    if (!isEqual(before[key as keyof QueueConfiguration], value)) {
      await activityLog.record({
        type: 'configuration change',
        key: `queues.${before.slug}.${key}`,
        actor,
      })
    }
  }

  events.emit('queue:updated', { queue: id })
  return await get(id)
}
