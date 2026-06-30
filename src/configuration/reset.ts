import { isEqual } from 'es-toolkit'
import { collections } from '../database/collections'
import type { Configuration } from '../database/models/configuration-entry.model'
import { events } from '../events'
import { get } from './get'
import { activityLog } from '../activity-log'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Gamemode } from '../shared/types/gamemode'
import { resolveStorageKey } from './gamemode-scoped-keys'

export async function reset<T extends keyof Configuration>(
  key: T,
  actor: SteamId64,
  gamemode?: Gamemode,
): Promise<Configuration[T]> {
  const storageKey = resolveStorageKey(key, gamemode)
  const oldValue = await get(key, gamemode)
  await collections.configuration.deleteOne({ key: storageKey })
  const newValue = await get(key, gamemode)

  if (!isEqual(oldValue, newValue)) {
    await activityLog.record({ type: 'configuration change', key, actor })
  }

  events.emit('configuration:updated', { key })
  return newValue
}
