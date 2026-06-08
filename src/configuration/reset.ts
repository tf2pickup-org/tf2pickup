import { isEqual } from 'es-toolkit'
import { collections } from '../database/collections'
import type { Configuration } from '../database/models/configuration-entry.model'
import { events } from '../events'
import { get } from './get'
import { activityLog } from '../activity-log'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function reset<T extends keyof Configuration>(
  key: T,
  actor: SteamId64,
): Promise<Configuration[T]> {
  const oldValue = await get(key)
  await collections.configuration.deleteOne({ key })
  const newValue = await get(key)

  if (!isEqual(oldValue, newValue)) {
    await activityLog.record({ type: 'configuration change', key, actor })
  }

  events.emit('configuration:updated', { key })
  return newValue
}
