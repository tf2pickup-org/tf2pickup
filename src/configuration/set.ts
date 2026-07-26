import { isEqual } from 'es-toolkit'
import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import { events } from '../events'
import { get } from './get'
import { activityLog } from '../activity-log'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function set<T extends keyof Configuration>(
  key: T,
  value: Configuration[T],
  actor: SteamId64 | 'bot',
): Promise<void> {
  configurationSchema.parse({ key, value })
  const oldValue = await get(key)
  await collections.configuration.updateOne({ key }, { $set: { value } }, { upsert: true })

  if (!isEqual(oldValue, value)) {
    await activityLog.record({ type: 'configuration change', key, actor })
  }

  events.emit('configuration:updated', { key })
}
